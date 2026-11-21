/**
 * Consolidate aRelationships
 *
 * Problem: a JSON-LD CASCaDE data file (SpecIF format) may contain multiple
 * `cas:aRelationship` items of the same relationship type (`@type`) that share
 * the same source endpoint(s) (`${@type}-toSource`), but each pointing to a
 * different, single target endpoint (`${@type}-toTarget`).
 *
 * This script consolidates such duplicates: for every group of aRelationship
 * items having the same `@type` and the same set of source endpoint ids, it
 * keeps a single relationship item and merges all target endpoints found in
 * the group into that item's `${@type}-toTarget` array (deduplicated by id).
 * The redundant relationship items are then removed from the `@graph`.
 *
 * Usage:
 *   npx tsx scripts/consolidate-aRelationships.ts <input.cas.jsonld> [output.cas.jsonld]
 *
 * If no output path is given, the result is written next to the input file
 * with a `.consolidated.cas.jsonld` suffix; the original file is left untouched.
 */

import * as fs from 'fs';
import * as path from 'path';

interface JsonLdItemType {
    '@id': string;
}

interface GraphItem {
    '@id': string;
    '@type'?: string;
    'cas:itemType'?: JsonLdItemType;
    [key: string]: unknown;
}

interface JsonLdDocument {
    '@graph': GraphItem[];
    [key: string]: unknown;
}

const A_RELATIONSHIP = 'cas:aRelationship';

// The full set of valid PIG item types (see PigItemType in pig-metaclasses.ts), used to sanity-check
// that the input file is indeed a cas.jsonld document before attempting to consolidate it:
const VALID_ITEM_TYPES = new Set<string>([
    'cas:Package',
    'cas:Enumeration',
    'cas:Property',
    'cas:Link',
    'cas:Entity',
    'cas:Relationship',
    'cas:aPackage',
    'cas:anOntology',
    'cas:aProperty',
    'cas:aSourceLink',
    'cas:aTargetLink',
    'cas:anEntity',
    'cas:aRelationship'
]);

function isARelationship(item: GraphItem): boolean {
    return item['cas:itemType']?.['@id'] === A_RELATIONSHIP;
}

// Briefly validates that the parsed document looks like a cas.jsonld file: every item in '@graph'
// must have a 'cas:itemType' property whose '@id' is one of the known PIG item types. Returns the
// list of problems found (empty if the document is valid).
function validateCasJsonLd(doc: JsonLdDocument): string[] {
    const problems: string[] = [];

    if (!Array.isArray(doc['@graph'])) {
        problems.push('Missing top-level "@graph" array.');
        return problems;
    }

    doc['@graph'].forEach((item, index) => {
        const label = item?.['@id'] ? `item "${item['@id']}"` : `item at index ${index}`;
        const itemType = item?.['cas:itemType']?.['@id'];
        if (!itemType) {
            problems.push(`${label} has no "cas:itemType.@id" property.`);
        } else if (!VALID_ITEM_TYPES.has(itemType)) {
            problems.push(`${label} has an unknown "cas:itemType.@id": "${itemType}".`);
        }
    });

    return problems;
}

function endpointIds(item: GraphItem, property: string): string[] {
    const value = item[property];
    if (!Array.isArray(value)) return [];
    return value
        .map((endpoint) => (endpoint as { '@id'?: string })['@id'])
        .filter((id): id is string => typeof id === 'string');
}

