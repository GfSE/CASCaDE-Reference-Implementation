import { JsonValue } from '../../lib/helpers';
import { APackage, TPigItem as TCascaraItem, PigItemTypeValue as TCascaraItemTypeValue } from '../../schema/pig/ts/pig-metaclasses';

export interface IOptionsCypher {
    includeConstraints?: boolean;
    includePackageContains?: boolean;

    /**
     * Keep false for Neo4j visualization imports.
     * The package graph can be a very large JSON blob and is already represented by
     * generated nodes and relationships. Package context is preserved separately as
     * contextJson because it is required to resolve compact identifiers.
     */
    includeRawPackageJson?: boolean;
}

/**
 * CASCaRA/Cascara -> Neo4j Cypher export.
 *
 * Important modeling rule:
 * Every exported graph item receives the shared :CascaraItem label plus a type label
 * such as :Entity, :Property, :Link, :Enumeration, or :anEntity. Relationships
 * then match by (:CascaraItem {id}) so they connect to the detailed node instead of
 * accidentally creating placeholder duplicates.
 */
export function getCypher(item: TCascaraItem, options?: IOptionsCypher): string {
    const opts: Required<IOptionsCypher> = {
        includeConstraints: true,
        includePackageContains: true,
        includeRawPackageJson: false,
        ...options
    };

    const statements: string[] = [];
    statements.push('// CASCaRA/Cascara -> Neo4j Cypher export');
    statements.push(`// Generated ${new Date().toISOString()}`);

    if (opts.includeConstraints) {
        statements.push(...getDefaultConstraints());
    }

    if (item.itemType === 'cas:aPackage') {
        statements.push(...exportPackage(item as APackage, opts));
    } else {
        statements.push(...exportSingleItem(item, opts));
    }

    return statements.filter(s => s.trim().length > 0).join('\n\n');
}

function exportPackage(pkg: APackage, options: Required<IOptionsCypher>): string[] {
    const statements: string[] = [];
    const graphItems = Array.isArray(pkg.graph) ? pkg.graph : [];

    // Pass 1: create all real nodes first.
    statements.push(createMergeNode(itemLabels(pkg as unknown as TCascaraItem), pkg.id, itemProperties(pkg as unknown as TCascaraItem, options)));

    for (const graphItem of graphItems) {
        statements.push(createMergeNode(itemLabels(graphItem), graphItem.id, itemProperties(graphItem, options)));
    }

    // Pass 2: create embedded enum-value nodes before relationships reference them.
    for (const graphItem of graphItems) {
        statements.push(...createEnumerationValueNodes(graphItem));
    }

    // Pass 3: clear relationships previously managed by this exporter. This makes
    // repeated exports reflect removed or reordered embedded links/properties.
    statements.push(clearManagedRelations(pkg.id));
    for (const graphItem of graphItems) {
        statements.push(clearManagedRelations(graphItem.id));
    }

    // Pass 4: create relationships.
    statements.push(...graphItemRelations(pkg as unknown as TCascaraItem));
    for (let graphIndex = 0; graphIndex < graphItems.length; graphIndex++) {
        const graphItem = graphItems[graphIndex];
        if (options.includePackageContains) {
            statements.push(createRelation(pkg.id, graphItem.id, 'CONTAINS', {}, relationKey('contains', graphIndex)));
        }
        statements.push(...graphItemRelations(graphItem));
    }

    return statements;
}

function exportSingleItem(item: TCascaraItem, options: Required<IOptionsCypher>): string[] {
    return [
        createMergeNode(itemLabels(item), item.id, itemProperties(item, options)),
        ...createEnumerationValueNodes(item),
        clearManagedRelations(item.id),
        ...graphItemRelations(item)
    ];
}

