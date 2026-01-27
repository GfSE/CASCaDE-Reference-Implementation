/*!
 * Product Information Graph (PIG) - Multi-Vocabulary Facility (MVF)
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/** Product Information Graph (PIG) - Multi-Vocabulary Facility
 *  Handles mapping between different vocabulary representations (JSON-LD, XML, internal format)
 *  Dependencies: helpers.ts (for JsonValue types and logger)
 *  Authors: oskar.dungern@gfse.org, ..
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { LIB, JsonPrimitive, JsonValue, JsonObject, JsonArray, logger } from './helpers';

// Map PIG metamodel attributes to/from JSON-LD keys;
// all other keys are derived from the ontology and handled dynamically:
const FROM_JSONLD = new Map<string, string>([
    ['@context', 'context'],
    ['@id', 'id'],
    ['@type', 'hasClass'],
    ['@value', 'value'],
    ['@language', 'lang'],
    ['pig:revision', 'revision'],
    ['pig:priorRevision', 'priorRevision'],
    ['rdfs:subClassOf', 'specializes'],
    ['rdfs:subPropertyOf', 'specializes'],
    ['pig:specializes', 'specializes'],
    ['pig:icon', 'icon'],
    ['xs:simpleType', 'datatype'],
    ['sh:datatype', 'datatype'],
    ['xs:minOccurs', 'minCount'],
    ['sh:minCount', 'minCount'],
    ['xs:maxOccurs', 'maxCount'],
    ['sh:maxCount', 'maxCount'],
    ['xs:maxLength', 'maxLength'],
    ['sh:maxLength', 'maxLength'],
    ['xs:default', 'defaultValue'],
    ['sh:defaultValue', 'defaultValue'],
    ['xs:pattern', 'pattern'],
    ['sh:pattern', 'pattern'],
    ['pig:itemType', 'itemType'],
    ['pig:eligibleProperty', 'eligibleProperty'],
    ['pig:eligibleSourceLink', 'eligibleSourceLink'],
    ['pig:eligibleTargetLink', 'eligibleTargetLink'],
    ['pig:eligibleEndpoint', 'eligibleEndpoint'],
    ['pig:eligibleValue', 'eligibleValue'],
    ['dcterms:title', 'title'],
    ['dcterms:description', 'description'],
    ['dcterms:created', 'created'],
    ['dcterms:modified', 'modified'],
    ['dcterms:creator', 'creator']
]);

// Create Reverse-Map once
const TO_JSONLD = new Map<string, string>(
    Array.from(FROM_JSONLD.entries()).map(([a, b]) => [b, a])
);

// Map entries with the same keys: The second prevails.
const FROM_XML = new Map<string, string>([
    //    ['@value', 'value'],
    //    ['@language', 'lang'],
    ['pig:revision', 'revision'],
    ['pig:priorRevision', 'priorRevision'],
    ['rdf:type', 'hasClass'],
    ['rdfs:subClassOf', 'specializes'],
    ['rdfs:subPropertyOf', 'specializes'],
    ['pig:specializes', 'specializes'],
    ['pig:icon', 'icon'],
    ['sh:datatype', 'datatype'],
    ['xs:simpleType', 'datatype'],
    ['sh:minCount', 'minCount'],
    ['xs:minOccurs', 'minCount'],
    ['sh:maxCount', 'maxCount'],
    ['xs:maxOccurs', 'maxCount'],
    ['sh:maxLength', 'maxLength'],
    ['xs:maxLength', 'maxLength'],
    ['sh:defaultValue', 'defaultValue'],
    ['xs:default', 'defaultValue'],
    ['sh:pattern', 'pattern'],
    ['xs:pattern', 'pattern'],
    ['pig:itemType', 'itemType'],
    ['pig:eligibleProperty', 'eligibleProperty'],
    ['pig:eligibleSourceLink', 'eligibleSourceLink'],
    ['pig:eligibleTargetLink', 'eligibleTargetLink'],
    ['pig:eligibleEndpoint', 'eligibleEndpoint'],
    ['pig:eligibleValue', 'eligibleValue'],
    ['dcterms:title', 'title'],
    ['dcterms:description', 'description'],
    ['dcterms:created', 'created'],
    ['dcterms:modified', 'modified'],
    ['dcterms:creator', 'creator']
]);
const TO_XML = new Map<string, string>(
    Array.from(FROM_XML.entries()).map(([a, b]) => [b, a])
);

/**
 * Multi-Vocabulary Facilities object
 * Provides mapping between different vocabulary representations
 */