function consolidate(doc: JsonLdDocument): { doc: JsonLdDocument; groupsConsolidated: number; itemsRemoved: number } {
    const graph = doc['@graph'];

    // groupKey -> list of items (in original order)
    const groups = new Map<string, GraphItem[]>();

    for (const item of graph) {
        if (!isARelationship(item) || !item['@type']) continue;

        const type = item['@type'];
        const sourceProperty = `${type}-toSource`;
        const sourceIds = [...new Set(endpointIds(item, sourceProperty))].sort();
        if (sourceIds.length === 0) continue;

        const groupKey = JSON.stringify([type, sourceIds]);
        const list = groups.get(groupKey);
        if (list) {
            list.push(item);
        } else {
            groups.set(groupKey, [item]);
        }
    }

    const itemsToRemove = new Set<GraphItem>();
    // Maps the @id of a removed duplicate relationship to the @id of the item kept in its place,
    // so that references to the duplicate (e.g. another relationship using it as an endpoint) can
    // be rewritten instead of being left dangling:
    const idMap = new Map<string, string>();
    let groupsConsolidated = 0;

    for (const items of groups.values()) {
        if (items.length < 2) continue;

        const [keep, ...duplicates] = items;
        const type = keep['@type'] as string;
        const targetProperty = `${type}-toTarget`;

        const mergedTargets: unknown[] = Array.isArray(keep[targetProperty]) ? [...(keep[targetProperty] as unknown[])] : [];
        const seenTargetIds = new Set(endpointIds(keep, targetProperty));

        for (const duplicate of duplicates) {
            const targets = Array.isArray(duplicate[targetProperty]) ? (duplicate[targetProperty] as unknown[]) : [];
            for (const target of targets) {
                const id = (target as { '@id'?: string })['@id'];
                if (id && !seenTargetIds.has(id)) {
                    seenTargetIds.add(id);
                    mergedTargets.push(target);
                }
            }
            itemsToRemove.add(duplicate);
            idMap.set(duplicate['@id'], keep['@id']);
        }

        keep[targetProperty] = mergedTargets;
        groupsConsolidated++;
    }

    const consolidatedGraph = graph.filter((item) => !itemsToRemove.has(item));

    if (idMap.size > 0) {
        rewriteReferences(consolidatedGraph, idMap);
    }

    doc['@graph'] = consolidatedGraph;

    return { doc, groupsConsolidated, itemsRemoved: itemsToRemove.size };
}

// Recursively walks every remaining graph item and rewrites any "@id" value that points to a
// removed duplicate relationship, so that it points to the item kept in its place instead.
// Relationships may themselves be endpoints of other relationships, so this must run after
// duplicates have been determined but before they are dropped from the graph.
function rewriteReferences(graph: GraphItem[], idMap: Map<string, string>): void {
    function resolve(id: string): string {
        // follow chained mappings (duplicate -> duplicate -> kept), guarding against cycles:
        const seen = new Set<string>();
        let current = id;
        while (idMap.has(current) && !seen.has(current)) {
            seen.add(current);
            current = idMap.get(current) as string;
        }
        return current;
    }

    function rewrite(value: unknown): void {
        if (Array.isArray(value)) {
            for (const entry of value) rewrite(entry);
            return;
        }
        if (value && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            if (typeof obj['@id'] === 'string' && idMap.has(obj['@id'] as string)) {
                obj['@id'] = resolve(obj['@id'] as string);
            }
            for (const key of Object.keys(obj)) {
                if (key === '@id') continue;
                rewrite(obj[key]);
            }
        }
    }

    for (const item of graph) rewrite(item);
}

function main(): void {
    const [, , inputArg, outputArg] = process.argv;

    if (!inputArg) {
        console.error('Usage: npx tsx scripts/consolidate-aRelationships.ts <input.jsonld> [output.jsonld]');
        process.exit(1);
    }

    const inputPath = path.resolve(inputArg);
    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exit(1);
    }

    // Determine output path robustly, based on input file extension and optional output argument.
    // Handle ordinary .jsonld filenames too, and append a suffix when neither extension matches.
    const outputPath = outputArg
        ? path.resolve(outputArg)
        : /\.cas\.jsonld$/i.test(inputPath)
        ? inputPath.replace(/\.cas\.jsonld$/i, '.consolidated.cas.jsonld')
        : /\.jsonld$/i.test(inputPath)
            ? inputPath.replace(/\.jsonld$/i, '.consolidated.jsonld')
            : `${inputPath}.consolidated.jsonld`;

    const raw = fs.readFileSync(inputPath, 'utf8');
    const doc = JSON.parse(raw) as JsonLdDocument;

    if (!Array.isArray(doc['@graph'])) {
        console.error('Input file does not contain a top-level "@graph" array.');
        process.exit(1);
    }

    const problems = validateCasJsonLd(doc);
    if (problems.length > 0) {
        console.error(`Input file does not look like a valid cas.jsonld document (${problems.length} problem(s) found):`);
        for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
        if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more.`);
        process.exit(1);
    }

    const { doc: result, groupsConsolidated, itemsRemoved } = consolidate(doc);

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

    console.log(`Consolidated ${groupsConsolidated} group(s) of duplicate aRelationships.`);
    console.log(`Removed ${itemsRemoved} redundant item(s).`);
    console.log(`Output written to: ${outputPath}`);
}

main();
