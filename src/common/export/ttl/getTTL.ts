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

import { RE } from '../../lib/definitions';
import { LIB, LOG, ILanguageText } from '../../lib/helpers';
import {
    TPigId, TPigItem, PigItem, PigItemType, PigItemTypeValue, 
    AnEntity, APackage, ARelationship,
    Entity, Relationship, Property, Link, Enumeration,
    AProperty, ATargetLink, ASourceLink
} from '../../schema/pig/ts/pig-metaclasses';

export interface IOptionsTTL {
    /** Indentation string (default: '\t' for tab) */
    indent?: string;
    /** Filter which item types to include in package graph (default: all) */
    filterItemType?: PigItemTypeValue[];
    /** Include shapes (default: false) */
    addShapes?: boolean;
    /** Include any ontology even if available on a server (default: false) */
    addServedOntologies?: boolean;
    /** 
     * Add explicit rdfs:subClassOf or rdfs:subPropertyOf statements (default: false)
     * - For Entity/Relationship classes: adds rdfs:subClassOf to parent class
     * - For Property classes: adds rdfs:subPropertyOf to parent property
     * - For Link classes: adds rdfs:subPropertyOf to parent link
     * These statements are redundant but can improve readability.
     * Also, some tools may not infer them properly.
     */
    addExplicitSubTypes?: boolean;
    addItemTypes?: boolean;
}

/**
 * Generic Turtle export function that dispatches to the appropriate method based on itemType
 * @param item - Any PIG item (APackage, AnEntity, ARelationship, or metamodel classes)
 * @param options - Turtle export options
 * @returns Turtle representation as string
 * 
 * @example
 * import { getTTL } from './getTTL';
 * const turtle = getTTL(item, { addServedOntologies: true, addItemTypes: true });
 */
