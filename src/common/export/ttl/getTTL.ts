/*!
 * CASCaDE Reference Implementation – native to Turtle Transformation
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaDE Reference Implementation – native to Turtle Transformation
 * -------------------------------------------------------------------
 * Authors: oskar.dungern@gfse.org
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * This module provides central Turtle (TTL) helpers for the PIG metamodel classes.
 * For each supported type (APackage, AnEntity, ARelationship, and metamodel classes),
 * the static class `GetTTL` offers methods that generate Turtle representations
 * of the respective instances.
 *
 * - Always returns valid Turtle strings.
 * - Error and status information is included in the output where appropriate.
 * - The logic is decoupled from the metamodel classes.
 *
 * Usage:
 *   import { getTTL } from './getTTL';
 *   const turtle = getTTL(item, options);
 *
 * Design Decisions:
 * - Combine all Turtle export logic in a single module for better maintainability.
 * - Use a class with static methods for better organization and extensibility.
 * - Follow the same pattern as getJSONLD for consistency.
 * - For creating a Turtle representation call getTTL(item, options) instead of item.getTTL().
 *
 */

import { DEF, RE } from '../../lib/definitions';
import { LIB, LOG, ILanguageText } from '../../lib/helpers';
import {
    TPigId, TPigItem, PigItem, PigItemType, PigItemTypeValue, 
    AnEntity, APackage, ARelationship,
    Entity, Relationship, Property, Link, Enumeration
} from '../../schema/pig/ts/pig-metaclasses';

export interface IOptionsTTL {
    /** Include prefixes in output (default: true for APackage, false for individual items) */
    includePrefixes?: boolean;
    /** Indentation string (default: '\t' for tab) */
    indent?: string;
    /** Filter which item types to include in package graph (default: all) */
    itemType?: PigItemTypeValue[];
}

/**
 * Generic Turtle export function that dispatches to the appropriate method based on itemType
 * @param item - Any PIG item (APackage, AnEntity, ARelationship, or metamodel classes)
 * @param options - Turtle export options
 * @returns Turtle representation as string
 * 
 * @example
 * import { getTTL } from './getTTL';
 * const turtle = getTTL(item);
 */
export function getTTL(item: TPigItem, options?: IOptionsTTL): string {
    let result: string;

    switch (item.itemType) {
        // Instances/Individuals
        case PigItemType.aPackage:
            result = GetTTL.aPackage(item as APackage, options);
            break;
        case PigItemType.anEntity:
            result = GetTTL.anEntity(item as AnEntity, options);
            break;
        case PigItemType.aRelationship:
            result = GetTTL.aRelationship(item as ARelationship, options);
            break;

        // Metamodel Classes
        case PigItemType.Enumeration:
            result = GetTTL.enumeration(item as Enumeration, options);
            break;
        case PigItemType.Property:
            result = GetTTL.property(item as Property, options);
            break;
        case PigItemType.Link:
            result = GetTTL.link(item as Link, options);
            break;
        case PigItemType.Entity:
            result = GetTTL.entity(item as Entity, options);
            break;
        case PigItemType.Relationship:
            result = GetTTL.relationship(item as Relationship, options);
            break;

        default:
            result = `# Error: No Turtle representation implemented for itemType: ${item.itemType}\n`;
    }

    return result;
}

/**
 * Static class containing Turtle export methods for all PIG types
 */
class GetTTL {

    /**
     * Export APackage to Turtle format
     * @param pkg - APackage instance
     * @param options - Export options
     * @returns Turtle representation with @prefix declarations and triples
     */
    static aPackage(pkg: APackage, options?: IOptionsTTL): string {
        const filterTypes = options?.itemType;
        const indent = options?.indent ?? '\t';
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Add prefixes
        ttl += this.xContextToTTL(pkg, rdf);

        // Add project metadata section
        ttl += this.xPackageMetadataToTTL(pkg, rdf);

        // Add graph items
        ttl += this.xGraphToTTL(pkg, filterTypes, rdf);

        return ttl;
    }

