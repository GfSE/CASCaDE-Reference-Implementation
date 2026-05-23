/*!
 * CASCaDE Reference Implementation – JSON-LD Export Helpers
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaDE Reference Implementation – JSON-LD Export Helpers
 * ---------------------------------------------------------
 * Authors: oskar.dungern@gfse.org
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * This module provides central JSON-LD helpers for the PIG metamodel classes.
 * For each supported type (APackage, AnEntity, ARelationship, and metamodel classes),
 * the static class `GetJSONLD` offers methods that generate JSON-LD representations
 * of the respective instances.
 *
 * - Always returns valid JSON-LD objects (JsonObject).
 * - Error and status information is included in the output where appropriate.
 * - The logic is decoupled from the metamodel classes.
 *
 * Usage:
 *   import { getJSONLD } from './getJSONLD';
 *   const jsonld = getJSONLD(item, options);
 *
 * Design Decisions:
 * - Combine all JSON-LD export logic in a single module for better maintainability.
 * - Use a class with static methods for better organization and extensibility.
 * - In earlier versions there were individual methods getJSONLD for each itemType in the metaclasses.
 *   These have been calling internal protected methods.
 *   This module provides a centralized way to access JSON-LD export functionality.
 * - For creating a JSON-LD representation call getJSONLD(item, options) instead of item.getJSONLD().
 *
 * ToDo:
 * - relocate the transformations to JSON-LD from pig-metaclasses to here
 */

import { 
    PigItemType, 
    PigItemTypeValue, 
    AnEntity, 
    APackage, 
    ARelationship,
    Entity,
    Relationship,
    Property,
    Link,
    Enumeration,
    TPigAnElement,
    TPigClass,
    TPigItem
} from '../../schema/pig/ts/pig-metaclasses';
import { JsonObject } from '../../lib/helpers';

export interface IOptionsJSONLD {
    /** Stringify the output (default: false, returns JsonObject) */
    stringify?: boolean;
    /** Indentation for stringified output (default: 4) */
    indent?: number;
    /** Filter which item types to include in package graph (default: all) */
    itemType?: PigItemTypeValue[];
}

/**
 * Generic JSON-LD export function that dispatches to the appropriate method based on itemType
 * @param item - Any PIG item (APackage, AnEntity, ARelationship, or metamodel classes)
 * @param options - JSON-LD export options
 * @returns JSON-LD representation as JsonObject or string
 * 
 * @example
 * import { getJSONLD } from './getJSONLD';
 * const jsonld = getJSONLD(item, { stringify: true });
 */
export function getJSONLD(item: TPigItem, options?: IOptionsJSONLD): JsonObject | string {
    let result: JsonObject;

    switch (item.itemType) {
        // Instances/Individuals
        case PigItemType.aPackage:
            result = GetJSONLD.aPackage(item as APackage, options);
            break;
        case PigItemType.anEntity:
            result = GetJSONLD.anEntity(item as AnEntity, options);
            break;
        case PigItemType.aRelationship:
            result = GetJSONLD.aRelationship(item as ARelationship, options);
            break;

        // Metamodel Classes
        case PigItemType.Enumeration:
            result = GetJSONLD.enumeration(item as Enumeration, options);
            break;
        case PigItemType.Property:
            result = GetJSONLD.property(item as Property, options);
            break;
        case PigItemType.Link:
            result = GetJSONLD.link(item as Link, options);
            break;
        case PigItemType.Entity:
            result = GetJSONLD.entity(item as Entity, options);
            break;
        case PigItemType.Relationship:
            result = GetJSONLD.relationship(item as Relationship, options);
            break;

        default:
            result = {
                '@id': (item as any).id || 'unknown',
                'cas:itemType': item.itemType,
                'error': `No JSON-LD representation implemented for itemType: ${item.itemType}`
            };
    }

    // Stringify if requested
    if (options?.stringify) {
        const indent = options.indent ?? 2;
        return JSON.stringify(result, null, indent);
    }

    return result;
}

/**
 * Static class containing JSON-LD export methods for all PIG types
 */
class GetJSONLD {
    /**
     * Export APackage to JSON-LD format
     * @param pkg - APackage instance
     * @param options - Export options
     * @returns JSON-LD representation with @context and @graph
     */
    static aPackage(pkg: APackage, options?: IOptionsJSONLD): JsonObject {
        const filterTypes = options?.itemType;

        // Get the base JSON-LD from the instance
        // We need to call the protected method through type assertion
        const baseJSONLD = (pkg as any).getJSONLD() as JsonObject;

        // Filter graph items if itemType filter is specified
        if (filterTypes && Array.isArray(baseJSONLD['@graph'])) {
            const graph = baseJSONLD['@graph'] as JsonObject[];
            baseJSONLD['@graph'] = graph.filter((item: JsonObject) => {
                const itemType = item['cas:itemType'] || item['@type'];
                return filterTypes.includes(itemType as PigItemTypeValue);
            });
        }

        return baseJSONLD;
    }

    /**
     * Export AnEntity to JSON-LD format
     * @param entity - AnEntity instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static anEntity(entity: AnEntity, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (entity as any).getJSONLD() as JsonObject;

        return jsonld;
    }

    /**
     * Export ARelationship to JSON-LD format
     * @param rel - ARelationship instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static aRelationship(rel: ARelationship, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (rel as any).getJSONLD() as JsonObject;

        return jsonld;
    }

    /**
     * Export Enumeration (metamodel class) to JSON-LD format
     * @param enumeration - Enumeration instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static enumeration(enumeration: Enumeration, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (enumeration as any).getJSONLD() as JsonObject;

        return jsonld;
    }

    /**
     * Export Property (metamodel class) to JSON-LD format
     * @param property - Property instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static property(property: Property, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (property as any).getJSONLD() as JsonObject;

        return jsonld;
    }

    /**
     * Export Link (metamodel class) to JSON-LD format
     * @param link - Link instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static link(link: Link, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (link as any).getJSONLD() as JsonObject;

        return jsonld;
    }

    /**
     * Export Entity (metamodel class) to JSON-LD format
     * @param entity - Entity instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static entity(entity: Entity, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (entity as any).getJSONLD() as JsonObject;

        return jsonld;
    }

    /**
     * Export Relationship (metamodel class) to JSON-LD format
     * @param relationship - Relationship instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static relationship(relationship: Relationship, options?: IOptionsJSONLD): JsonObject {
        // Get the JSON-LD from the instance
        const jsonld = (relationship as any).getJSONLD() as JsonObject;

        return jsonld;
    }
}