export function getTTL(item: TPigItem, options?: IOptionsTTL): string {
    let result: string;
    // LOG.debug(`getTTL called for itemType: ${item.itemType}, id: ${item.id}, options: ${JSON.stringify(options)}`);

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
        const filterTypes = options?.filterItemType;
        const indent = options?.indent ?? '\t';
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Add prefix definitions
        ttl += this.xContext(pkg, rdf);

        // Add package metadata
        ttl += this.xMetadataForInstances(pkg, rdf, options);

        // End the package metadata triple (no properties follow for packages)
        ttl += rdf.newLine();

        // Add graph items
        ttl += this.xGraph(pkg, filterTypes, rdf, options);

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
        const rdf = new CToTtl(indent);

        let ttl = '';
        LOG.debug(`Exporting AnEntity ${itm.id} to Turtle, options: ${JSON.stringify(options)}`);

        // Add entity metadata
        ttl += this.xMetadataForInstances(itm, rdf, options);

        // hasProperty - transform configurable properties
        if (LIB.isArrayWithContent(itm.hasProperty)) {
            ttl += this.xProperties(itm.hasProperty, rdf);
        }

        // hasTargetLink - transform configurable target links
        if (LIB.isArrayWithContent(itm.hasTargetLink)) {
            ttl += this.xTargetLinks(itm.hasTargetLink, rdf);
        }

        ttl += rdf.newLine();
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
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Add relationship metadata
        ttl += this.xMetadataForInstances(rel, rdf, options);

        // hasProperty - transform configurable properties
        if (LIB.isArrayWithContent(rel.hasProperty)) {
            ttl += this.xProperties(rel.hasProperty, rdf);
        }

        // hasSourceLink - transform configurable source links
        if (LIB.isArrayWithContent(rel.hasSourceLink)) {
            ttl += this.xSourceLinks(rel.hasSourceLink, rdf);
        }

        // hasTargetLink - transform configurable target links
        if (LIB.isArrayWithContent(rel.hasTargetLink)) {
            ttl += this.xTargetLinks(rel.hasTargetLink, rdf);
        }

        ttl += rdf.newLine();
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
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Use xMetadataForClasses for basic metamodel properties
        ttl += this.xMetadataForClasses(enm, 'owl:Class', 'rdfs:subClassOf', rdf, options);

        // enumeratedValue (mandatory array of allowed values)
        if (LIB.isArrayWithContent(enm.enumeratedValue)) {
            const values = enm.enumeratedValue;
            ttl += rdf.tab1('cas:enumeratedValue', this.formatTurtleId(values[0].id));
            for (let i = 1; i < values.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(values[i].id));
            }
        }

    /*    // datatype
        if (enm.datatype) {
            ttl += rdf.tab1('sh:datatype', this.formatTurtleId(enm.datatype));
        } */

        // unit (optional)
        if (enm.unit) {
            ttl += rdf.tab1('cas:unit', `"${enm.unit}"`);
        }

        return ttl + rdf.newLine();
    }

    /**
     * Export Property (metamodel class) to Turtle format
     * @param property - Property instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static property(prp: Property, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Use xMetadataForClasses for basic metamodel properties
        ttl += this.xMetadataForClasses(prp, 'owl:DatatypeProperty', 'rdfs:subPropertyOf', rdf, options);

    /*    // datatype --> include in shape later
        if (prp.datatype) {
            ttl += rdf.tab1('sh:datatype', this.formatTurtleId(prp.datatype));
        } */

        // composes (references to other Properties)
        if (LIB.isArrayWithContent(prp.composes)) {
            const composes = prp.composes as TPigId[];
            ttl += rdf.tab1('cas:composes', this.formatTurtleId(composes[0]));
            for (let i = 1; i < composes.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(composes[i]));
            }
        }

        // Note: Shape-specific details (maxLength, minCount, maxCount, pattern, 
        // minInclusive, maxInclusive, defaultValue, unit) are omitted here.
        // These will be added to a SHACL shape later.

        return ttl + rdf.newLine();
    }

    /**
     * Export Link (metamodel class) to Turtle format
     * @param link - Link instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static link(lnk: Link, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Use xMetadataForClasses for basic metamodel properties
        ttl += this.xMetadataForClasses(lnk, 'owl:ObjectProperty', 'rdfs:subPropertyOf', rdf, options);

    /*    // enumeratedEndpoint (mandatory array of Entity/Relationship URIs)
        if (LIB.isArrayWithContent(lnk.enumeratedEndpoint)) {
            const endpoints = lnk.enumeratedEndpoint as TPigId[];
            ttl += rdf.tab1('cas:enumeratedEndpoint', this.formatTurtleId(endpoints[0]));
            for (let i = 1; i < endpoints.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(endpoints[i]));
            }
        } */

        // Note: Shape-specific details (minCount, maxCount) are omitted here.
        // These will be added to a SHACL shape later.

        return ttl + rdf.newLine();
    }

    /**
     * Export Entity (metamodel class) to Turtle format
     * @param entity - Entity instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static entity(itm: Entity, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Use xMetadataForClasses for basic metamodel properties
        ttl += this.xMetadataForClasses(itm, 'owl:Class', 'rdfs:subClassOf', rdf, options);

    /*    // enumeratedProperty (optional array of Property URIs)
        if (LIB.isArrayWithContent(itm.enumeratedProperty)) {
            const properties = itm.enumeratedProperty as TPigId[];
            ttl += rdf.tab1('cas:enumeratedProperty', this.formatTurtleId(properties[0]));
            for (let i = 1; i < properties.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(properties[i]));
            }
        }

    /*    // enumeratedTargetLink (optional array of Link URIs)
        if (LIB.isArrayWithContent(itm.enumeratedTargetLink)) {
            const links = itm.enumeratedTargetLink as TPigId[];
            ttl += rdf.tab1('cas:enumeratedTargetLink', this.formatTurtleId(links[0]));
            for (let i = 1; i < links.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(links[i]));
            }
        } */

        // icon (optional)
        if (itm.icon?.value) {
            ttl += rdf.tab1('cas:icon', `"${itm.icon.value}"`);
        }

        return ttl + rdf.newLine();
    }

    /**
     * Export Relationship (metamodel class) to Turtle format
     * @param relationship - Relationship instance
     * @param options - Export options
     * @returns Turtle representation
     */
    static relationship(rel: Relationship, options?: IOptionsTTL): string {
        const indent = options?.indent ?? '\t';
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Use xMetadataForClasses for basic metamodel properties
        ttl += this.xMetadataForClasses(rel, 'owl:Class', 'rdfs:subClassOf', rdf, options);

    /*    // enumeratedProperty (optional array of Property URIs)
        if (LIB.isArrayWithContent(rel.enumeratedProperty)) {
            const properties = rel.enumeratedProperty as TPigId[];
            ttl += rdf.tab1('cas:enumeratedProperty', this.formatTurtleId(properties[0]));
            for (let i = 1; i < properties.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(properties[i]));
            }
        }

        // enumeratedSourceLink (optional, exactly 1 as checked by schema)
        if (LIB.isArrayWithContent(rel.enumeratedSourceLink)) {
            const sourceLinks = rel.enumeratedSourceLink as TPigId[];
            ttl += rdf.tab1('cas:enumeratedSourceLink', this.formatTurtleId(sourceLinks[0]));
            for (let i = 1; i < sourceLinks.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(sourceLinks[i]));
            }
        }

        // enumeratedTargetLink (optional, exactly 1 as checked by schema)
        if (LIB.isArrayWithContent(rel.enumeratedTargetLink)) {
            const targetLinks = rel.enumeratedTargetLink as TPigId[];
            ttl += rdf.tab1('cas:enumeratedTargetLink', this.formatTurtleId(targetLinks[0]));
            for (let i = 1; i < targetLinks.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(targetLinks[i]));
            }
        } */

        // icon (optional)
        if (rel.icon?.value) {
            ttl += rdf.tab1('cas:icon', `"${rel.icon.value}"`);
        }

        return ttl + rdf.newLine();
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
    private static xContext(pkg: APackage, rdf: CToTtl): string {
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
     * Transform metadata to Turtle format - common base function for both instances and classes
     * @param itm - Item with Identifiable properties (id, itemType, title, description, etc.)
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of common metadata properties
     */
    private static xMetadata(
        itm: APackage | AnEntity | ARelationship | Property | Link | Entity | Relationship | Enumeration,
        rdf: CToTtl
    ): string {
        let ttl = '';

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            ttl += rdf.tab1('dcterms:title', itm.title);
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            ttl += rdf.tab1('dcterms:description', itm.description);
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(itm.definition)) {
            ttl += rdf.tab1('skos:definition', itm.definition);
        }

        // revision
        if (itm.revision) {
            ttl += rdf.tab1('cas:revision', itm.revision); // subProperty of 'schema:version'
        }

        // priorRevision
        if (LIB.isArrayWithContent(itm.priorRevision)) {
            const priorRevisions = itm.priorRevision as string[];
            ttl += rdf.tab1('cas:priorRevision', priorRevisions[0]);
            for (let i = 1; i < priorRevisions.length; i++) {
                ttl += rdf.tab2(priorRevisions[i]);
            }
        }

        // modified (ISO date string)
        if (itm.modified) {
            ttl += rdf.tab1('dcterms:modified', `"${itm.modified}"^^xs:dateTime`);
        }

        // creator
        if (itm.creator) {
            ttl += rdf.tab1('dcterms:creator', itm.creator);
        }

        // Note: Do NOT call rdf.newLine() here - let the caller decide when to end the triple
        // This allows adding more predicates after metadata
        return ttl;
    }

    /**
     * Wrapper for instances (APackage, AnEntity, ARelationship)
     * Adds instance-specific properties like hasClass
     * @param itm - Instance item
     * @param rdf - CToTtl instance for building Turtle output
     * @param options - controls whether to add optional triples like cas:itemType
     * @returns Turtle representation of instance metadata
     */
    private static xMetadataForInstances(
        itm: APackage | AnEntity | ARelationship,
        rdf: CToTtl,
        options?: { addItemTypes?: boolean }
    ): string {
        let ttl = '';

        // Item ID as subject
        const subjectId = this.formatTurtleId(itm.id);
        ttl += rdf.tab0(subjectId);

        // hasClass (the item's class/type) - required for instances according to schema
        ttl += rdf.tab1('a', this.formatTurtleId(itm.hasClass));

        if (options?.addItemTypes) {
            ttl += rdf.tab1('cas:itemType', itm.itemType);
        }

        ttl += this.xMetadata(itm, rdf);

        return ttl;
    }

    /**
     * Wrapper for metamodel classes (Property, Link, Entity, Relationship, Enumeration)
     * Uses common metadata without hasClass (classes don't have hasClass)
     * @param itm - Metamodel class item
     * @param rdf - CToTtl instance for building Turtle output
     * @param options - controls whether to add optional triples like cas:itemType
     * @returns Turtle representation of class metadata
     */
    private static xMetadataForClasses(
        itm: Property | Link | Entity | Relationship | Enumeration,
        owlClassification: string,
        rdfSpecialization: string,
        rdf: CToTtl,
        options?: { addItemTypes?: boolean, addExplicitSubTypes?: boolean }
    ): string {
        // For classes, just use the common metadata (no hasClass)
        let ttl = '';

        if (!rdfSpecialization || !owlClassification) // both are defined or not, but anyways both are checked to satisfy the TS type guard
            throw Error(`xMetadataForClasses: Unsupported itemType ${itm.itemType} for class metadata; expected Property, Link, Entity, Relationship, or Enumeration.`);

        // Item ID as subject
        const subjectId = this.formatTurtleId(itm.id);
        ttl += rdf.tab0(subjectId);
        // OWL classification only if specializes is not defined or if addExplicitSubTypes is true
        if (!itm.specializes || itm.specializes == itm.itemType || options?.addExplicitSubTypes) {
            ttl += rdf.tab1('a', owlClassification);
        }

        // specializes
        if (itm.specializes && itm.specializes != itm.itemType) {
            const specializesId = this.formatTurtleId(itm.specializes);
            ttl += rdf.tab1(rdfSpecialization, specializesId);
        }

        if (options?.addItemTypes && itm.itemType != itm.id) {
            ttl += rdf.tab1('cas:itemType', itm.itemType);
        }

        return ttl += this.xMetadata(itm, rdf);
    }

    /**
     * Transform graph items to Turtle format
     * @param pkg - APackage instance
     * @param filterTypes - Optional filter for item types
     * @param indent - Indentation string
     * @returns Turtle representation of graph items
     */
    private static xGraph(
        pkg: APackage,
        filterTypes: PigItemTypeValue[] | undefined,
        rdf: CToTtl,
        options?: { addItemTypes?: boolean }
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
            ttl += getTTL(item, options);
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

    /**
     * Transform hasProperty array to Turtle format
     * Properties are configurable instances with hasClass, value, and/or idRef
     * @param properties - Array of AProperty instances
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of properties
     */
    private static xProperties(properties: AProperty[], rdf: CToTtl): string {
        let ttl = '';

        // Group properties by their hasClass (property type)
        const grouped = new Map<TPigId, AProperty[]>();

        for (const prop of properties) {
            if (!prop.hasClass) continue;

            if (!grouped.has(prop.hasClass)) {
                grouped.set(prop.hasClass, []);
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            grouped.get(prop.hasClass)!.push(prop);
        }

        // Generate Turtle for each property group
        for (const [propertyClass, propInstances] of grouped) {
            const predicate = this.formatTurtleId(propertyClass);

            // Add first property value
            const firstProp = propInstances[0];
            ttl += rdf.tab1(predicate, this.formatPropertyValue(firstProp));

            // Add additional values for the same property (if any)
            for (let i = 1; i < propInstances.length; i++) {
                ttl += rdf.tab2(this.formatPropertyValue(propInstances[i]));
            }
        }

        return ttl;
    }

    /**
     * Format a single property value for Turtle output
     * @param prop - AProperty instance
     * @returns Formatted value string
     */
    private static formatPropertyValue(prop: AProperty): string {
        // If it has an idRef, it's a reference to another resource (e.g., enumeration value)
        if (prop.idRef) {
            return this.formatTurtleId(prop.idRef);
        }

        // If it has a value, return the literal value (will be quoted by CToTtl)
        if (prop.value !== undefined) {
            return prop.value;
        }

        // If it has composes, it's a composed property - format as blank node or list
        if (LIB.isArrayWithContent(prop.composes)) {
            const composes = prop.composes as TPigId[];
            // For now, format as a list of references
            const refs = composes.map((id: TPigId) => this.formatTurtleId(id)).join(', ');
            return `( ${refs} )`;
        }

        // Default: empty string
        return '';
    }

    /**
     * Transform hasTargetLink array to Turtle format
     * Links are references to other entities
     * @param links - Array of ATargetLink instances
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of target links
     */
    private static xTargetLinks(links: ATargetLink[], rdf: CToTtl): string {
        let ttl = '';

        // Group links by their hasClass (link type)
        const grouped = new Map<TPigId, ATargetLink[]>();

        for (const link of links) {
            if (!link.hasClass) continue;

            if (!grouped.has(link.hasClass)) {
                grouped.set(link.hasClass, []);
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            grouped.get(link.hasClass)!.push(link);
        }

        // Generate Turtle for each link group
        for (const [linkClass, linkInstances] of grouped) {
            const predicate = this.formatTurtleId(linkClass);

            // Add first link reference
            const firstLink = linkInstances[0];
            if (firstLink.idRef) {
                ttl += rdf.tab1(predicate, this.formatTurtleId(firstLink.idRef));

                // Add additional links for the same link type (if any)
                for (let i = 1; i < linkInstances.length; i++) {
                    if (linkInstances[i].idRef) {
                        ttl += rdf.tab2(this.formatTurtleId(linkInstances[i].idRef));
                    }
                }
            }
        }

        // Note: Do NOT call rdf.newLine() here - let the caller decide when to end the triple
        // This allows adding more predicates after the common metamodel properties
        return ttl;
    }

    /**
     * Transform hasSourceLink array to Turtle format
     * Links are references to other entities (source side of relationships)
     * @param links - Array of ASourceLink instances
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of source links
     */
    private static xSourceLinks(links: ASourceLink[], rdf: CToTtl): string {
        let ttl = '';

        // Group links by their hasClass (link type)
        const grouped = new Map<TPigId, ASourceLink[]>();

        for (const link of links) {
            if (!link.hasClass) continue;

            if (!grouped.has(link.hasClass)) {
                grouped.set(link.hasClass, []);
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            grouped.get(link.hasClass)!.push(link);
        }

        // Generate Turtle for each link group
        for (const [linkClass, linkInstances] of grouped) {
            const predicate = this.formatTurtleId(linkClass);

            // Add first link reference
            const firstLink = linkInstances[0];
            if (firstLink.idRef) {
                ttl += rdf.tab1(predicate, this.formatTurtleId(firstLink.idRef));

                // Add additional links for the same link type (if any)
                for (let i = 1; i < linkInstances.length; i++) {
                    if (linkInstances[i].idRef) {
                        ttl += rdf.tab2(this.formatTurtleId(linkInstances[i].idRef));
                    }
                }
            }
        }

        return ttl;
    }
}
/*function makeShapeId(id: string) {
    // Make a name for a shape given for an element;
    // it is assumed that the id has a namespace.
    return id.startsWith(DEF.defaultOntologyNamespace) ? id + DEF.suffixShape : DEF.prefixShape + id;
}
interface ShaclAssertion {
    prd: string;
    obj: string;
}*/

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
