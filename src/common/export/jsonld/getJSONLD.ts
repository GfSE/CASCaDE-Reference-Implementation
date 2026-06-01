/*!
 * CASCaDE Reference Implementation – native to JSON-LD Transformation
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaDE Reference Implementation – native to JSON-LD Transformation
 * -------------------------------------------------------------------
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
 */

import { DEF } from '../../lib/definitions';
import { JsonObject, JsonValue, JsonArray, LIB, LOG } from '../../lib/helpers';
import { MVF } from '../../lib/mvf';
import {
    TPigId, TPigItem, PigItem, PigItemType, PigItemTypeValue, 
    AnEntity, APackage, ARelationship,
    Entity, Relationship,Property, Link, Enumeration
} from '../../schema/pig/ts/pig-metaclasses';

export interface IOptionsJSONLD {
    /** Stringify the output (default: false, returns JsonObject) */
    stringify?: boolean;
    /** Indentation for stringified output (default: 2) */
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
        return JSON.stringify(result, null, options?.indent ?? 2);
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

        const jld = this.getAsJSONLD(pkg, options);

        jld['@context'] = xContextToJSONLD(pkg);
        jld['@graph'] = xGraphToJSONLD(pkg);

    /*  ... coded by Copilot, but not yet tested:
        // Filter graph items if itemType filter is specified
        if (filterTypes && Array.isArray(jld['@graph'])) {
            const graph = jld['@graph'] as JsonObject[];
            jld['@graph'] = graph.filter((item: JsonObject) => {
                const itemTypeValue = item['cas:itemType'] || item['@type'];
                const itemType =
                    typeof itemTypeValue === 'string'
                        ? itemTypeValue as PigItemTypeValue
                        : itemTypeValue &&
                            typeof itemTypeValue === 'object' &&
                            typeof (itemTypeValue as JsonObject)['@id'] === 'string'
                            ? ((itemTypeValue as JsonObject)['@id'] as PigItemTypeValue)
                            : undefined;
                return itemType !== undefined && filterTypes.includes(itemType);
            });
        }
    */
        return this.sortJsonLdKeys(jld);