function graphItemRelations(item: TCascaraItem): string[] {
    const statements: string[] = [];

    if ((item as any).specializes) {
        statements.push(createRelation(item.id, String((item as any).specializes), 'SPECIALIZES'));
    }

    statements.push(...createLinkRelations(item, 'hasSourceLink'));
    statements.push(...createLinkRelations(item, 'hasTargetLink'));

    statements.push(...createIdArrayRelations(item, 'enumeratedProperty', 'HAS_ENUMERATED_PROPERTY'));
    statements.push(...createIdArrayRelations(item, 'enumeratedSourceLink', 'HAS_ENUMERATED_SOURCE_LINK'));
    statements.push(...createIdArrayRelations(item, 'enumeratedTargetLink', 'HAS_ENUMERATED_TARGET_LINK'));
    statements.push(...createIdArrayRelations(item, 'enumeratedEndpoint', 'HAS_ENUMERATED_ENDPOINT'));
    statements.push(...createIdArrayRelations(item, 'composes', 'COMPOSES'));

    statements.push(...createEnumerationValueRelations(item));
    statements.push(...createPropertyRelations(item));

    return statements;
}

function getDefaultConstraints(): string[] {
    return [
        'CREATE CONSTRAINT package_id_unique IF NOT EXISTS FOR (n:Package) REQUIRE n.id IS UNIQUE;',
        'CREATE CONSTRAINT cascaraitem_id_unique IF NOT EXISTS FOR (n:CascaraItem) REQUIRE n.id IS UNIQUE;'
    ];
}

function createMergeNode(labels: string[], id: string, props: Record<string, JsonValue>): string {
    const safeLabels = normalizeLabels(labels);
    const propsLiteral = objectToCypherMap({ id, ...props });

    // Match only on the shared identity label. A relationship may have created a
    // CascaraItem placeholder before the detailed item is exported; matching with
    // all type labels here would try to create a second node and violate the unique
    // CascaraItem id constraint.
    return [
        `MERGE (n:CascaraItem {id: ${toCypherValue(id)}})`,
        `SET n:${safeLabels}`,
        `SET n = ${propsLiteral};`
    ].join('\n');
}

function createRelation(
    sourceId: string,
    targetId: string,
    relationType: string,
    props: Record<string, JsonValue> = {},
    identityProps: Record<string, JsonValue> = {}
): string {
    const safeType = safeRelationType(relationType);
    const mergeProps = objectToCypherMap(identityProps);
    const relationshipPattern = Object.keys(identityProps).length > 0
        ? `[r:${safeType} ${mergeProps}]`
        : `[r:${safeType}]`;
    const allProps = { ...identityProps, ...props, cascaraManaged: true };

    return [
        `MERGE (source:CascaraItem {id: ${toCypherValue(sourceId)}})`,
        `ON CREATE SET source.referenceOnly = true, source.title = ${toCypherValue(sourceId)}`,
        `MERGE (target:CascaraItem {id: ${toCypherValue(targetId)}})`,
        `ON CREATE SET target.referenceOnly = true, target.title = ${toCypherValue(targetId)}`,
        `MERGE (source)-${relationshipPattern}->(target)`,
        `SET r = ${objectToCypherMap(allProps)};`
    ].join('\n');
}

function clearManagedRelations(sourceId: string): string {
    return [
        `MATCH (source:CascaraItem {id: ${toCypherValue(sourceId)}})-[r]->()`,
        'WHERE r.cascaraManaged = true',
        'DELETE r;'
    ].join('\n');
}

function relationKey(field: string, index: number): Record<string, JsonValue> {
    return { cascaraKey: `${field}:${index}` };
}

function itemLabels(item: TCascaraItem): string[] {
    const labels = ['CascaraItem'];

    if (item.itemType === 'cas:aPackage') {
        labels.push('Package');
    }

    if (item.itemType) {
        labels.push(sanitizeTypeLabel(item.itemType));
    }

    return Array.from(new Set(labels));
}