    /**
     * Export AnEntity to Turtle format
     * @param entity - AnEntity instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static anEntity(itm: AnEntity, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement AnEntity to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# AnEntity transformation\n';
        }

        ttl += `# TODO: Implement transformation for AnEntity: ${itm.id}\n`;

        return ttl;
    }

    /**
     * Export ARelationship to Turtle format
     * @param rel - ARelationship instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static aRelationship(rel: ARelationship, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement ARelationship to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# ARelationship transformation\n';
        }

        ttl += `# TODO: Implement transformation for ARelationship: ${rel.id}\n`;

        return ttl;
    }

    /**
     * Export Enumeration (metamodel class) to Turtle format
     * @param enumeration - Enumeration instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static enumeration(enm: Enumeration, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement Enumeration to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# Enumeration transformation\n';
        }

        ttl += `# TODO: Implement transformation for Enumeration: ${enm.id}\n`;

        return ttl;
    }

    /**
     * Export Property (metamodel class) to Turtle format
     * @param property - Property instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static property(prp: Property, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement Property to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# Property transformation\n';
        }

        ttl += `# TODO: Implement transformation for Property: ${prp.id}\n`;

        return ttl;
    }

    /**
     * Export Link (metamodel class) to Turtle format
     * @param link - Link instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static link(lnk: Link, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement Link to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# Link transformation\n';
        }

        ttl += `# TODO: Implement transformation for Link: ${lnk.id}\n`;

        return ttl;
    }

    /**
     * Export Entity (metamodel class) to Turtle format
     * @param entity - Entity instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static entity(itm: Entity, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement Entity to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# Entity transformation\n';
        }

        ttl += `# TODO: Implement transformation for Entity: ${itm.id}\n`;

        return ttl;
    }

    /**
     * Export Relationship (metamodel class) to Turtle format
     * @param relationship - Relationship instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static relationship(rel: Relationship, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';

        // TODO: Implement Relationship to Turtle transformation
        let ttl = '';

        if (options?.includePrefixes) {
            ttl += '# Relationship transformation\n';
        }

        ttl += `# TODO: Implement transformation for Relationship: ${rel.id}\n`;

        return ttl;
    }

    /**
     * Transform context from internal INamespace[] format to Turtle @prefix format
     * @param pkg - APackage instance
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle @prefix declarations
     * 
     * Internal format: context = [{ tag: "cas:", uri: "https://..." }, ...]
     * Turtle format:   @prefix cas: <https://...> .
     */
    private static xContextToTTL(pkg: APackage, rdf: CToTtl): string {
        const ctx = pkg.context;

        if (!ctx || !Array.isArray(ctx)) {
            LOG.warn(`APackage ${pkg.id} has no valid context`);
            return '';
        }

        let ttl = '';

        // Add standard prefixes that are commonly needed
        const standardPrefixes = [
            { tag: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
            { tag: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
            { tag: 'skos', uri: 'https://www.w3.org/TR/skos-reference/' },
            { tag: 'owl', uri: 'http://www.w3.org/2002/07/owl#' },
            { tag: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
            { tag: 'xs', uri: 'http://www.w3.org/2001/XMLSchema#' },
            { tag: 'dcterms', uri: 'http://purl.org/dc/terms/' },
            { tag: 'schema', uri: 'http://schema.org/' }
        ];

        for (const prefix of standardPrefixes) {
            ttl += rdf.prefix(prefix.tag, prefix.uri);
        }

        // Transform INamespace[] to Turtle @prefix declarations
        for (const ns of ctx) {
            // Skip if not a valid object
            if (!ns || typeof ns !== 'object' || Array.isArray(ns)) {
                continue;
            }
            if (!('tag' in ns) || !('uri' in ns)) {
                continue;
            }

            const tag = ns.tag;
            const uri = ns.uri;

            // Ensure tag and uri are strings
            if (typeof tag === 'string' && typeof uri === 'string') {
                ttl += rdf.prefix(tag, uri);
            }
        }

        ttl += rdf.newLine();
        return ttl;
    }

    /**
     * Transform package metadata to Turtle format
     * @param pkg - APackage instance
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of package metadata
     */
    private static xPackageMetadataToTTL(pkg: APackage, rdf: CToTtl): string {
        let ttl = '';

        // Package ID as subject
        const subjectId = this.formatTurtleId(pkg.id);
        ttl += rdf.tab0(subjectId);

        // itemType
        ttl += rdf.tab1('a', `cas:${pkg.itemType}`);

        // title (multi-language)
        if (pkg.title && Array.isArray(pkg.title) && pkg.title.length > 0) {
            ttl += rdf.tab1('dcterms:title', pkg.title);
        }

        // description (multi-language)
        if (pkg.description && Array.isArray(pkg.description) && pkg.description.length > 0) {
            ttl += rdf.tab1('dcterms:description', pkg.description);
        }

        // definition (multi-language)
        if (pkg.definition && Array.isArray(pkg.definition) && pkg.definition.length > 0) {
            ttl += rdf.tab1('skos:definition', pkg.definition);
        }

        // specializes
        if (pkg.specializes) {
            const specializesId = this.formatTurtleId(pkg.specializes);
            ttl += rdf.tab1('rdfs:subClassOf', specializesId);
        }

        // revision
        if (pkg.revision) {
            ttl += rdf.tab1('schema:version', pkg.revision);
        }

        // priorRevision
        if (pkg.priorRevision && Array.isArray(pkg.priorRevision) && pkg.priorRevision.length > 0) {
            ttl += rdf.tab1('cas:priorRevision', pkg.priorRevision[0]);
            for (let i = 1; i < pkg.priorRevision.length; i++) {
                ttl += rdf.tab2(pkg.priorRevision[i]);
            }
        }

        // modified (ISO date string)
        if (pkg.modified) {
            ttl += rdf.tab1('dcterms:modified', `"${pkg.modified}"^^xs:dateTime`);
        }

        // creator
        if (pkg.creator) {
            ttl += rdf.tab1('dcterms:creator', pkg.creator);
        }

        ttl += rdf.newLine();
        return ttl;
    }

    /**
     * Transform graph items to Turtle format
     * @param pkg - APackage instance
     * @param filterTypes - Optional filter for item types
     * @param indent - Indentation string
     * @returns Turtle representation of graph items
     */
    private static xGraphToTTL(
        pkg: APackage,
        filterTypes: PigItemTypeValue[] | undefined,
        rdf: CToTtl
    ): string {
        const graph = pkg.graph;

        if (!graph || !Array.isArray(graph) || graph.length === 0) {
            return '';
        }

        let ttl = rdf.heading('Graph Items');

        // Filter graph items if specified
        const items = filterTypes
            ? graph.filter(item => filterTypes.includes(item.itemType))
            : graph;

        // Transform each graph item to Turtle
        for (const item of items) {
            ttl += getTTL(item);
        }

        ttl += rdf.newLine();
        return ttl;
    }

    /**
     * Convert a PIG ID to a Turtle-compatible IRI or prefixed name
     * @param id - PIG ID string
     * @returns Turtle-formatted IRI or prefixed name
     */
    private static formatTurtleId(id: TPigId): string {
        if (!id) {
            return '<unknown>';
        }

        // If it contains a colon, assume it's already a prefixed name
        if (id.includes(':') && !id.startsWith('http://') && !id.startsWith('https://')) {
            return id;
        }

        // If it's a full IRI, wrap in angle brackets
        if (id.startsWith('http://') || id.startsWith('https://')) {
            return `<${id}>`;
        }

        // Otherwise, return as-is (might need context-specific handling)
        return id;
    }
}
function makeShapeId(id: string) {
    // Make a name for a shape given for an element;
    // it is assumed that the id has a namespace.
    return id.startsWith(DEF.defaultOntologyNamespace) ? id + DEF.suffixShape : DEF.prefixShape + id;
}
interface ShaclAssertion {
    prd: string;
    obj: string;
}

/**
 * Helper class for building RDF/Turtle triples with proper formatting.
 * Manages indentation and line endings (., ;, ,) based on triple structure.
 * 
 * @example
 * ```typescript
 * const rdf = new CToTtl('\t');
 * let ttl = rdf.prefix('ex', 'http://example.org/');
 * ttl += rdf.tab0('ex:Subject');
 * ttl += rdf.tab1('rdf:type', 'ex:Class');
 * ttl += rdf.tab1('rdfs:label', 'Example');
 * ttl += rdf.newLine();
 * ```
 */
export class CToTtl {
    private lastTab: number;
    private readonly indent: string;

    /**
     * Create a new RDF/Turtle builder
     * @param indent - Indentation string (default: '\t')
     */
    constructor(indent = '\t') {
        this.lastTab = -1;
        this.indent = indent;
    }

    /**
     * Add a section heading as comment
     * @param str - Heading text
     * @returns Formatted heading with separator lines
     */
    heading(str: string): string {
        return this.newLine('#################################################################')
            + this.newLine(`# ${str}`)
            + this.newLine('#################################################################')
            + this.newLine();
    }

    /**
     * Start a new line, finalizing any previous triple
     * @param str - Optional content for the new line
     * @returns Formatted line with proper ending
     */
    newLine(str?: string): string {
        if (this.lastTab === 0) {
            throw new Error("CToTtl: Previous triple is incomplete (subject without predicate)");
        }
        const ending = this.lastTab < 0 ? "" : " .";
        this.lastTab = -1;
        return ending + '\n' + (str ?? "");
    }

    /**
     * Add a @prefix declaration
     * @param tag - Prefix tag (with or without colon)
     * @param url - Namespace URI
     * @returns Formatted prefix declaration
     */
    prefix(tag: string, url: string): string {
        const prefixName = tag.endsWith(':') ? tag.slice(0, -1) : tag;
        return this.newLine(`@prefix ${prefixName}: <${url}> .`);
    }

    /**
     * Start a new triple with the given subject
     * @param subject - Subject IRI or prefixed name
     * @returns Formatted subject line
     */
    tab0(subject: string): string {
        if (this.lastTab === 0) {
            throw new Error("CToTtl: Previous triple is incomplete (subject without predicate)");
        }
        const ending = this.lastTab < 0 ? "" : " .";
        this.lastTab = 0;
        return ending + `\n${subject}`;
    }

    /**
     * Add a predicate-object pair (new predicate in predicate list)
     * @param predicate - Predicate IRI or prefixed name
     * @param object - Object value (scalar or ILanguageText array)
     * @returns Formatted predicate-object line(s)
     */
    tab1(predicate: string, object: undefined | number | boolean | string | ILanguageText[]): string {
        if (this.lastTab < 0) {
            throw new Error("CToTtl: Subject is missing");
        }
        if (object !== undefined) { // object may be 0 or false
            const ending = this.lastTab < 1 ? "" : " ;";
            this.lastTab = 1;
            return this.makeLines(ending + `\n${this.indent}${predicate} `, object);
        }
        return "";
    }

    /**
     * Add an additional object to the current predicate (object list)
     * @param object - Object value (scalar or ILanguageText array)
     * @returns Formatted object line(s)
     */
    tab2(object: undefined | number | boolean | string | ILanguageText[]): string {
        if (this.lastTab < 1) {
            throw new Error("CToTtl: Predicate is missing");
        }
        if (object !== undefined) { // object may be 0 or false
            const ending = " ,";
            this.lastTab = 2;
            return this.makeLines(ending + `\n${this.indent}${this.indent}`, object);
        }
        return "";
    }

    /**
     * Format object value(s) with proper quoting and language tags
     * @param pred - Prefix string (includes predicate for first value, or just indentation)
     * @param object - Object value(s) to format
     * @returns Formatted object string(s)
     */
    private makeLines(pred: string, object: undefined | number | boolean | string | ILanguageText[]): string {
        switch (typeof object) {
            case 'undefined':
                return "";

            case 'number':
            case 'boolean':
                return pred + object.toString();

            case 'string':
                return this.formatStringObject(pred, object);

            default:
                return this.formatArrayObject(pred, object);
        }
    }

    /**
     * Format a string object with proper quoting
     * @param pred - Prefix string
     * @param str - String value
     * @returns Formatted string
     */
    private formatStringObject(pred: string, str: string): string {
        if (str.length === 0) return "";

        if (this.shouldSkipQuotes(pred, str)) {
            return pred + str;
        }
        return pred + `"${this.escapeTtl(str)}"`;
    }

    /**
     * Format an array of objects (ILanguageText[] or scalar array)
     * @param pred - Prefix string
     * @param object - Array of values
     * @returns Formatted string with all values
     */
    private formatArrayObject(pred: string, object: ILanguageText[]): string {
        if (!LIB.isArrayWithContent(object)) {
            LOG.error("CToTtl: Expecting an array with items but got:", object);
            return "";
        }

        if (PigItem.isMultiLanguageText(object)) {
            return this.formatMultiLanguageText(pred, object);
        }
        return this.formatScalarArray(pred, object);
    }

    /**
     * Format multi-language text values
     * @param pred - Prefix string
     * @param texts - Array of ILanguageText objects
     * @returns Formatted multi-language text
     */
    private formatMultiLanguageText(pred: string, texts: ILanguageText[]): string {
        if (texts.length === 1) {
            // Single language version may omit language tag
            const t = texts[0].value;
            const l = texts[0].lang;

            if (this.shouldSkipQuotes(pred, t)) {
                return pred + t;
            }
            const languageTag = l ? `@${l}` : '';
            return pred + `"${this.escapeTtl(t)}"` + languageTag;
        }

        // Multiple language versions must have language tags
        let str = "";
        texts.forEach((v, i) => {
            if (!v.lang) {
                LOG.error("CToTtl: Multi-language text must have a language specified for multiple versions:", v);
            }
            const prefix = i === 0 ? pred : ` ,\n${this.indent}${this.indent}`;
            str += prefix + `"${this.escapeTtl(v.value)}"@${v.lang}`;
        });
        return str;
    }

    /**
     * Format an array of scalar values
     * @param pred - Prefix string
     * @param values - Array of scalar values
     * @returns Formatted scalar array
     */
    private formatScalarArray(pred: string, values: any[]): string {
        let str = '';
        values.forEach((v, i) => {
            // Validate it's not an ILanguageText object
            if (typeof v === 'object' && v !== null && ('value' in v || 'lang' in v)) {
                LOG.error("CToTtl: Expected scalar value but got ILanguageText object:", v);
                return;
            }

            const scalarValue = String(v);
            const prefix = i === 0 ? pred : ` ,\n${this.indent}${this.indent}`;

            if (this.shouldSkipQuotes(pred, scalarValue)) {
                str += prefix + scalarValue;
            } else {
                str += prefix + `"${this.escapeTtl(scalarValue)}"`;
            }
        });
        return str;
    }

    /**
     * Determine if quotes should be skipped for a value
     * @param pred - Prefix string (may contain predicate name)
     * @param str - Value to check
     * @returns True if quotes should be omitted
     */
    private shouldSkipQuotes(pred: string, str: string): boolean {
        // Skip quotes for RDF resources, complex values (blank nodes, lists), and typed literals
        // Always use quotes for rdfs:label and rdfs:comment
        const isResource = RE.Namespace.test(str) 
            || str.startsWith('<http') 
            || RE.contentInRoundBrackets.test(str) 
            || RE.contentInSquareBrackets.test(str)
            || str.includes('^^');  // Typed literals (e.g., "value"^^xs:dateTime)

        const isLabelOrComment = pred.includes('rdfs:label') || pred.includes('rdfs:comment');

        return isResource && !isLabelOrComment;
    }

    /**
     * Escape special characters for Turtle string literals
     * @param str - String to escape
     * @returns Escaped string
     */
    private escapeTtl(str: string): string {
        if (!str) return '';

        return str
            .replace(/\\/g, '\\\\')  // Backslashes first
            .replace(/"/g, '\\"')     // Double quotes
            .replace(/\n/g, '\\n')    // Newlines
            .replace(/\r/g, '')       // Remove carriage returns
            .replace(/\t/g, '\\t');   // Tabs
    }
}