export const MVF = {
    /**
     * Mapping from internal format to JSON-LD
     */
    toJSONLD: TO_JSONLD,

    /**
     * Mapping from JSON-LD to internal format
     */
    fromJSONLD: FROM_JSONLD,

    /**
     * Mapping from internal format to XML
     */
    toXML: TO_XML,

    /**
     * Mapping from XML to internal format
     */
    fromXML: FROM_XML,

    /**
     * Rename JSON object keys (tags) according to a mapping.
     * - options.mutate: if true, mutate the original object in-place; default false (returns a new object)
     * - Only object keys are renamed; array elements and primitive values are preserved (but nested objects are processed)
     * 
     * Usage examples:
     * - MVF.renameJsonTags(node, MVF.toJSONLD)        // Convert to JSON-LD
     * - MVF.renameJsonTags(node, MVF.fromJSONLD)      // Convert from JSON-LD
     * - MVF.renameJsonTags(node, MVF.toXML)           // Convert to XML format
     * - MVF.renameJsonTags(node, MVF.fromXML)         // Convert from XML format
     * 
     * ⚠️ WARNING: Use { mutate: true } only when:
     * - Working with very large objects (performance critical)
     * - The original object is no longer needed
     * - You understand that the input will be modified
     */
    renameJsonTags(
        node: JsonValue,
        mapping: Map<string, string>,
        options?: { mutate?: boolean }
    ): JsonValue {
        const mutate = !!(options && options.mutate);

        // 1. handle leaf and null
        if (node === undefined || node === null || LIB.isLeaf(node)) {
            return node;
        }

        // 2. handle array
        if (Array.isArray(node)) {
            if (mutate) {
                for (let i = 0; i < node.length; i++) {
                    node[i] = MVF.renameJsonTags(node[i], mapping, options);
                }
                return node;
            }

            return node.map(item => MVF.renameJsonTags(item, mapping, options));
        }

        // 3. handle object
        const src = node as JsonObject;
        if (mutate) {
            for (const key of Object.keys(src)) {
                const mappedKey = mapping.get(key) ?? key; // ✅ ELEGANT!
                const newValue = MVF.renameJsonTags(src[key], mapping, options);

                if (mappedKey !== key) {
                    if (Object.prototype.hasOwnProperty.call(src, mappedKey)) {
                        logger.warn(`renameJsonTags: overwriting key '${mappedKey}' while renaming '${key}'`);
                    }
                    src[mappedKey] = newValue;
                    delete src[key];
                } else {
                    src[key] = newValue;
                }
            }
            return src;
        }

        // Immutable version
        const out: JsonObject = {};
        for (const key of Object.keys(src)) {
            const mappedKey = mapping.get(key) ?? key; // ✅ ELEGANT!
            out[mappedKey] = MVF.renameJsonTags(src[key], mapping, options);
        }
        return out;
    },

    /**
     * Map a single term (primitive value) according to a mapping.
     * Returns the mapped value if found in mapping, otherwise returns the original term.
     * 
     * Usage examples:
     * - MVF.mapTerm('@id', MVF.fromJSONLD)           // → 'id'
     * - MVF.mapTerm('unknownTerm', MVF.toJSONLD)     // → 'unknownTerm'
     * - MVF.mapTerm('title', MVF.toJSONLD)           // → 'dcterms:title'
     * 
     * @param term - The term to map (must be a JsonPrimitive)
     * @param mapping - Mapping object or array of [key, value] pairs
     * @returns Mapped value if found, otherwise original term
     */
    mapTerm(term: JsonPrimitive, mapping: Map<string, string>): JsonPrimitive {
        if (typeof term !== 'string') {
            return term;
        }
        return mapping.get(term) ?? term; // ✅ SUPER EINFACH!
    }
};