function sanitizeTypeLabel(itemType: TCascaraItemTypeValue): string {
    const raw = String(itemType);
    const suffix = raw.replace(/^.*[:#\\/]/, '');
    return safeLabelName(suffix || raw);
}

function normalizeLabels(labels: string[]): string {
    const safe = Array.from(new Set(labels.map(safeLabelName).filter(Boolean)));
    return safe.length > 0 ? safe.join(':') : 'CascaraItem';
}

function safeLabelName(label: string): string {
    const cleaned = String(label).replace(/[^A-Za-z0-9_]/g, '_');
    const normalized = cleaned.length === 0 ? 'CascaraItem' : cleaned;
    return /^[A-Za-z_]/.test(normalized) ? normalized : `_${normalized}`;
}

function safeRelationType(type: string): string {
    const cleaned = String(type).replace(/[^A-Za-z0-9_]/g, '_');
    const normalized = cleaned.length === 0 ? 'RELATES_TO' : cleaned;
    const startsOk = /^[A-Za-z_]/.test(normalized) ? normalized : `_${normalized}`;
    return startsOk.toUpperCase();
}

const RELATIONSHIP_FIELDS = new Set([
    'specializes',
    'hasSourceLink',
    'hasTargetLink',
    'enumeratedProperty',
    'enumeratedSourceLink',
    'enumeratedTargetLink',
    'enumeratedEndpoint',
    'composes',
    'enumeratedValue',
    'hasProperty'
]);

function itemProperties(item: TCascaraItem, options: Required<IOptionsCypher>): Record<string, JsonValue> {
    const raw = (item as any).get ? (item as any).get() : (item as any);
    const props: Record<string, JsonValue> = {};

    for (const [key, value] of Object.entries(raw)) {
        if (key === 'id') continue;
        if (value === undefined || value === null) continue;
        if (RELATIONSHIP_FIELDS.has(key)) continue;

        // The graph is already represented by exported nodes. Context is different:
        // without it compact identifiers such as d:item cannot be resolved, so retain
        // an exact serialized copy even in visualization-oriented exports.
        if (!options.includeRawPackageJson && key === 'graph') continue;
        if (!options.includeRawPackageJson && key === 'context') {
            props.contextJson = JSON.stringify(value);
            continue;
        }

        if (key === 'title' || key === 'description' || key === 'definition') {
            props[key] = normalizeTextArray(value);
            if (Array.isArray(value) || typeof value === 'object') {
                props[`${key}Json`] = JSON.stringify(value);
            }
            continue;
        }

        if (Array.isArray(value) || typeof value === 'object') {
            props[key] = JSON.stringify(value);
            continue;
        }

        props[key] = value as JsonValue;
    }

    return props;
}

function normalizeTextArray(value: unknown): string {
    if (!Array.isArray(value)) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    return value
        .filter(entry => entry && typeof entry === 'object' && 'value' in entry)
        .map((entry: any) => String(entry.value))
        .join(' | ');
}

function createLinkRelations(item: TCascaraItem, field: 'hasSourceLink' | 'hasTargetLink'): string[] {
    const relations: string[] = [];
    const cfgs = (item as any)[field];

    if (!Array.isArray(cfgs)) return relations;

    for (let index = 0; index < cfgs.length; index++) {
        const cfg = cfgs[index];
        if (!cfg || typeof cfg !== 'object') continue;

        const targetId = cfg.idRef;
        const relType = cfg.hasClass ? String(cfg.hasClass) : field;

        if (typeof targetId === 'string' && targetId.length > 0) {
            const relProps: Record<string, JsonValue> = {
                linkDirection: field,
                linkClass: typeof cfg.hasClass === 'string' ? cfg.hasClass : field
            };
            if (typeof cfg.itemType === 'string') {
                relProps.linkItemType = cfg.itemType;
            }
            relations.push(createRelation(item.id, targetId, relType, relProps, relationKey(field, index)));
        }
    }

    return relations;
}

function createIdArrayRelations(item: TCascaraItem, field: string, relationType: string): string[] {
    const relations: string[] = [];
    const values = (item as any)[field];

    if (!Array.isArray(values)) return relations;

    for (let index = 0; index < values.length; index++) {
        const targetId = values[index];
        if (typeof targetId === 'string' && targetId.length > 0) {
            relations.push(createRelation(item.id, targetId, relationType, {}, relationKey(field, index)));
        }
    }

    return relations;
}

function createEnumerationValueNodes(item: TCascaraItem): string[] {
    const statements: string[] = [];
    const values = (item as any).enumeratedValue;

    if (!Array.isArray(values)) return statements;

    for (const value of values) {
        if (!value || typeof value !== 'object' || typeof value.id !== 'string') continue;

        statements.push(createMergeNode(['CascaraItem', 'EnumerationValue'], value.id, embeddedObjectProperties(value)));
    }

    return statements;
}

function createEnumerationValueRelations(item: TCascaraItem): string[] {
    const statements: string[] = [];
    const values = (item as any).enumeratedValue;

    if (!Array.isArray(values)) return statements;

    for (let index = 0; index < values.length; index++) {
        const value = values[index];
        if (!value || typeof value !== 'object' || typeof value.id !== 'string') continue;
        statements.push(createRelation(item.id, value.id, 'HAS_ENUMERATED_VALUE', {}, relationKey('enumeratedValue', index)));
    }

    return statements;
}

function createPropertyRelations(item: TCascaraItem): string[] {
    const statements: string[] = [];
    const props = (item as any).hasProperty;

    if (!Array.isArray(props)) return statements;

    for (let index = 0; index < props.length; index++) {
        const prop = props[index];
        if (!prop || typeof prop !== 'object' || typeof prop.hasClass !== 'string') continue;

        const relProps: Record<string, JsonValue> = {
            propertyClass: prop.hasClass
        };
        if (prop.value !== undefined && prop.value !== null) {
            relProps.value = typeof prop.value === 'object' ? JSON.stringify(prop.value) : prop.value;
        }
        if (typeof prop.itemType === 'string') {
            relProps.itemType = prop.itemType;
        }
        if (Array.isArray(prop.composes)) {
            relProps.composesJson = JSON.stringify(prop.composes);
        }

        statements.push(createRelation(item.id, prop.hasClass, 'HAS_PROPERTY', relProps, relationKey('hasProperty', index)));
    }

    return statements;
}

function embeddedObjectProperties(obj: Record<string, unknown>): Record<string, JsonValue> {
    const props: Record<string, JsonValue> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (key === 'id') continue;
        if (value === undefined || value === null) continue;

        if (key === 'title' || key === 'description' || key === 'definition') {
            props[key] = normalizeTextArray(value);
            if (Array.isArray(value) || typeof value === 'object') {
                props[`${key}Json`] = JSON.stringify(value);
            }
        } else if (Array.isArray(value) || typeof value === 'object') {
            props[key] = JSON.stringify(value);
        } else {
            props[key] = value as JsonValue;
        }
    }

    return props;
}

function objectToCypherMap(obj: Record<string, JsonValue>): string {
    const entries = Object.entries(obj).map(([key, value]) => `${safePropertyName(key)}: ${toCypherValue(value)}`);
    return `{ ${entries.join(', ')} }`;
}

function safePropertyName(name: string): string {
    const cleaned = String(name).replace(/[^A-Za-z0-9_]/g, '_');
    const normalized = cleaned.length === 0 ? 'property' : cleaned;
    return /^[A-Za-z_]/.test(normalized) ? normalized : `_${normalized}`;
}

function toCypherValue(value: JsonValue): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    if (typeof value === 'string') return JSON.stringify(value);

    if (Array.isArray(value)) {
        return `[${value.map(v => toCypherValue(v)).join(', ')}]`;
    }

    return JSON.stringify(JSON.stringify(value));
}
