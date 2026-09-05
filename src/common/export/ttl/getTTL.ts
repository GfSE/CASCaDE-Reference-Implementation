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
 * - Entity and Relationship classes declare their properties and links via shapes
 * - ... but Property and Link classes do not declare their domain to avoid a potentially huge union.
 * - At first, only cas: ontology terms get a shape.
 * - Those cas: shapes will be served from the same URL as the terms themselves
 * - On TTL export, the configurable properties will be added to the ontology declaration.
 * - ... and the configurable links will be added to the package class declaration.
 * - numeric and boolean values are emitted with quotes, even though Turtle shorthand allows no quotes.
 *
 * ToDo:
 * - Add itemTypes as superClasses for all ontolology classes (Property, Link, Entity, Relationship, Enumeration)
 * - ... with definitions for enumeratedProperty, enumeratedSourceLink, enumeratedTargetLink, enumeratedEndpoint.
 * - Add TTL output for enumerations with datatypes other than string.
 */

import { DEF } from '../../lib/definitions';
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
    /** Filter which item types to include in package graph (default: all, empty array means none which is obviously useless) */
    filterItemType?: PigItemTypeValue[];
    /** Include any ontology even if available on a server (default: false) */
    addHostedOntologies?: boolean;
    /** Include shapes (default: false)
     * @ToDo: Consider to add shapes only if addHostedOntologies is true
     */
    addShapes?: boolean;
    /** 
     * Add explicit rdf:type triples also to subClasses and subProperties (default: false)
     * - For Entity/Relationship classes: adds rdf:type owl:Class also to subClasses
     * - For Property classes: adds rdf:type owl:DatatypeProperty to subProperties
     * - For Link classes: adds rdf:type owl:ObjectProperty to subProperties
     * These statements are redundant but can improve readability.
     * Also, some tools may not infer them properly.
     */
    addExplicitTypeToAllClasses?: boolean;
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
        ttl += this.xContext(pkg, rdf, options);

        // Add ontology definition
        ttl += this.makeOntologyDefinition(pkg, rdf);

        // Add package metadata
        ttl += this.xMetadataForInstances(pkg, rdf, options);

        // End the package metadata triple (no properties follow for packages)
        ttl += rdf.newLine();

        // Add graph items (including metamodel class shapes if requested)
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
        // LOG.debug(`Exporting AnEntity ${itm.id} to Turtle, options: ${JSON.stringify(options)}`);

        // Add entity metadata
        ttl += this.xMetadataForInstances(itm, rdf, options);

        // hasProperty - transform configurable properties
        if (LIB.isArrayWithContent(itm.hasProperty)) {
            ttl += this.xProperties(itm.hasProperty, rdf);
        }

        // hasTargetLink - transform configurable target links
        if (LIB.isArrayWithContent(itm.hasTargetLink)) {
            ttl += this.xLinks(itm.hasTargetLink, rdf);
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
            ttl += this.xLinks(rel.hasSourceLink, rdf);
        }

        // hasTargetLink - transform configurable target links
        if (LIB.isArrayWithContent(rel.hasTargetLink)) {
            ttl += this.xLinks(rel.hasTargetLink, rdf);
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

        // Add basic metamodel properties
        ttl += this.xMetadataForClasses(enm, 'owl:Class', 'rdfs:subClassOf', rdf, options);

        // datatype
        if (enm.datatype) {
            ttl += rdf.tab1('sh:datatype', this.formatTurtleId(enm.datatype), false); // is reference
        }
        else {
            // should not happen, as datatype is mandatory for Enumeration:
            LOG.error(`Enumeration ${enm.id} has no datatype defined`);
        }

        // enumeratedValue (mandatory array of allowed values)
        if (LIB.isArrayWithContent(enm.enumeratedValue)) {
            const values = enm.enumeratedValue;
            const rdfList = '(\n\t\t' + values.map(n => this.formatTurtleId(n.id)).join('\n\t\t') +'\n\t)';
            ttl += rdf.tab1('owl:anyOf', rdfList, false); // is reference

            // now define the enumerated values themselves as individuals of the enumeration class:
            for (const val of values) {
                ttl += rdf.tab0(this.formatTurtleId(val.id));
                ttl += rdf.tab1('a', this.formatTurtleId(enm.id), false); // is reference
                if (enm.datatype.includes('string')) {
                    // title (multi-language)
                    if (LIB.isArrayWithContent(val.title)) {
                        ttl += rdf.tab1('rdfs:label', val.title, true); // is literal
                    }
                }
                else {
                // ToDo: For non-string datatypes, add a literal value
                // ttl += rdf.tab1('rdfs:label', val.title);
                }
            }
        }
        else {
            // should not happen, as enumeratedValue is mandatory for Enumeration:
            LOG.error(`Enumeration ${enm.id} has no enumeratedValue defined`);
        }

        return ttl + rdf.newLine();
        // No shape for enumerations, as they are never instantiated.
        // The allowed values are defined by the enumeratedValue property.
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

        // Add basic metamodel properties
        ttl += this.xMetadataForClasses(prp, 'owl:DatatypeProperty', 'rdfs:subPropertyOf', rdf, options);

        // defaultValue
        if (prp.defaultValue !== undefined) {
            ttl += rdf.tab1('sh:defaultValue', prp.defaultValue as string | number | boolean, true); // is literal
        }

    /*    // unit
        if (prp.unit) {
            ttl += rdf.tab1('cas:unit', `"${prp.unit}"`);
        } */

        // composes (references to other Properties)
        if (LIB.isArrayWithContent(prp.composes)) {
            const composes = prp.composes as TPigId[];
            ttl += rdf.tab1('cas:composes', this.formatTurtleId(composes[0]), false); // is reference
            for (let i = 1; i < composes.length; i++) {
                ttl += rdf.tab2(this.formatTurtleId(composes[i]), false); // is reference
            }
        }

        // Note: Shape-specific details (maxLength, minCount, maxCount, pattern, 
        // minInclusive, maxInclusive, defaultValue, unit) are omitted here.
        // These will be added to a SHACL shape later.

        ttl += rdf.newLine();

        // Add SHACL shape if requested
        if (options?.addShapes) {
            ttl += this.makePropertyShape(prp, rdf);
            // Note: Property class shape (for validating property class definitions) 
            // is generated once per package, not per property
        }

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
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Add basic metamodel properties
        ttl += this.xMetadataForClasses(lnk, 'owl:ObjectProperty', 'rdfs:subPropertyOf', rdf, options);

    /*  // We would need to look for relationships using this link to determine the domain,
        // but that requires scanning the entire graph.
        // Design decision: We will not add rdfs:domain for links, as it can be inferred from relationships.
        // rdfs:domain - Links can be used by Entity or Relationship instances
        // If the link specializes another link, domain is inherited
        // Otherwise, add explicit domain as union of Entity and Relationship
        if (!lnk.specializes || lnk.specializes === lnk.itemType) {
            // Base link: domain is union of Entity and Relationship
            ttl += rdf.tab1('rdfs:domain', `[ owl:unionOf ( cas:Entity cas:Relationship ) ]`, false); // is reference
        } */

        // rdfs:range based on enumeratedEndpoint (mandatory array of Entity/Relationship URIs)
        if (LIB.isArrayWithContent(lnk.enumeratedEndpoint)) {
            const endpoints = lnk.enumeratedEndpoint as TPigId[];

            if (endpoints.length === 1) {
                // Single endpoint: simple range
                ttl += rdf.tab1('rdfs:range', this.formatTurtleId(endpoints[0]), false); // is reference
            } else {
                // Multiple endpoints: use owl:unionOf
                const endpointList = endpoints.map(ep => this.formatTurtleId(ep)).join(' ');
                ttl += rdf.tab1('rdfs:range', `[ owl:unionOf ( ${endpointList} ) ]`, false); // is reference
            }
        }

        // Note: Shape-specific details (minCount, maxCount) are omitted here.
        // These will be added to a SHACL shape later.

        ttl += rdf.newLine();

        // Add SHACL shape if requested
        if (options?.addShapes) {
            ttl += this.makeLinkShape(lnk, rdf);
        }

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
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Add basic metamodel properties
        ttl += this.xMetadataForClasses(itm, 'owl:Class', 'rdfs:subClassOf', rdf, options);

        // icon (optional)
        if (itm.icon?.value) {
            ttl += rdf.tab1('cas:icon', itm.icon.value, true); // is literal
        }

        ttl += rdf.newLine();

        // Add SHACL shape if requested
        if (options?.addShapes) {
            ttl += this.makeElementShape(itm, rdf);
        }

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
        const rdf = new CToTtl(indent);

        let ttl = '';

        // Add basic metamodel properties
        ttl += this.xMetadataForClasses(rel, 'owl:Class', 'rdfs:subClassOf', rdf, options);

        // icon (optional)
        if (rel.icon?.value) {
            ttl += rdf.tab1('cas:icon', rel.icon.value, true); // is literal
        }

        ttl += rdf.newLine();

        // Add SHACL shape if requested
        if (options?.addShapes) {
            ttl += this.makeElementShape(rel, rdf);
        }

        return ttl;
    }

    /**
     * Transform context from internal INamespace[] format to Turtle @prefix format
     * @param pkg - APackage instance
     * @param rdf - CToTtl instance for building Turtle output
     * @param options - Export options
     * @returns Turtle @prefix declarations
     * 
     * Internal format: context = [{ tag: "cas:", uri: "https://..." }, ...]
     * Turtle format:   @prefix cas: <https://...> .
     */
    private static xContext(pkg: APackage, rdf: CToTtl, options?: IOptionsTTL): string {
        const ctx = pkg.context;

        if (!ctx || !Array.isArray(ctx)) {
            LOG.warn(`APackage ${pkg.id} has no valid context`);
            return '';
        }

        const existingTags = new Set<string>();
        let ttl = '';

        // First pass: collect existing tags and output them
        for (const ns of ctx) {
            // Skip if not a valid object
            if (!ns || typeof ns !== 'object' || Array.isArray(ns)) {
                continue;
            }
            if (!('tag' in ns) || !('uri' in ns)) {
                continue;
            }

            const tag = ns.tag.endsWith(':') ? ns.tag.slice(0, -1) : ns.tag;
            const uri = ns.uri;

            // Ensure tag and uri are strings
            if (typeof tag === 'string' && typeof uri === 'string') {
                existingTags.add(tag);
                ttl += rdf.prefix(tag, uri);
            }
        }

        // Second pass: add any missing required prefixes
        // ... as those are not necessarily needed in other formats, but are required for Turtle
        // Define required prefixes in the context
        const requiredPrefixes = [
            { tag: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' },
            { tag: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
            { tag: 'owl', uri: 'http://www.w3.org/2002/07/owl#' }
        ];
        if (options?.addShapes) {
            requiredPrefixes.push(
                { tag: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
                { tag: 'dash', uri: 'http://datashapes.org/dash#' }
            )
        }
        // LOG.debug('xContext', { existingTags, requiredPrefixes });

        for (const prefix of requiredPrefixes) {
            if (!existingTags.has(prefix.tag)) {
                ttl += rdf.prefix(prefix.tag, prefix.uri);
            }
        }

        ttl += rdf.newLine();
        return ttl;
    }

    private static makeOntologyDefinition(
        pkg: APackage,
        rdf: CToTtl
        // options?: IOptionsTTL
    ): string {
        let ttl = '';

        // Item ID as subject
        const subjectId = this.formatTurtleId(pkg.id + '_ontology');
        ttl += rdf.tab0(subjectId);
        ttl += rdf.tab1('a', 'owl:Ontology', false); // is reference

        // Add configured properties from the package (e.g., dcterms:contributor, dcterms:license)
        if (LIB.isArrayWithContent(pkg.hasProperty)) {
            ttl += this.xProperties(pkg.hasProperty, rdf);
        }

        // Imports (optional) - if the package has contained packages, add them as owl:imports

        ttl += rdf.tab1('owl:versionInfo', DEF.pigVersion, true); // is literal
        ttl += rdf.newLine();
        return ttl;
    }

    /**
     * Transform metadata to Turtle format - common base function for both instances and classes
     * @param itm - Item with Identifiable properties (id, itemType, title, description, etc.)
     * @param rdf - CToTtl instance for building Turtle output
     * Note: instance-/class-specific optional triples (e.g. cas:itemType) are handled by the wrapper methods.
     * @returns Turtle representation of common metadata properties
     */
    private static xMetadata(
        itm: APackage | AnEntity | ARelationship | Property | Link | Entity | Relationship | Enumeration,
        rdf: CToTtl
    ): string {
        let ttl = '';

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            ttl += rdf.tab1('rdfs:label', itm.title, true); // is literal
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            ttl += rdf.tab1('rdfs:comment', itm.description, true); // is literal
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(itm.definition)) {
            ttl += rdf.tab1('skos:definition', itm.definition, true); // is literal
        }

        // revision
        if (itm.revision) {
            ttl += rdf.tab1('cas:revision', itm.revision, true); // subProperty of 'schema:version'
        }

        // priorRevision
        if (LIB.isArrayWithContent(itm.priorRevision)) {
            const priorRevisions = itm.priorRevision as string[];
            ttl += rdf.tab1('cas:priorRevision', priorRevisions[0], true); // is literal
            for (let i = 1; i < priorRevisions.length; i++) {
                ttl += rdf.tab2(priorRevisions[i], true); // is literal
            }
        }

        // modified (ISO date string) - pre-formatted as a typed literal, so passed through as raw
        if (itm.modified) {
            ttl += rdf.tab1('dcterms:modified', `"${itm.modified}"^^xs:dateTime`, false); // is reference
        }

        // creator
        if (itm.creator) {
            ttl += rdf.tab1('dcterms:creator', itm.creator, true); // is literal
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
        ttl += rdf.tab1('a', this.formatTurtleId(itm.hasClass), false); // is reference

        if (options?.addItemTypes) {
            ttl += rdf.tab1('cas:itemType', itm.itemType, true); // is literal
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
        options?: { addItemTypes?: boolean, addExplicitTypeToAllClasses?: boolean }
    ): string {
        // For classes, just use the common metadata (no hasClass)
        let ttl = '';

        if (!rdfSpecialization || !owlClassification) // both are defined or not, but anyways both are checked to satisfy the TS type guard
            throw Error(`xMetadataForClasses: Missing parameter(s) when creating metadata for ${itm.id}`);

        // Item ID as subject
        const subjectId = this.formatTurtleId(itm.id);
        ttl += rdf.tab0(subjectId);
        // OWL classification only if specializes is not defined or if addExplicitTypeToAllClasses is true
        // in case of a context ontology, we want to add the OWL classification, as we are not sure how it is defined
        if (!itm.specializes || LIB.isContextId(itm.specializes) || options?.addExplicitTypeToAllClasses) {
            ttl += rdf.tab1('a', owlClassification, false); // is reference
        }

        // specializes
        if (itm.specializes) {
            const specializesId = this.formatTurtleId(itm.specializes);
            ttl += rdf.tab1(rdfSpecialization, specializesId, false); // is reference
        }

        if (options?.addItemTypes && itm.itemType != itm.id) {
            ttl += rdf.tab1('cas:itemType', itm.itemType, true); // is literal
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
        options?: IOptionsTTL
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

        // Add metamodel class shapes for Property, Link, Enumeration, Entity, and Relationship classes (once per package)
        if (options?.addShapes) {
            ttl += rdf.newLine();
            ttl += rdf.heading('Metamodel Class Shapes');
            ttl += this.makePropertyClassShape(rdf);
            ttl += this.makePropertyShapeShape(rdf);
            ttl += this.makeLinkClassShape(rdf);
            ttl += this.makeLinkShapeShape(rdf);
            ttl += this.makeEnumerationClassShape(rdf);
            ttl += this.makeEnumerationShapeShape(rdf);
            ttl += this.makeEntityClassShape(rdf);
            ttl += this.makeEntityShapeShape(rdf);
            ttl += this.makeRelationshipClassShape(rdf);
            ttl += this.makeRelationshipShapeShape(rdf);
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
     * Properties are always CASCaRA owl:DatatypeProperty terms, so their values are RDF literals -
     * except for a composed property's list of references, which is a raw Turtle list expression.
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
            const firstProp = this.formatPropertyValue(propInstances[0]);
            ttl += rdf.tab1(predicate, firstProp.value, firstProp.literal);

            // Add additional values for the same property (if any)
            for (let i = 1; i < propInstances.length; i++) {
                const nextProp = this.formatPropertyValue(propInstances[i]);
                ttl += rdf.tab2(nextProp.value, nextProp.literal);
            }
        }

        return ttl;
    }

    /**
     * Format a single property value for Turtle output
     * @param prop - AProperty instance
     * @returns Formatted value string together with whether it is an RDF literal (quoted) or a raw reference/list expression (unquoted)
     */
    private static formatPropertyValue(prop: AProperty): { value: string, literal: boolean } {
        // If it has a value, it's a plain DatatypeProperty literal
        if (prop.value !== undefined) {
            return { value: prop.value, literal: true };
        }

        // If it has composes, it's a composed property - format as a list of references (not a literal)
        if (LIB.isArrayWithContent(prop.composes)) {
            const composes = prop.composes as TPigId[];
            const refs = composes.map((id: TPigId) => this.formatTurtleId(id)).join(', ');
            return { value: `( ${refs} )`, literal: false };
        }

        // Default: empty string
        return { value: '', literal: true };
    }

    /**
     * Abstract method to transform link arrays (source or target) to Turtle format
     * Links are always CASCaRA owl:ObjectProperty terms, so their values are references (never quoted)
     * @param links - Array of ASourceLink or ATargetLink instances
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of links
     */
    private static xLinks(links: (ASourceLink | ATargetLink)[], rdf: CToTtl): string {
        let ttl = '';

        // Group links by their hasClass (link type)
        const grouped = new Map<TPigId, (ASourceLink | ATargetLink)[]>();

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
                ttl += rdf.tab1(predicate, this.formatTurtleId(firstLink.idRef), false); // is reference

                // Add additional links for the same link type (if any)
                for (let i = 1; i < linkInstances.length; i++) {
                    if (linkInstances[i].idRef) {
                        ttl += rdf.tab2(this.formatTurtleId(linkInstances[i].idRef), false); // is reference
                    }
                }
            }
        }

        // Note: Do NOT call rdf.newLine() here - let the caller decide when to end the triple
        // This allows adding more predicates after the common metamodel properties
        return ttl;
    }

    /**
     * Generate SHACL PropertyShape for a Property class
     * @param prp - Property instance
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL PropertyShape
     */
    private static makePropertyShape(prp: Property, rdf: CToTtl): string {
        // LOG.debug(`Generating SHACL PropertyShape for property ${JSON.stringify(prp)}`);

        // No shapes for metamodel items, as they should not be instanciated:
        if (prp.itemType == prp.id)
            return '';

        let ttl = '';

        // Create shape ID by appending 'Shape' to the property ID
        const shapeId = this.formatTurtleId(prp.id) + DEF.suffixShape; // for CASCaRA ontology terms
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:PropertyShape', false); // is reference
        ttl += rdf.tab1('sh:path', this.formatTurtleId(prp.id), false); // is reference

        // datatype
        if (prp.datatype) {
            ttl += rdf.tab1('sh:datatype', this.formatTurtleId(prp.datatype), false); // is reference
        }

        // minCount
        if (prp.minCount !== undefined) {
            ttl += rdf.tab1('sh:minCount', prp.minCount, true); // is literal
        }

        // maxCount
        if (prp.maxCount !== undefined) {
            ttl += rdf.tab1('sh:maxCount', prp.maxCount, true); // is literal
        }

        // maxLength
        if (prp.maxLength !== undefined) {
            ttl += rdf.tab1('sh:maxLength', prp.maxLength, true); // is literal
        }

        // pattern (for string datatype)
        if (prp.pattern) {
            ttl += rdf.tab1('sh:pattern', prp.pattern, true); // is literal
        }

        // minInclusive
        if (prp.minInclusive !== undefined) {
            ttl += rdf.tab1('sh:minInclusive', prp.minInclusive, true); // is literal
        }

        // maxInclusive
        if (prp.maxInclusive !== undefined) {
            ttl += rdf.tab1('sh:maxInclusive', prp.maxInclusive, true); // is literal
        }

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape for Property classes in general
     * This shape validates that any Property class follows the CASCaRA metamodel
     * It is generated once per package, not per individual property
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for all Property classes
     */
    private static makePropertyClassShape(rdf: CToTtl): string {
        let ttl = '';

        // Create a single shape ID for all Property classes
        const classShapeId = this.formatTurtleId(PigItemType.Property) + '_class' + DEF.suffixShape;
        ttl += rdf.tab0(classShapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all classes that are subclasses of cas:Property
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subPropertyOf', false); // is reference
        // Also target direct instances of owl:DatatypeProperty in the CASCaRA namespace
        ttl += rdf.tab1('sh:targetClass', 'owl:DatatypeProperty', false); // is reference

        // Close the shape - no additional properties allowed beyond those explicitly defined
        ttl += rdf.tab1('sh:closed', 'true', true); // is literal
        ttl += rdf.tab1('sh:ignoredProperties', '( rdf:type )', false); // is reference

        // Require either rdf:type owl:DatatypeProperty OR rdfs:subPropertyOf or both
        ttl += rdf.tab1('sh:or', '( [ sh:path rdf:type ; sh:hasValue owl:DatatypeProperty ] [ sh:path rdfs:subPropertyOf ; sh:minCount 1 ] )', false); // is reference

        // Required property: rdfs:label (title)
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:label ; sh:minCount 1 ; sh:maxCount 1 ]', false); // is reference

        // Optional properties with constraints
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:comment ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path skos:definition ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:revision ; sh:maxCount 1 ; sh:datatype xs:string ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:priorRevision ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:modified ; sh:maxCount 1 ; sh:datatype xs:dateTime ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:creator ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path sh:defaultValue ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:composes ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:itemType ; sh:maxCount 1 ]', false); // is reference

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape that validates Property classes have a corresponding PropertyShape with datatype
     * This is a separate metamodel validation shape generated once per package
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for PropertyShape requirement
     */
    private static makePropertyShapeShape(rdf: CToTtl): string {
        let ttl = '';

        // Create shape ID for PropertyShape requirement validation
        const shapeId = this.formatTurtleId(PigItemType.Property) + DEF.suffixShape + DEF.suffixShape;
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all Property classes (same targets as the class shape)
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subPropertyOf', false); // is reference
        ttl += rdf.tab1('sh:targetClass', 'owl:DatatypeProperty', false); // is reference

        // Each Property class must have a corresponding PropertyShape with at least sh:datatype
        // Using sh:sparql with FILTER NOT EXISTS to check for the required shape
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Property class must have a corresponding PropertyShape with at least sh:datatype defined" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:PropertyShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:path $this ;`;
        ttl += `\n\t\t\t\t\t\tsh:datatype ?dt .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL PropertyShape for a Link class
     * @param lnk - Link instance
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL PropertyShape
     */
    private static makeLinkShape(lnk: Link, rdf: CToTtl): string {
        // LOG.debug(`Generating SHACL PropertyShape for link ${JSON.stringify(lnk)}`);

        // No shapes for metamodel items, as they should not be instantiated:
        if (lnk.itemType == lnk.id)
            return '';

        let ttl = '';

        // Create shape ID by appending 'Shape' to the link ID
        const shapeId = this.formatTurtleId(lnk.id) + DEF.suffixShape; // for CASCaRA ontology terms
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:PropertyShape', false); // is reference
        ttl += rdf.tab1('sh:path', this.formatTurtleId(lnk.id), false); // is reference

        // sh:class or sh:or based on enumeratedEndpoint
        if (LIB.isArrayWithContent(lnk.enumeratedEndpoint)) {
            const endpoints = lnk.enumeratedEndpoint as TPigId[];

            if (endpoints.length === 1) {
                // Single endpoint: use sh:class
                ttl += rdf.tab1('sh:class', this.formatTurtleId(endpoints[0]), false); // is reference
            } else {
                // Multiple endpoints: use sh:or with sh:class for each
                const classConstraints = endpoints
                    .map(ep => `[ sh:class ${this.formatTurtleId(ep)} ]`)
                    .join(' ');
                ttl += rdf.tab1('sh:or', `( ${classConstraints} )`, false); // is reference
            }
        }

        if (lnk.minCount !== undefined)
            ttl += rdf.tab1('sh:minCount', lnk.minCount, true); // is literal
        if (lnk.maxCount !== undefined)
            ttl += rdf.tab1('sh:maxCount', lnk.maxCount, true); // is literal

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape for Link classes in general
     * This shape validates that any Link class follows the CASCaRA metamodel
     * It is generated once per package, not per individual link
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for all Link classes
     */
    private static makeLinkClassShape(rdf: CToTtl): string {
        let ttl = '';

        // Create a single shape ID for all Link classes
        const classShapeId = this.formatTurtleId(PigItemType.Link) + '_class' + DEF.suffixShape;
        ttl += rdf.tab0(classShapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all classes that are subclasses of cas:Link
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subPropertyOf', false); // is reference
        // Also target direct instances of owl:ObjectProperty in the CASCaDE namespace
        ttl += rdf.tab1('sh:targetClass', 'owl:ObjectProperty', false); // is reference

        // Close the shape - no additional properties allowed beyond those explicitly defined
        ttl += rdf.tab1('sh:closed', 'true', true); // is literal
        ttl += rdf.tab1('sh:ignoredProperties', '( rdf:type )', false); // is reference

        // Require either rdf:type owl:ObjectProperty OR rdfs:subPropertyOf (or both)
        ttl += rdf.tab1('sh:or', '( [ sh:path rdf:type ; sh:hasValue owl:ObjectProperty ] [ sh:path rdfs:subPropertyOf ; sh:minCount 1 ] )', false); // is reference

        // Required property: rdfs:label (title)
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:label ; sh:minCount 1 ; sh:maxCount 1 ]', false); // is reference

        // Required property: rdfs:range (from enumeratedEndpoint)
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:range ; sh:minCount 1 ]', false); // is reference

        // Optional properties with constraints
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:comment ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path skos:definition ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:revision ; sh:maxCount 1 ; sh:datatype xs:string ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:priorRevision ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:modified ; sh:maxCount 1 ; sh:datatype xs:dateTime ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:creator ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:itemType ; sh:maxCount 1 ]', false); // is reference

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape that validates Link classes have a corresponding PropertyShape with class constraint
     * This is a separate metamodel validation shape generated once per package
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for PropertyShape requirement
     */
    private static makeLinkShapeShape(rdf: CToTtl): string {
        let ttl = '';

        // Create shape ID for PropertyShape requirement validation
        const shapeId = this.formatTurtleId(PigItemType.Link) + '_shape_requirement' + DEF.suffixShape;
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all Link classes (same targets as the class shape)
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subPropertyOf', false); // is reference
        ttl += rdf.tab1('sh:targetClass', 'owl:ObjectProperty', false); // is reference

        // Each Link class must have a corresponding PropertyShape with at least sh:class or sh:or
        // Using sh:sparql with FILTER NOT EXISTS to check for the required shape
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Link class must have a corresponding PropertyShape with at least sh:class or sh:or constraint defined" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:PropertyShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:path $this .`;
        ttl += `\n\t\t\t\t\tFILTER ( EXISTS { ?shape sh:class ?c } || EXISTS { ?shape sh:or ?o } )`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape for Entity or Relationship classes
     * Determines the type by checking for enumeratedSourceLink existence:
     * - Relationship MUST have enumeratedSourceLink
     * - Entity does NOT have enumeratedSourceLink
     * @param elem - Entity or Relationship instance
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape
     */
    private static makeElementShape(elem: Entity | Relationship, rdf: CToTtl): string {
        // LOG.debug(`Generating SHACL NodeShape for element ${JSON.stringify(elem)}`);

        // No shapes for metamodel items, as they should not be instantiated:
        if (elem.itemType == elem.id)
            return '';

        // Determine if this is a Relationship by checking for enumeratedSourceLink
        const isRelationship = 'enumeratedSourceLink' in elem && elem.enumeratedSourceLink !== undefined;

        let ttl = '';

        // Local helper function to add property constraints
        const addPropertyConstraints = (itemIds: TPigId[]): void => {
            for (const itemId of itemIds) {
                // Check if item belongs to an external/context ontology
                if (LIB.isContextId(itemId) || LIB.isHostedOntologyId(itemId)) {
                    // Create inline property constraint for external ontology items
                    const itemPath = this.formatTurtleId(itemId);
                    ttl += rdf.tab1('sh:property', `[ sh:path ${itemPath} ]`, false); // is reference
                } else {
                    // Reference the item's shape (which should be defined separately) for CASCaRA items
                    const itemShapeId = this.formatTurtleId(itemId) + DEF.suffixShape;
                    ttl += rdf.tab1('sh:property', itemShapeId, false); // is reference
                }
            }
        };

        // Create shape ID by appending 'Shape' to the element ID
        const elemId = this.formatTurtleId(elem.id);
        const shapeId = elemId + DEF.suffixShape; // for CASCaRA ontology terms
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        ttl += rdf.tab1('sh:targetClass', elemId, false); // is reference

        // For entity instances: require either rdfs:label or rdfs:comment
        // For relationship instances: both are optional
        if (!isRelationship) {
            ttl += rdf.tab1('sh:or', '( [ sh:path rdfs:label ; sh:minCount 1 ] [ sh:path rdfs:comment ; sh:minCount 1 ] )', false); // is reference
        }

        // List enumerated properties
        // In case of a package class, we skip enumeratedProperty constraints, as configurable properties will be appended to the ontology
        if (LIB.isArrayWithContent(elem.enumeratedProperty) && elemId != 'cas:Package') {
            addPropertyConstraints(elem.enumeratedProperty as TPigId[]);
        }

        // List enumerated source links - only for Relationship
        if (isRelationship && LIB.isArrayWithContent(elem.enumeratedSourceLink)) {
            addPropertyConstraints(elem.enumeratedSourceLink as TPigId[]);
        }

        // List enumerated target links - both Entity and Relationship can have these
        if (LIB.isArrayWithContent(elem.enumeratedTargetLink)) {
            addPropertyConstraints(elem.enumeratedTargetLink as TPigId[]);
        }

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape for Enumeration classes in general
     * This shape validates that any Enumeration class follows the CASCaRA metamodel
     * It is generated once per package, not per individual enumeration
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for all Enumeration classes
     */
    private static makeEnumerationClassShape(rdf: CToTtl): string {
        let ttl = '';

        // Create a single shape ID for all Enumeration classes
        const classShapeId = this.formatTurtleId(PigItemType.Enumeration) + '_class' + DEF.suffixShape;
        ttl += rdf.tab0(classShapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all classes that are subclasses of cas:Enumeration
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subClassOf', false); // is reference
        // Also target direct instances of owl:Class in the CASCaDE namespace
        ttl += rdf.tab1('sh:targetClass', 'owl:Class', false); // is reference

        // Close the shape - no additional properties allowed beyond those explicitly defined
        ttl += rdf.tab1('sh:closed', 'true', true); // is literal
        ttl += rdf.tab1('sh:ignoredProperties', '( rdf:type )', false); // is reference

        // Require either rdf:type owl:Class OR rdfs:subClassOf (or both)
        ttl += rdf.tab1('sh:or', '( [ sh:path rdf:type ; sh:hasValue owl:Class ] [ sh:path rdfs:subClassOf ; sh:minCount 1 ] )', false); // is reference

        // Required property: rdfs:label (title)
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:label ; sh:minCount 1 ; sh:maxCount 1 ]', false); // is reference

        // Required property: cas:enumeratedValue (array of allowed values)
        ttl += rdf.tab1('sh:property', '[ sh:path cas:enumeratedValue ; sh:minCount 1 ]', false); // is reference

        // Optional properties with constraints
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:comment ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path skos:definition ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:revision ; sh:maxCount 1 ; sh:datatype xs:string ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:priorRevision ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:modified ; sh:maxCount 1 ; sh:datatype xs:dateTime ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:creator ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:itemType ; sh:maxCount 1 ]', false); // is reference

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape that validates Enumeration classes have proper enumerated values
     * This is a separate metamodel validation shape generated once per package
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for enumerated value validation
     */
    private static makeEnumerationShapeShape(rdf: CToTtl): string {
        let ttl = '';

        // Create shape ID for enumerated value validation
        const shapeId = this.formatTurtleId(PigItemType.Enumeration) + '_shape' + DEF.suffixShape;
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all Enumeration classes (same targets as the class shape)
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subClassOf', false); // is reference
        ttl += rdf.tab1('sh:targetClass', 'owl:Class', false); // is reference

        // Each Enumeration class must have at least one enumerated value defined
        // Using sh:sparql to validate that cas:enumeratedValue points to valid resources
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Enumeration class must have at least one valid enumeratedValue" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t$this cas:enumeratedValue ?value .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape for Entity classes in general
     * This shape validates that any Entity class follows the CASCaRA metamodel
     * It is generated once per package, not per individual entity
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for all Entity classes
     */
    private static makeEntityClassShape(rdf: CToTtl): string {
        let ttl = '';

        // Create a single shape ID for all Entity classes
        const classShapeId = this.formatTurtleId(PigItemType.Entity) + '_class' + DEF.suffixShape;
        ttl += rdf.tab0(classShapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all classes that are subclasses of cas:Entity
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subClassOf', false); // is reference
        // Also target direct instances of owl:Class that are Entities in the CASCaDE namespace
        ttl += rdf.tab1('sh:targetClass', 'cas:Entity', false); // is reference

        // Close the shape - no additional properties allowed beyond those explicitly defined
        ttl += rdf.tab1('sh:closed', 'true', true); // is literal
        ttl += rdf.tab1('sh:ignoredProperties', '( rdf:type )', false); // is reference

        // Require either rdf:type owl:Class OR rdfs:subClassOf (or both)
        ttl += rdf.tab1('sh:or', '( [ sh:path rdf:type ; sh:hasValue owl:Class ] [ sh:path rdfs:subClassOf ; sh:minCount 1 ] )', false); // is reference

        // Required property: rdfs:label (title)
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:label ; sh:minCount 1 ; sh:maxCount 1 ]', false); // is reference

        // Optional properties with constraints
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:comment ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path skos:definition ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:revision ; sh:maxCount 1 ; sh:datatype xs:string ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:priorRevision ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:modified ; sh:maxCount 1 ; sh:datatype xs:dateTime ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:creator ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:icon ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:itemType ; sh:maxCount 1 ]', false); // is reference

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape that validates Entity classes have proper NodeShapes
     * This is a separate metamodel validation shape generated once per package
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for Entity shape validation
     */
    private static makeEntityShapeShape(rdf: CToTtl): string {
        let ttl = '';

        // Create shape ID for Entity shape validation
        const shapeId = this.formatTurtleId(PigItemType.Entity) + '_shape' + DEF.suffixShape;
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all Entity classes (same targets as the class shape)
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subClassOf', false); // is reference
        ttl += rdf.tab1('sh:targetClass', 'cas:Entity', false); // is reference

        // Each Entity class should have a corresponding NodeShape
        // Using sh:sparql to validate that a NodeShape with sh:targetClass pointing to this entity exists
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Entity class should have a corresponding NodeShape with sh:targetClass constraint" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        // Validate that the entity's shape has sh:property for each enumeratedProperty
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Entity shape should have sh:property for each enumeratedProperty defined in the class" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this ?prop`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\t$this cas:enumeratedProperty ?prop .`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this ;`;
        ttl += `\n\t\t\t\t\t\tsh:property ?propShape .`;
        ttl += `\n\t\t\t\t\t?propShape sh:path ?prop .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        // Validate that the entity's shape has sh:property for each enumeratedTargetLink
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Entity shape should have sh:property for each enumeratedTargetLink defined in the class" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this ?link`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\t$this cas:enumeratedTargetLink ?link .`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this ;`;
        ttl += `\n\t\t\t\t\t\tsh:property ?linkShape .`;
        ttl += `\n\t\t\t\t\t?linkShape sh:path ?link .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape for Relationship classes in general
     * This shape validates that any Relationship class follows the CASCaRA metamodel
     * It is generated once per package, not per individual relationship
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for all Relationship classes
     */
    private static makeRelationshipClassShape(rdf: CToTtl): string {
        let ttl = '';

        // Create a single shape ID for all Relationship classes
        const classShapeId = this.formatTurtleId(PigItemType.Relationship) + '_class' + DEF.suffixShape;
        ttl += rdf.tab0(classShapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all classes that are subclasses of cas:Relationship
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subClassOf', false); // is reference
        // Also target direct instances of owl:Class that are Relationships in the CASCaDE namespace
        ttl += rdf.tab1('sh:targetClass', 'cas:Relationship', false); // is reference

        // Close the shape - no additional properties allowed beyond those explicitly defined
        ttl += rdf.tab1('sh:closed', 'true', true); // is literal
        ttl += rdf.tab1('sh:ignoredProperties', '( rdf:type )', false); // is reference

        // Require either rdf:type owl:Class OR rdfs:subClassOf (or both)
        ttl += rdf.tab1('sh:or', '( [ sh:path rdf:type ; sh:hasValue owl:Class ] [ sh:path rdfs:subClassOf ; sh:minCount 1 ] )', false); // is reference

        // Required property: rdfs:label (title)
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:label ; sh:minCount 1 ; sh:maxCount 1 ]', false); // is reference

        // Optional properties with constraints
        ttl += rdf.tab1('sh:property', '[ sh:path rdfs:comment ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path skos:definition ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:revision ; sh:maxCount 1 ; sh:datatype xs:string ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:priorRevision ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:modified ; sh:maxCount 1 ; sh:datatype xs:dateTime ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path dcterms:creator ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:icon ; sh:maxCount 1 ]', false); // is reference
        ttl += rdf.tab1('sh:property', '[ sh:path cas:itemType ; sh:maxCount 1 ]', false); // is reference

        return ttl + rdf.newLine();
    }

    /**
     * Generate SHACL NodeShape that validates Relationship classes have proper NodeShapes
     * This is a separate metamodel validation shape generated once per package
     * @param rdf - CToTtl instance for building Turtle output
     * @returns Turtle representation of SHACL NodeShape for Relationship shape validation
     */
    private static makeRelationshipShapeShape(rdf: CToTtl): string {
        let ttl = '';

        // Create shape ID for Relationship shape validation
        const shapeId = this.formatTurtleId(PigItemType.Relationship) + '_shape' + DEF.suffixShape;
        ttl += rdf.tab0(shapeId);
        ttl += rdf.tab1('a', 'sh:NodeShape', false); // is reference
        // Target all Relationship classes (same targets as the class shape)
        ttl += rdf.tab1('sh:targetSubjectsOf', 'rdfs:subClassOf', false); // is reference
        ttl += rdf.tab1('sh:targetClass', 'cas:Relationship', false); // is reference

        // Each Relationship class should have a corresponding NodeShape
        // Using sh:sparql to validate that a NodeShape with sh:targetClass pointing to this relationship exists
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Relationship class should have a corresponding NodeShape with sh:targetClass constraint" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        // Validate that the relationship's shape has sh:property for each enumeratedProperty
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Relationship shape should have sh:property for each enumeratedProperty defined in the class" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this ?prop`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\t$this cas:enumeratedProperty ?prop .`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this ;`;
        ttl += `\n\t\t\t\t\t\tsh:property ?propShape .`;
        ttl += `\n\t\t\t\t\t?propShape sh:path ?prop .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        // Validate that the relationship's shape has sh:property for each enumeratedSourceLink
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Relationship shape should have sh:property for each enumeratedSourceLink defined in the class" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this ?link`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\t$this cas:enumeratedSourceLink ?link .`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this ;`;
        ttl += `\n\t\t\t\t\t\tsh:property ?linkShape .`;
        ttl += `\n\t\t\t\t\t?linkShape sh:path ?link .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        // Validate that the relationship's shape has sh:property for each enumeratedTargetLink
        ttl += ` ;\n\tsh:sparql [`;
        ttl += `\n\t\tsh:message "Relationship shape should have sh:property for each enumeratedTargetLink defined in the class" ;`;
        ttl += `\n\t\tsh:select """`;
        ttl += `\n\t\t\tSELECT $this ?link`;
        ttl += `\n\t\t\tWHERE {`;
        ttl += `\n\t\t\t\t$this cas:enumeratedTargetLink ?link .`;
        ttl += `\n\t\t\t\tFILTER NOT EXISTS {`;
        ttl += `\n\t\t\t\t\t?shape a sh:NodeShape ;`;
        ttl += `\n\t\t\t\t\t\tsh:targetClass $this ;`;
        ttl += `\n\t\t\t\t\t\tsh:property ?linkShape .`;
        ttl += `\n\t\t\t\t\t?linkShape sh:path ?link .`;
        ttl += `\n\t\t\t\t}`;
        ttl += `\n\t\t\t}`;
        ttl += `\n\t\t"""`;
        ttl += `\n\t]`;

        return ttl + rdf.newLine();
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
 * ttl += rdf.tab1('rdf:type', 'ex:Class', false); // is reference
 * ttl += rdf.tab1('rdfs:label', 'Example', false); // is reference
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
     * @param literal - Whether the object is a literal value (quoted, incl. numbers/booleans) or a reference/raw Turtle expression (never quoted).
     *                  Must be determined by the caller from context (e.g. DatatypeProperty vs. ObjectProperty), not guessed from the value's shape.
     * @returns Formatted predicate-object line(s)
     */
    tab1(predicate: string, object: undefined | number | boolean | string | ILanguageText[], literal: boolean): string {
        if (this.lastTab < 0) {
            throw new Error("CToTtl: Subject is missing");
        }
        if (object !== undefined) { // object may be 0 or false
            const ending = this.lastTab < 1 ? "" : " ;";
            this.lastTab = 1;
            return this.makeLines(ending + `\n${this.indent}${predicate} `, object, literal);
        }
        return "";
    }

    /**
     * Add an additional object to the current predicate (object list)
     * @param object - Object value (scalar or ILanguageText array)
     * @param literal - Whether the object is a literal value (quoted, incl. numbers/booleans) or a reference/raw Turtle expression (never quoted).
     *                  Must be determined by the caller from context, not guessed from the value's shape.
     * @returns Formatted object line(s)
     */
    tab2(object: undefined | number | boolean | string | ILanguageText[], literal: boolean): string {
        if (this.lastTab < 1) {
            throw new Error("CToTtl: Predicate is missing");
        }
        if (object !== undefined) { // object may be 0 or false
            const ending = " ,";
            this.lastTab = 2;
            return this.makeLines(ending + `\n${this.indent}${this.indent}`, object, literal);
        }
        return "";
    }

    /**
     * Format object value(s) with proper quoting and language tags
     * @param pred - Prefix string (includes predicate for first value, or just indentation)
     * @param object - Object value(s) to format
     * @param literal - Whether to render the value as a quoted literal (also for numbers/booleans) or as an unquoted reference/raw expression
     * @returns Formatted object string(s)
     */
    private makeLines(pred: string, object: undefined | number | boolean | string | ILanguageText[], literal: boolean): string {
        switch (typeof object) {
            case 'undefined':
                return "";

            case 'number':
            case 'boolean':
                return literal ? pred + `"${object.toString()}"` : pred + object.toString();

            case 'string':
                return this.formatStringObject(pred, object, literal);

            default:
                return this.formatArrayObject(pred, object, literal);
        }
    }

    /**
     * Format a string object with proper quoting
     * @param pred - Prefix string
     * @param str - String value
     * @param literal - When true, quote and escape the value as an RDF literal; when false, output as-is (reference/raw Turtle expression)
     * @returns Formatted string
     */
    private formatStringObject(pred: string, str: string, literal: boolean): string {
        if (str.length === 0) return "";

        if (!literal) {
            return pred + str;
        }
        return pred + `"${this.escapeTtl(str)}"`;
    }

    /**
     * Format an array of objects (ILanguageText[] or scalar array)
     * @param pred - Prefix string
     * @param object - Array of values
     * @param literal - When true, quote scalar values as RDF literals (multi-language text is always quoted regardless)
     * @returns Formatted string with all values
     */
    private formatArrayObject(pred: string, object: ILanguageText[], literal: boolean): string {
        if (!LIB.isArrayWithContent(object)) {
            LOG.error("CToTtl: Expecting an array with items but got:", object);
            return "";
        }

        if (PigItem.isMultiLanguageText(object)) {
            return this.formatMultiLanguageText(pred, object);
        }
        return this.formatScalarArray(pred, object, literal);
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

            const languageTag = l ? `@${l}` : '';
            return pred + `"${this.escapeTtl(t)}"` + languageTag;
        }

        // Multiple language versions must have language tags
        let str = "";
        texts.forEach((v, i) => {
            if (!v.lang) {
                LOG.error("[CToTtl] Multi-language text must have a language specified for each value:", v);
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
     * @param literal - When true, quote and escape each value as an RDF literal; when false, output each value as-is
     * @returns Formatted scalar array
     */
    private formatScalarArray(pred: string, values: any[], literal: boolean): string {
        let str = '';
        values.forEach((v, i) => {
            // Validate it's not an ILanguageText object
            if (typeof v === 'object' && v !== null && ('value' in v || 'lang' in v)) {
                LOG.error("CToTtl: Expected scalar value but got ILanguageText object:", v);
                return;
            }

            const scalarValue = String(v);
            const prefix = i === 0 ? pred : ` ,\n${this.indent}${this.indent}`;

            if (!literal) {
                str += prefix + scalarValue;
            } else {
                str += prefix + `"${this.escapeTtl(scalarValue)}"`;
            }
        });
        return str;
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
