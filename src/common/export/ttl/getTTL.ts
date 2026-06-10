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

import { DEF } from '../../lib/definitions';
import { LIB, LOG } from '../../lib/helpers';
import {
    TPigId, TPigItem, PigItem, PigItemType, PigItemTypeValue, 
    AnEntity, APackage, ARelationship,
    Entity, Relationship, Property, Link, Enumeration
} from '../../schema/pig/ts/pig-metaclasses';

export interface IOptionsTTL {
    /** Include prefixes in output (default: true for APackage, false for individual items) */
    includePrefixes?: boolean;
    /** Indentation string (default: '\t' for tabs) */
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

        let ttl = '';

        // Add prefixes
        ttl += this.xContextToTTL(pkg);
        ttl += '\n';

        // Add project metadata section
        ttl += this.xPackageMetadataToTTL(pkg, indent);
        ttl += '\n';

        // Add graph items
        ttl += this.xGraphToTTL(pkg, filterTypes, indent);

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
     * @returns Turtle @prefix declarations
     * 
     * Internal format: context = [{ tag: "cas:", uri: "https://..." }, ...]
     * Turtle format:   @prefix cas: <https://...> .
     */
    private static xContextToTTL(pkg: APackage): string {
        const ctx = pkg.context;

        if (!ctx || !Array.isArray(ctx)) {
            LOG.warn(`APackage ${pkg.id} has no valid context`);
            return '';
        }

        let ttl = '';

        // Add standard prefixes that are commonly needed
        const standardPrefixes = [
            '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
            '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
            '@prefix skos: <https://www.w3.org/TR/skos-reference/> .',
            '@prefix owl: <http://www.w3.org/2002/07/owl#> .',
            '@prefix sh: <http://www.w3.org/ns/shacl#> .',
            '@prefix xs: <http://www.w3.org/2001/XMLSchema#> .',
            '@prefix dcterms: <http://purl.org/dc/terms/> .',
            '@prefix schema: <http://schema.org/> .'
        ];

        ttl += standardPrefixes.join('\n') + '\n';

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
                // Remove trailing colon from tag for prefix name
                const prefixName = tag.endsWith(':') ? tag.slice(0, -1) : tag;
                ttl += `@prefix ${prefixName}: <${uri}> .\n`;
            }
        }

        return ttl;
    }

    /**
     * Transform package metadata to Turtle format
     * @param pkg - APackage instance
     * @param indent - Indentation string
     * @returns Turtle representation of package metadata
     */
    private static xPackageMetadataToTTL(pkg: APackage, indent: string): string {
        let ttl = '';

        ttl += '#################################################################\n';
        ttl += '# Project Metadata\n';
        ttl += '#################################################################\n\n';

        // TODO: Add actual metadata transformation
        ttl += `# TODO: Implement package metadata transformation for: ${pkg.id}\n`;

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
        indent: string
    ): string {
        const graph = pkg.graph;

        if (!graph || !Array.isArray(graph) || graph.length === 0) {
            return '';
        }

        let ttl = '';
        ttl += '#################################################################\n';
        ttl += '# Graph Items\n';
        ttl += '#################################################################\n\n';

        // Filter graph items if specified
        const items = filterTypes
            ? graph.filter(item => filterTypes.includes(item.itemType))
            : graph;

        // Transform each graph item to Turtle
        for (const item of items) {
            ttl += getTTL(item, { includePrefixes: false, indent });
            ttl += '\n';
        }

        return ttl;
    }

    /**
     * Escape a string for use in Turtle literals
     * @param str - String to escape
     * @returns Escaped string
     */
    private static escapeTurtleString(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
    }

    /**
     * Format a value for Turtle output
     * @param value - Value to format
     * @param datatype - Optional XSD datatype
     * @returns Formatted Turtle value
     */
    private static formatTurtleValue(value: any, datatype?: string): string {
        if (value === null || value === undefined) {
            return '""';
        }

        if (typeof value === 'string') {
            const escaped = this.escapeTurtleString(value);
            if (datatype) {
                return `"${escaped}"^^xs:${datatype}`;
            }
            return `"${escaped}"`;
        }

        if (typeof value === 'number') {
            return value.toString();
        }

        if (typeof value === 'boolean') {
            return value.toString();
        }

        // Default: stringify as JSON and escape
        const escaped = this.escapeTurtleString(JSON.stringify(value));
        return `"${escaped}"`;
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