        /**
         * Transform context from internal INamespace[] format to JSON-LD @context format
         * @param pkg - APackage instance
         * @returns JSON-LD object with '@context' property in JSON-LD format
         * 
         * Internal format: @context = [{ tag: "cas:", uri: "https://..." }, ...]
         * JSON-LD format:  @context = { "cas": "https://...", ... }
         */
        function xContextToJSONLD(pkg: APackage): JsonObject {
            const ctx = pkg.context;

            if (!ctx || !Array.isArray(ctx)) {
                // Context is already in JSON-LD format (object or string) or doesn't exist
                LOG.warn(`APackage ${pkg.id} has no valid context`);
                return {};
            }

            // Transform INamespace[] to JSON-LD @context object
            const contextObj: Record<string, string> = {};

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
                    // Remove trailing colon from tag for JSON-LD format
                    const key = tag.endsWith(':') ? tag.slice(0, -1) : tag;
                    contextObj[key] = uri;
                }
            }

            return contextObj;
        }

        /**
         * Transform graph items to JSON-LD format
         * @param pkg - APackage instance
         * @returns Array of JSON-LD items
         */
        function xGraphToJSONLD(pkg: APackage): JsonObject[] {
            const graph = pkg.graph;

            if (!graph || !Array.isArray(graph) || graph.length === 0)
                return [];

            // Transform each graph item to JSON-LD
            // The graph items are already in native format (from get()), need to convert to JSON-LD
            return graph.map(item => {
                // LOG.debug('Transforming graph items to JSON-LD', item, typeof (item), (item as any).constructor.name);
                return getJSONLD(item) as JsonObject;
            });
        }
    }

    /**
     * Export AnEntity to JSON-LD format
     * @param entity - AnEntity instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static anEntity(itm: AnEntity, options?: IOptionsJSONLD): JsonObject {
        let jld = this.getAsJSONLD(itm, options);

        jld = this.xConfigurablesToJSONLD(jld, itm, 'hasProperty');
        jld = this.xConfigurablesToJSONLD(jld, itm, 'hasTargetLink');
        return this.sortJsonLdKeys(jld);
    }

    /**
     * Export ARelationship to JSON-LD format
     * @param rel - ARelationship instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static aRelationship(rel: ARelationship, options?: IOptionsJSONLD): JsonObject {
        let jld = this.getAsJSONLD(rel, options);

        jld = this.xConfigurablesToJSONLD(jld, rel, 'hasProperty');
        jld = this.xConfigurablesToJSONLD(jld, rel, 'hasTargetLink');
        jld = this.xConfigurablesToJSONLD(jld, rel, 'hasSourceLink');
        return this.sortJsonLdKeys(jld);
    }

    /**
     * Export Enumeration (metamodel class) to JSON-LD format
     * @param enumeration - Enumeration instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static enumeration(enm: Enumeration, options?: IOptionsJSONLD): JsonObject {
        const jld = this.getAsJSONLD(enm, options);
        return this.sortJsonLdKeys(jld);
    }

    /**
     * Export Property (metamodel class) to JSON-LD format
     * @param property - Property instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static property(prp: Property, options?: IOptionsJSONLD): JsonObject {
        const jld = this.getAsJSONLD(prp, options);
        return this.sortJsonLdKeys(jld);
    }

    /**
     * Export Link (metamodel class) to JSON-LD format
     * @param link - Link instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static link(lnk: Link, options?: IOptionsJSONLD): JsonObject {
        const jld = this.getAsJSONLD(lnk, options);
        return this.sortJsonLdKeys(jld);
    }

    /**
     * Export Entity (metamodel class) to JSON-LD format
     * @param entity - Entity instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static entity(itm: Entity, options?: IOptionsJSONLD): JsonObject {
        const jld = this.getAsJSONLD(itm, options);
        return this.sortJsonLdKeys(jld);
    }

    /**
     * Export Relationship (metamodel class) to JSON-LD format
     * @param relationship - Relationship instance
     * @param options - Export options
     * @returns JSON-LD representation
     */
    static relationship(rel: Relationship, options?: IOptionsJSONLD): JsonObject {
        const jld = this.getAsJSONLD(rel, options);
        return this.sortJsonLdKeys(jld);
    }
    /**
     * Transform hasProperty, hasSourceLink or hasTargetLink arrays for JSON-LD output.
     * It is assumed that the native property names have already been renamed with MVF.renameJsonTags( ..., MVF.toJSONLD).
     */
    private static xConfigurablesToJSONLD(
        jld: JsonObject,
        itm: TPigItem,
        hasX: 'hasProperty' | 'hasSourceLink' | 'hasTargetLink'
    ): JsonObject {
        const cfgs = (itm as any)[hasX];
        // LOG.debug('xConfigurablesToJSONLD:', jld, itm, hasX, cfgs);
        if (!Array.isArray(cfgs)) {
            return jld;
        }

        const grouped = new Map<TPigId, JsonObject[]>();

        for (const cfg of cfgs) {
            const propValue: Record<string, JsonValue> = {
                [`${DEF.pfxNsMeta}itemType`]: { ['@id']: cfg.itemType } as JsonObject
            };

            // Add value if present (only for AProperty)
            if ('value' in cfg && cfg.value !== undefined) {
                propValue['@value'] = cfg.value;
            }

            // Add idRef if present
            if (cfg.idRef !== undefined) {
                propValue['@id'] = cfg.idRef;
            }

            const key = cfg.hasClass as TPigId;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }

            const gr = grouped.get(key);
            if (Array.isArray(gr))
                gr.push(propValue as JsonObject);
            else
                throw new Error(`Invalid group for key: ${key}`);
        }

        // Add grouped cfgs to JSON-LD
        for (const [key, values] of grouped) {
            jld[key] = values as JsonValue;
        }

        delete jld[hasX];
        return jld;
    }
    /**
     * Sort JSON-LD object keys in canonical order: @context, @id, @type, @graph, @value, then all other keys alphabetically.
     * This ensures consistent JSON-LD output regardless of object construction order.
     * 
     * @param obj - JSON-LD object to sort
     * @returns New object with keys in canonical order
     * 
     * @example
     * const jsonld = { '@type': 'Entity', '@id': 'ex:123', 'title': 'Example' };
     * const sorted = this.sortJsonLdKeys(jsonld);
     * // Result: { '@id': 'ex:123', '@type': 'Entity', 'title': 'Example' }
     */
    private static sortJsonLdKeys(obj: JsonObject): JsonObject {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj;
        }

        // Canonical order for JSON-LD special keys
        const canonicalOrder = [
            '@context', '@id', '@type', '@graph', '@value', '@language',
            `${DEF.pfxNsMeta}itemType`, `${DEF.pfxNsMeta}specializes`,
            `${DEF.pfxNsDcmi}title`, 'skos:definition', `${DEF.pfxNsDcmi}description`,
            `${DEF.pfxNsDcmi}modified`, `${DEF.pfxNsDcmi}creator`,
            `${DEF.pfxNsMeta}revision`, `${DEF.pfxNsMeta}priorRevision`,
            `${DEF.pfxNsMeta}enumeratedProperty`, `${DEF.pfxNsMeta}enumeratedSourceLink`, `${DEF.pfxNsMeta}enumeratedTargetLink`, `${DEF.pfxNsMeta}enumeratedEndpoint`
        ];

        // Separate JSON-LD special keys from other keys
        const specialKeys: string[] = [];
        const otherKeys: string[] = [];

        for (const key of Object.keys(obj)) {
            if (canonicalOrder.includes(key)) {
                specialKeys.push(key);
            } else {
                otherKeys.push(key);
            }
        }

        // Sort special keys by canonical order
        specialKeys.sort((a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b));

        // Sort other keys alphabetically
        otherKeys.sort();

        // Build new object with sorted keys
        const sorted: JsonObject = {};

        for (const key of [...specialKeys, ...otherKeys]) {
            const value = obj[key];
            // Recursively sort nested objects, but preserve arrays
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                sorted[key] = this.sortJsonLdKeys(value as JsonObject);
            } else if (Array.isArray(value)) {
                // Sort objects within arrays
                sorted[key] = value.map(item =>
                    item && typeof item === 'object' && !Array.isArray(item)
                        ? this.sortJsonLdKeys(item as JsonObject)
                        : item
                );
            } else {
                sorted[key] = value;
            }
        }

        return sorted;
    }
    /**
     * Convert valid id-strings to id-objects.
     * - Accepts any JsonValue (string/number/boolean/null/object/array).
     * - Recursively processes arrays and objects (non-flat).
     * - Skips converting the actual id property (default '@id').
     * - options.idKey: output id key (default '@id')
     * - options.mutate: if true modify in-place, otherwise return a new structure
     */
    private static makeIdObjects(
        node: JsonValue,
        options?: { idKey?: string; mutate?: boolean }
    ): JsonValue {
        const idKey = options?.idKey ?? '@id';
        const typeKey = '@type';
        const mutate = !!options?.mutate;

        // primitives
        if (node === null || node === undefined) return node;
        if (typeof node === 'string') {
            return PigItem.isValidIdString(node) ? ({ [idKey]: node } as JsonObject) : node;
        }
        if (typeof node === 'number' || typeof node === 'boolean') return node;

        // array: map elements
        if (Array.isArray(node)) {
            if (mutate) {
                for (let i = 0; i < node.length; i++) {
                    node[i] = this.makeIdObjects(node[i], options);
                }
                return node;
            }
            const outArr: JsonArray = [];
            for (let i = 0; i < node.length; i++) {
                outArr[i] = this.makeIdObjects(node[i], options);
            }
            return outArr;
        }

        // object: handle the idKey specially (do not convert its string value)
        const obj = node as JsonObject;
        if (mutate) {
            for (const k of Object.keys(obj)) {
                const v = obj[k];
                if ([idKey, typeKey, '@context', '@graph', '@value', '@language'].includes(k)) {
                    // keep JSON-LD reserved keywords unchanged (@id, @type, @context, @graph, @value, @language)
                    // @value must preserve literal values and never be expanded to objects with @id
                    obj[k] = v;
                } else if (typeof v === 'string' && PigItem.isValidIdString(v)) {
                    obj[k] = { [idKey]: v } as unknown as JsonValue;
                } else {
                    obj[k] = this.makeIdObjects(v, options);
                }
            }
            return obj;
        }

        const out: JsonObject = {};
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (k === idKey || k === typeKey || k === '@context' || k === '@graph' || k === '@value' || k === '@language') {
                // preserve JSON-LD reserved keywords raw values (@id, @type, @context, @graph, @value, @language)
                // @value must preserve literal values and never be expanded to objects with @id
                out[k] = v;
            } else if (typeof v === 'string' && PigItem.isValidIdString(v)) {
                out[k] = { [idKey]: v } as unknown as JsonValue;
            } else {
                out[k] = this.makeIdObjects(v, options);
            }
        }
        return out;
    }
    private static getAsJSONLD(itm: TPigItem, options?: IOptionsJSONLD): JsonObject {
        const jld = MVF.renameJsonTags(itm.get() as unknown as JsonObject, MVF.toJSONLD, { mutate: false }) as JsonObject;
        return this.makeIdObjects(jld) as JsonObject;
    }
}

