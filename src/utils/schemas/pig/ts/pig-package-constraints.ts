/*!
 * Package-level constraint validation for Product Information Graph (PIG)
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Link-Implementation/issues)
 */
/**
 * Package-level constraint validation for Product Information Graph (PIG)
 * 
 * This module validates cross-item constraints that cannot be checked at the individual item level:
 * - Uniqueness of primary IDs across all items in a package
 * - Validity of hasClass references in aProperty instances
 * - Validity of hasClass references in aLink instances (aSourceLink, aTargetLink)
 * - Property occurrence validation (minCount, maxCount)
 * - Eligible properties and links validation
 * 
 * List of constraint checks:
 * Phase 1 (critical):
 *   ✅ Unique IDs
 *   ✅ aProperty.hasClass → Property
 *   ✅ aLink.hasClass → Link
 *   ✅ anEntity and aRelationship class references
 *   ✅ Entity and Relationship specializes references                                               
 *   ✅ Instances are consistent with their classes:
 *   ✅ - properties and links are eligible
 *   ✅ - occurrence (minCount, maxCount) with language-aware validation for xs:string
 *   ✅ - value range
 *   ✅ - reference to eligible values (enumerations)
 * Phase 2 (important):
 *      namespace prefixes are defined in the context
 *      eligible values as defined comply with the restrictions of their own Property class
 *      eligibleProperty references
 *      eligibleEndpoint references
 *      Link endpoint compliance
 * Phase 3 (useful):
 *      No cyclic specialization
 *      No cyclic composition of properties
 *      Relationship structure
 * Phase 4 (optional):
 *      Orphaned items
 *      - nodes without reference by an organizer AND
 *      - nodes without reference by a relationship
 *      Language tag consistency
 *      Namespace usage (covered by normalizeId)
 *      Modification date validation (covered by normalizeDateTime)
 *
 * To be discussed:
 * - Handling (error responses vs log messages)
 * - Old thinking: The whole package is rejected if any constraint fails (current approach).
 * - New thinking --> 'Permissive Computing': Report all issues but return the package with a valid subgraph;
 *   sometimes there may be 2 or more choices of valid subgraphs when constraints fail.
 *   Partial data is better than no data.
 *
 * Authors: oskar.dungern@gfse.org
 */

import { IRsp, rspOK, Msg } from '../../../lib/messages';
import { LOG } from "../../../lib/helpers";
import { IAPackage, PigItemType, PigItemTypeValue, TPigAnElement, TPigId } from './pig-metaclasses';

/**
 * Available constraint check types
 */
export enum ConstraintCheckType {
    UniqueIds = 'uniqueIds',
    aPropertyHasClass = 'aPropertyHasClass',
    aLinkHasClass = 'aLinkHasClass',
    anEntityHasClass = 'anEntityHasClass',
    aRelationshipHasClass = 'aRelationshipHasClass',
    EntitySpecializes = 'entitySpecializes',
    RelationshipSpecializes = 'relationshipSpecializes',
    PropertySpecializes = 'propertySpecializes',
    LinkSpecializes = 'linkSpecializes',
    EligibleProperties = 'eligibleProperties',
    EligibleLinks = 'eligibleLinks',
    ValueRanges = 'valueRanges'
}

/**
 * All available constraint checks
 */
const allConstraintChecks: ConstraintCheckType[] = [
    ConstraintCheckType.UniqueIds,
    ConstraintCheckType.aPropertyHasClass,
    ConstraintCheckType.aLinkHasClass,
    ConstraintCheckType.anEntityHasClass,
    ConstraintCheckType.aRelationshipHasClass,
    ConstraintCheckType.EntitySpecializes,
    ConstraintCheckType.RelationshipSpecializes,
    ConstraintCheckType.PropertySpecializes,
    ConstraintCheckType.LinkSpecializes,
    ConstraintCheckType.EligibleProperties,
    ConstraintCheckType.EligibleLinks,
    ConstraintCheckType.ValueRanges
];

/**
 * Check cross-item constraints for a package
 * @param pkg - Package to validate
 * @param checksToPerform - Optional list of checks to perform (default: all checks)
 * @returns IRsp (rspOK on success, error IRsp on failure)
 */
export function checkConstraintsForPackage(
    pkg: IAPackage,
    options?: { checkConstraints: ConstraintCheckType[] }
): IRsp {
    const checksSet = new Set(options?.checkConstraints ?? allConstraintChecks);

    // 1. Check that all primary IDs are unique
    if (checksSet.has(ConstraintCheckType.UniqueIds)) {
        const rsp = checkUniqueIds(pkg);
        if (!rsp.ok) return rsp;
    }

    // Build a map of itemTypes by ID for quick lookup
    const itemTypeMap = buildItemTypeMap(pkg);

    // 2. Check aProperty.hasClass references and minCount/maxCount
    if (checksSet.has(ConstraintCheckType.aPropertyHasClass)) {
        const rsp = checkPropertyReferences(pkg, itemTypeMap);
        if (!rsp.ok) return rsp;
    }

    // 3. Check aLink.hasClass references (aSourceLink and aTargetLink)
    if (checksSet.has(ConstraintCheckType.aLinkHasClass)) {
        const rsp = checkLinkReferences(pkg, itemTypeMap);
        if (!rsp.ok) return rsp;
    }

    // 4a. Check anEntity.hasClass references
    if (checksSet.has(ConstraintCheckType.anEntityHasClass)) {
        const rsp = checkEntityOrRelationshipReferences(pkg, PigItemType.anEntity, itemTypeMap, 'hasClass');
        if (!rsp.ok) return rsp;
    }

    // 4b. Check aRelationship.hasClass references
    if (checksSet.has(ConstraintCheckType.aRelationshipHasClass)) {
        const rsp = checkEntityOrRelationshipReferences(pkg, PigItemType.aRelationship, itemTypeMap, 'hasClass');
        if (!rsp.ok) return rsp;
    }

    // 5a. Check Entity.specializes references
    if (checksSet.has(ConstraintCheckType.EntitySpecializes)) {
        const rsp = checkEntityOrRelationshipReferences(pkg, PigItemType.Entity, itemTypeMap, 'specializes');
        if (!rsp.ok) return rsp;
    }

    // 5b. Check Relationship.specializes references
    if (checksSet.has(ConstraintCheckType.RelationshipSpecializes)) {
        const rsp = checkEntityOrRelationshipReferences(pkg, PigItemType.Relationship, itemTypeMap, 'specializes');
        if (!rsp.ok) return rsp;
    }

    // 5c. Check Property.specializes
    if (checksSet.has(ConstraintCheckType.PropertySpecializes)) {
        const rsp = checkPropertyOrLinkReferences(pkg, PigItemType.Property, itemTypeMap, 'specializes');
        if (!rsp.ok) return rsp;
    }

    // 5d. Check Link.specializes
    if (checksSet.has(ConstraintCheckType.LinkSpecializes)) {
        const rsp = checkPropertyOrLinkReferences(pkg, PigItemType.Link, itemTypeMap, 'specializes');
        if (!rsp.ok) return rsp;
    }

    // Build class maps for eligibility checks
    const classMap = buildClassMap(pkg);
    // LOG.debug(`Built class map for eligibility checks: `, classMap);

    // 6a. Check eligible properties in anEntity and aRelationship instances
    if (checksSet.has(ConstraintCheckType.EligibleProperties)) {
        const rsp = checkEligibleProperties(pkg, classMap);
        if (!rsp.ok) return rsp;
    }

    // 6b. Check eligible links in anEntity and aRelationship instances
    if (checksSet.has(ConstraintCheckType.EligibleLinks)) {
        const rsp = checkEligibleLinks(pkg, classMap);
        if (!rsp.ok) return rsp;
    }

    // 7. Check value ranges for property values
    if (checksSet.has(ConstraintCheckType.ValueRanges)) {
        const propertyMap = buildPropertyMap(pkg);
        const rsp = checkValueRanges(pkg, propertyMap);
        if (!rsp.ok) return rsp;
    }

    // LOG.debug(`Package ${pkg.id || 'unnamed'}: all constraints validated successfully`);
    return rspOK;
}

/**
 * Check that all primary IDs in the package are unique;
 * validates both '@id' and 'id' fields.
 * @param pkg - Package to validate
 * @returns IRsp (rspOK on success, error with duplicate info on failure)
 */

function checkUniqueIds(pkg: IAPackage): IRsp {
    const idMap = new Map<TPigId, number>();

    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemId = (item as any)['@id'] ?? (item as any).id;

        if (!itemId) {
            return Msg.create(670, i);
        }

        const existingIndex = idMap.get(itemId);
        if (existingIndex !== undefined) {  // ✅ Type Guard statt !
            return Msg.create(671, itemId, existingIndex, i);
        }

        idMap.set(itemId, i);
    }

    return rspOK;
}

/**
 * Build a map of item types by ID for quick reference validation
 * @param pkg - Package to process
 * @returns Map from ID to itemType
 */
function buildItemTypeMap(pkg: IAPackage): Map<TPigId, PigItemTypeValue> {
    const itemTypeMap = new Map<TPigId, PigItemTypeValue>();

    for (const item of pkg.graph) {
        const itemId = (item as any)['@id'] ?? (item as any).id;
        const itemType = (item as any).itemType;
        // if (pkg.id == 'd:test-invalid-prop')
        //     LOG.debug(`buildItemTypeMap (3): `, item, itemId, itemType);
        if (itemId && itemType) {
            itemTypeMap.set(itemId, itemType);
        }
    }

    // if (pkg.id == 'd:test-invalid-prop')
    // LOG.debug(`buildItemTypeMap (9): `, pkg, itemTypeMap);
    return itemTypeMap;
}

/**
 * Build a map of Property definitions with their minCount and maxCount values
 * @param pkg - Package to process
 * @returns Map from Property ID to Property definition
 */
function buildPropertyMap(pkg: IAPackage): Map<TPigId, any> {
    const propertyMap = new Map<TPigId, any>();

    for (const item of pkg.graph) {
        const itemId = (item as any)['@id'] ?? (item as any).id;
        const itemType = (item as any).itemType;

        if (itemType === PigItemType.Property) {
            propertyMap.set(itemId, item);
        }
    }

    return propertyMap;
}

/**
 * Build a map of class definitions with their eligibleProperty and eligibleTargetLink arrays
 * @param pkg - Package to process
 * @returns Map from class ID to class definition
 */
function buildClassMap(pkg: IAPackage): Map<TPigId, any> {
    const classMap = new Map<TPigId, any>();

    for (const item of pkg.graph) {
        const itemId = (item as any)['@id'] ?? (item as any).id;
        const itemType = (item as any).itemType;

        // Store Entity and Relationship class definitions
        if (itemType === PigItemType.Entity || itemType === PigItemType.Relationship) {
            classMap.set(itemId, item);
        }
    }

    return classMap;
}

/**
 * Resolve the full list of eligible properties for a class, including inherited ones
 * @param classId - ID of the class to resolve
 * @param classMap - Map of all class definitions
 * @param visited - Set to track visited classes (prevents infinite loops)
 * @returns Array of eligible property IDs (empty array if eligibleProperty is undefined)
 */
function resolveEligibleProperties(
    classId: TPigId,
    classMap: Map<TPigId, any>,
    visited: Set<TPigId> = new Set()
): TPigId[] {
    // Prevent infinite loops in case of circular specialization
    if (visited.has(classId)) {
        return [];
    }
    visited.add(classId);

    const classDef = classMap.get(classId);
    if (!classDef) {
        return [];
    }

    // Start with this class's eligibleProperty (undefined means all properties allowed)
    const directEligible = classDef.eligibleProperty;

    // If eligibleProperty is undefined, all properties are allowed (return special marker)
    if (directEligible === undefined) {
        return ['*']; // Special marker for "all properties allowed"
    }

    // Initialize with direct eligible properties
    let allEligible: TPigId[] = Array.isArray(directEligible) ? [...directEligible] : [];

    // Resolve parent class if specializes is present
    if (classDef.specializes) {
        const parentEligible = resolveEligibleProperties(classDef.specializes, classMap, visited);

        // If parent allows all properties, keep current restrictions
        if (parentEligible.includes('*')) {
            // Keep only direct eligibleProperty restrictions
        } else {
            // Merge parent's eligible properties
            allEligible = [...new Set([...allEligible, ...parentEligible])];
        }
    }

    return allEligible;
}

/**
 * Resolve the full list of eligible target links for a class, including inherited ones
 * @param classId - ID of the class to resolve
 * @param classMap - Map of all class definitions
 * @param visited - Set to track visited classes (prevents infinite loops)
 * @returns Array of eligible link IDs (empty array if eligibleTargetLink is undefined)
 */
function resolveEligibleTargetLinks(
    classId: TPigId,
    classMap: Map<TPigId, any>,
    visited: Set<TPigId> = new Set()
): TPigId[] {
    // Prevent infinite loops
    if (visited.has(classId)) {
        return [];
    }
    visited.add(classId);

    const classDef = classMap.get(classId);
    if (!classDef) {
        return [];
    }

    // Get direct eligible target links (undefined means all links allowed)
    const directEligible = classDef.eligibleTargetLink;
    // LOG.debug(`resolveEligibleTargetLinks: class ${classId} has direct eligibleTargetLink = ${JSON.stringify(directEligible)}`);

    // If eligibleTargetLink is undefined, all links are allowed
    if (directEligible === undefined) {
        return ['*'];
    }

    // Initialize with direct eligible links
    // .. is an array in case of anEntity and a single value in case of aRelationship, normalize to array
    let allEligible: TPigId[] = Array.isArray(directEligible) ?
        [...directEligible]
        : (typeof directEligible === 'string' ? [directEligible] : []);

    // Resolve parent class if specializes is present
    if (classDef.specializes) {
        const parentEligible = resolveEligibleTargetLinks(classDef.specializes, classMap, visited);

        if (parentEligible.includes('*')) {
            // Parent allows all links, keep current restrictions
        } else {
            // Merge parent's eligible links
            allEligible = [...new Set([...allEligible, ...parentEligible])];
        }
    }

    return allEligible;
}

/**
 * Resolve eligible source links for Relationship classes
 */
function resolveEligibleSourceLinks(
    classId: TPigId,
    classMap: Map<TPigId, any>,
    visited: Set<TPigId> = new Set()
): TPigId[] {
    if (visited.has(classId)) {
        return [];
    }
    visited.add(classId);

    const classDef = classMap.get(classId);
    if (!classDef || classDef.itemType !== PigItemType.Relationship) {
        return [];
    }

    const directEligible = classDef.eligibleSourceLink;
    if (directEligible === undefined) {
        return ['*'];
    }
    // LOG.debug(`resolveEligibleSourceLinks: class ${classId} has direct eligibleSourceLink = ${JSON.stringify(directEligible)}`);

    // Initialize with direct eligible links
    // .. exists only for aRelationship and is a single value, normalize to array:
    let allEligible: TPigId[] = Array.isArray(directEligible) ? [...directEligible] : [directEligible];

    if (classDef.specializes) {
        const parentEligible = resolveEligibleSourceLinks(classDef.specializes, classMap, visited);
        if (parentEligible.includes('*')) {
            // Keep current restrictions
        } else {
            allEligible = [...new Set([...allEligible, ...parentEligible])];
        }
    }

    return allEligible;
}

/**
 * Check that all properties in anEntity and aRelationship instances are declared as eligible in their classes
 * @param pkg - Package to validate
 * @param classMap - Map of class definitions
 * @returns IRsp (rspOK on success, error on invalid property)
 */
function checkEligibleProperties(pkg: IAPackage, classMap: Map<TPigId, any>): IRsp {
    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemType = (item as any).itemType;
        const itemId = (item as any)['@id'] ?? (item as any).id;

        // Check anEntity and aRelationship instances
        if (itemType === PigItemType.anEntity || itemType === PigItemType.aRelationship) {
            const instance = item as any;
            const classId = instance.hasClass;

            if (!classId) {
                continue; // hasClass is validated elsewhere
            }

            // Resolve eligible properties for this class
            const eligibleProperties = resolveEligibleProperties(classId, classMap);

            // If no properties are defined, check if class allows properties
            if (!instance.hasProperty || !Array.isArray(instance.hasProperty)) {
                continue; // No properties to validate
            }

            // Check each property against eligible properties
            for (let j = 0; j < instance.hasProperty.length; j++) {
                const prop = instance.hasProperty[j];
                const propClassId = prop.hasClass;

                /*    if (!propClassId) {
                        continue; // hasClass is validated elsewhere
                    } */

                // If eligibleProperty is undefined ('*'), all properties are allowed
                if (eligibleProperties.includes('*')) {
                    continue;
                }

                // Check if this property class is in the eligible list
                if (!eligibleProperties.includes(propClassId)) {
                    return Msg.create(676, itemId, itemType, 'hasProperty', j, propClassId, classId);
                }
            }
        }
    }

    return rspOK;
}

/**
 * Check that all links in anEntity and aRelationship instances are declared as eligible in their classes
 * @param pkg - Package to validate
 * @param classMap - Map of class definitions
 * @returns IRsp (rspOK on success, error on invalid link)
 */
function checkEligibleLinks(pkg: IAPackage, classMap: Map<TPigId, any>): IRsp {
    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemType = (item as any).itemType;
        const itemId = (item as any)['@id'] ?? (item as any).id;

        // Check anEntity instances (hasTargetLink)
        if ([PigItemType.anEntity, PigItemType.aRelationship].includes(itemType)) {
            const classId = item.hasClass;

            if (!classId) {
                continue;
            }

            const eligibleLinks = resolveEligibleTargetLinks(classId, classMap);
            // LOG.debug(`Checking eligible links for ${itemType} ${itemId}: eligibleTargetLinks = ${JSON.stringify(eligibleTargetLinks)}`);

            if ((item as TPigAnElement).hasTargetLink && Array.isArray((item as TPigAnElement).hasTargetLink)) {
                for (let j = 0; j < (item as TPigAnElement).hasTargetLink.length; j++) {
                    const link = (item as TPigAnElement).hasTargetLink[j];
                    const linkClassId = link.hasClass as string;

                    /*        if (!linkClassId) {
                                continue;
                            } */

                    if (eligibleLinks.includes('*'))  // set by resolveEligibleLinks() for "all links allowed"
                        continue;

                    if (!eligibleLinks.includes(linkClassId)) {
                        return Msg.create(676, itemId, itemType, 'hasTargetLink', j, linkClassId, classId);
                    }
                }
            }
        }

        // Check aRelationship instances (hasSourceLink and hasTargetLink)
        if (itemType === PigItemType.aRelationship) {
            const rel = item as any;
            const classId = rel.hasClass;

            if (!classId) {
                continue;
            }

            const eligibleSourceLinks = resolveEligibleSourceLinks(classId, classMap);

            // LOG.debug(`Checking eligible links for aRelationship`,JSON.stringify(rel,null,2));
            // LOG.debug(`Checking eligible links for aRelationship ${itemId}: eligibleSourceLinks = ${JSON.stringify(eligibleSourceLinks)}}`);

            // Check source links
            if (rel.hasSourceLink && Array.isArray(rel.hasSourceLink)) {
                for (let j = 0; j < rel.hasSourceLink.length; j++) {
                    const link = rel.hasSourceLink[j];
                    const linkClassId = link.hasClass;

                    /*        if (!linkClassId) {
                                continue;
                            } */

                    if (eligibleSourceLinks.includes('*'))  // set by resolveEligibleLinks() for "all links allowed"
                        continue;

                    if (!eligibleSourceLinks.includes(linkClassId)) {
                        return Msg.create(676, itemId, itemType, 'hasSourceLink', j, linkClassId, classId);
                    }
                }
            }
        }
    }

    return rspOK;
}

/**
 * Check that all aProperty.hasClass references point to pig:Property items
 * AND validate minCount/maxCount constraints
 * @param pkg - Package to validate
 * @param itemTypeMap - Map from ID to itemType for reference lookup
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkPropertyReferences(
    pkg: IAPackage,
    itemTypeMap: Map<TPigId, PigItemTypeValue>
): IRsp {
    // Build property map for minCount/maxCount validation
    const propertyMap = buildPropertyMap(pkg);

    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemType = (item as any).itemType;
        const itemId = (item as any)['@id'] ?? (item as any).id;
        // if (pkg.id == 'd:test-invalid-prop')
        // LOG.debug(`checkPropertyReferences (1): `, pkg, itemType, itemId);

        // Check AnEntity and aRelationship items
        if ([PigItemType.anEntity, PigItemType.aRelationship].includes(itemType)) {
            // LOG.debug(`Checking properties for AnEntity `, item);
            if ((item as TPigAnElement).hasProperty && Array.isArray((item as TPigAnElement).hasProperty)) {
                // 1. Check hasClass references
                for (let j = 0; j < (item as TPigAnElement).hasProperty.length; j++) {
                    const prop = (item as TPigAnElement).hasProperty[j];
                    const checkResult = checkPropertyHasClass(prop, itemId, j, itemTypeMap);
                    if (!checkResult.ok) {
                        return checkResult;
                    }
                }

                // 2. Check minCount/maxCount constraints
                const occurrenceResult = checkPropertyOccurrences(
                    itemId,
                    (item as TPigAnElement).hasProperty,
                    propertyMap
                );
                if (!occurrenceResult.ok) {
                    return occurrenceResult;
                }
            }
        }
    }

    return rspOK;
}

/**
 * Check that property occurrences conform to minCount and maxCount constraints
 * 
 * For string properties (datatype xs:string):
 * - maxCount: applies PER LANGUAGE (each language can have up to maxCount values)
 * - minCount: applies PER LANGUAGE for all languages that ARE present
 *   * At least one language must be present if minCount > 0
 *   * Each present language must have at least minCount values
 * 
 * For all other properties (all datatypes except xs:string):
 * - minCount/maxCount: apply to total occurrences
 * 
 * @param instanceId - ID of the instance (anEntity or aRelationship)
 * @param properties - Array of properties to validate
 * @param propertyMap - Map of Property definitions
 * @returns IRsp (rspOK on success, error on constraint violation)
 */
function checkPropertyOccurrences(
    instanceId: TPigId,
    properties: any[],
    propertyMap: Map<TPigId, any>
): IRsp {
    // For string properties: Map<propClassId, Map<language, count>>
    // For other properties: Map<propClassId, totalCount>
    const stringPropertyOccurrences = new Map<TPigId, Map<string, number>>();
    const otherPropertyOccurrences = new Map<TPigId, number>();

    // Group properties by class and count occurrences
    for (const prop of properties) {
        const propClassId = prop.hasClass;
        if (!propClassId) {
            continue; // validated elsewhere
        }

        const propDef = propertyMap.get(propClassId);
        if (!propDef) {
            continue; // property not found - validated elsewhere
        }

        // Check if this is a string property (multi-language)
        const isStringProperty = propDef.datatype === 'xs:string' || propDef.datatype === 'xsd:string';

        if (isStringProperty) {
            // For string properties, count per language
            if (!stringPropertyOccurrences.has(propClassId)) {
                stringPropertyOccurrences.set(propClassId, new Map<string, number>());
            }

            // Extract language from the property value
            let lang = 'default';
            if (prop.value) {
                if (typeof prop.value === 'object' && prop.value.lang) {
                    lang = prop.value.lang;
                }
            }

            const langMap = stringPropertyOccurrences.get(propClassId)!;
            langMap.set(lang, (langMap.get(lang) || 0) + 1);
        } else {
            // For non-string properties, count total occurrences
            otherPropertyOccurrences.set(
                propClassId,
                (otherPropertyOccurrences.get(propClassId) || 0) + 1
            );
        }
    }

    // Validate ALL properties in propertyMap, not just those that occur
    for (const [propClassId, propDef] of propertyMap) {
        const minCount = propDef.minCount ?? 0;
        const maxCount = propDef.maxCount ?? 1;

        // Skip validation if minCount and maxCount are both 0 (property not required and not allowed)
        if (minCount === 0 && maxCount === 0) {
            continue;
        }

        const isStringProperty = propDef.datatype === 'xs:string' || propDef.datatype === 'xsd:string';

        if (isStringProperty) {
            // String property validation
            const langMap = stringPropertyOccurrences.get(propClassId);

            if (!langMap || langMap.size === 0) {
                // Property doesn't occur at all
                if (minCount > 0) {
                    return Msg.create(
                        678,
                        instanceId,
                        propClassId,
                        0,
                        minCount,
                        `no values present (need at least one language with ${minCount} value(s))`
                    );
                }
            } else {
                // Property occurs - check each language
                for (const [lang, count] of langMap) {
                    // minCount: each present language must have at least minCount values
                    if (count < minCount) {
                        return Msg.create(
                            678,
                            instanceId,
                            propClassId,
                            count,
                            minCount,
                            `too few values for language '${lang}'`
                        );
                    }

                    // maxCount: each present language must not exceed maxCount values
                    if (count > maxCount) {
                        return Msg.create(
                            678,
                            instanceId,
                            propClassId,
                            count,
                            maxCount,
                            `too many values for language '${lang}'`
                        );
                    }
                }
            }
        } else {
            // Non-string property validation
            const count = otherPropertyOccurrences.get(propClassId) || 0;

            if (count < minCount) {
                return Msg.create(678, instanceId, propClassId, count, minCount, 'too few occurrences');
            }

            if (count > maxCount) {
                return Msg.create(678, instanceId, propClassId, count, maxCount, 'too many occurrences');
            }
        }
    }

    return rspOK;
}

/**
 * Validate a single aProperty's hasClass reference
 * @param prop - Property to validate
 * @param parentId - ID of parent item (for error messages)
 * @param propIndex - Index of property in parent's hasProperty array
 * @param itemTypeMap - Map for reference lookup
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkPropertyHasClass(
    prop: any,
    parentId: string,
    propIndex: number,
    itemTypeMap: Map<TPigId, PigItemTypeValue>
): IRsp {
    if (!prop.hasClass) {
        return Msg.create(672, parentId, propIndex, 'missing hasClass');
    }

    // LOG.debug(`checkPropertyHasClass: checking hasClass ${JSON.stringify(prop, null, 2)} for property at index ${propIndex} of parent ${parentId}`);
    // LOG.debug(`checkPropertyHasClass: itemTypeMap = ${JSON.stringify(Array.from(itemTypeMap.entries()), null, 2)}`);

    const targetType = itemTypeMap.get(prop.hasClass);
    if (!targetType) {
        return Msg.create(673, parentId, propIndex, prop.hasClass, 'not found in package');
    }

    if (targetType !== PigItemType.Property) {
        return Msg.create(673, parentId, propIndex, prop.hasClass, `expected pig:Property, found ${targetType}`);
    }

    return rspOK;
}

/**
 * Check that all aLink.hasClass references point to pig:Link items
 * @param pkg - Package to validate
 * @param itemTypeMap - Map from ID to itemType for reference lookup
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkLinkReferences(
    pkg: IAPackage,
    itemTypeMap: Map<TPigId, PigItemTypeValue>
): IRsp {
    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemType = (item as any).itemType;
        const itemId = (item as any)['@id'] ?? (item as any).id;

        // Check AnEntity and aRelationship items (hasTargetLink)
        if ([PigItemType.anEntity, PigItemType.aRelationship].includes(itemType)) {
            if ((item as TPigAnElement).hasTargetLink && Array.isArray((item as TPigAnElement).hasTargetLink)) {
                for (let j = 0; j < (item as TPigAnElement).hasTargetLink.length; j++) {
                    const link = (item as TPigAnElement).hasTargetLink[j];
                    const checkResult = checkLinkHasClass(link, itemId, j, 'hasTargetLink', itemTypeMap);
                    if (!checkResult.ok) {
                        return checkResult;
                    }
                }
            }
        }

        // Check ARelationship items (hasSourceLink)
        if (itemType === PigItemType.aRelationship) {
            const rel = item as any;

            // Check source links
            if (rel.hasSourceLink && Array.isArray(rel.hasSourceLink)) {
                for (let j = 0; j < rel.hasSourceLink.length; j++) {
                    const link = rel.hasSourceLink[j];
                    const checkResult = checkLinkHasClass(link, itemId, j, 'hasSourceLink', itemTypeMap);
                    if (!checkResult.ok) {
                        return checkResult;
                    }
                }
            }
        }
    }

    return rspOK;
}

/**
 * Validate a single aLink's hasClass reference
 * @param link - Link to validate
 * @param parentId - ID of parent item (for error messages)
 * @param linkIndex - Index of link in parent's link array
 * @param linkArrayName - Name of the link array (for error messages)
 * @param itemTypeMap - Map for reference lookup
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkLinkHasClass(
    link: any, // PigItemType.aSourceLink | PigItemType.aTargetLink,
    parentId: string,
    linkIndex: number,
    linkArrayName: string,
    itemTypeMap: Map<TPigId, PigItemTypeValue>
): IRsp {
    if (!link.hasClass) {
        return Msg.create(674, parentId, linkIndex, linkArrayName, 'missing hasClass');
    }

    const targetType = itemTypeMap.get(link.hasClass);
    if (!targetType) {
        return Msg.create(675, parentId, linkIndex, linkArrayName, link.hasClass, 'not found in package');
    }

    if (targetType !== PigItemType.Link) {
        return Msg.create(675, parentId, linkIndex, linkArrayName, link.hasClass, `expected pig:Link, found ${targetType}`);
    }

    return rspOK;
}

/**
 * Check that Entity/Relationship references (hasClass or specializes) point to valid items
 * @param pkg - Package to validate
 * @param itemTypeMap - Map from ID to itemType for reference lookup
 * @param referenceType - Type of reference to check: 'hasClass' or 'specializes'
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkEntityOrRelationshipReferences(
    pkg: IAPackage,
    itemType: PigItemTypeValue, // PigItemType.anEntity | PigItemType.aRelationship,
    itemTypeMap: Map<TPigId, PigItemTypeValue>,
    referenceType: 'hasClass' | 'specializes'
): IRsp {
    const isHasClass = referenceType === 'hasClass';

    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const iType = (item as any).itemType;
        const iId = (item as any)['@id'] ?? (item as any).id;

        // Check Entity items (both anEntity for hasClass, and Entity for specializes)
        const isInstance = [PigItemType.anEntity, PigItemType.aRelationship].includes(iType);
        const isClass = [PigItemType.Entity, PigItemType.Relationship].includes(iType);

        if (iType == itemType)
            if ((isHasClass && isInstance) || (!isHasClass && isClass)) {
                const referenceValue = item[referenceType];

                //    LOG.debug('checkEntityOrRelationshipReferences: ',item);

                if (!referenceValue) {
                    // specializes is optional (can inherit from pig:Entity directly)
                    if (!isHasClass) {
                        continue;
                    }
                    return Msg.create(674, iId, i, referenceType, `missing ${referenceType}`);
                }

                // Expected type depends on whether we're checking hasClass or specializes:
                // - hasClass: anEntity -> Entity, aRelationship -> Relationship
                // - specializes: Entity -> Entity, Relationship -> Relationship
                const expectedType = [PigItemType.Entity, PigItemType.anEntity].includes(itemType as any) ? PigItemType.Entity : PigItemType.Relationship;
                const targetType = itemTypeMap.get(referenceValue);
                if (!targetType) {
                    return Msg.create(675, iId, i, referenceType, referenceValue, 'not found in package');
                }
                if (targetType !== expectedType) {
                    return Msg.create(675, iId, i, referenceType, referenceValue, `expected ${expectedType}, found ${targetType}`);
                }
            }

    }

    return rspOK;
}

/**
 * Check that Property/Link specializes references point to valid items
 * @param pkg - Package to validate
 * @param itemTypeMap - Map from ID to itemType for reference lookup
 * @param referenceType - Type of reference to check: currently only 'specializes'
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkPropertyOrLinkReferences(
    pkg: IAPackage,
    itemType: PigItemTypeValue,
    itemTypeMap: Map<TPigId, PigItemTypeValue>,
    referenceType: 'specializes'
): IRsp {
    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const iType = (item as any).itemType;
        const iId = (item as any)['@id'] ?? (item as any).id;

        if (iType === itemType) {
            const property = item as any;
            const referenceValue = property[referenceType];

            if (!referenceValue) {
                // specializes is optional (can inherit from pig:Property directly)
                continue;
            }

            // Expected type depends on whether we're checking Property or Link:
            // - Property.specializes -> Property
            // - Link.specializes -> Link
            const expectedType = [PigItemType.Property].includes(itemType as any) ? PigItemType.Property : PigItemType.Link;
            const targetType = itemTypeMap.get(referenceValue);
            if (!targetType) {
                return Msg.create(675, iId, i, referenceType, referenceValue, 'not found in package');
            }
            if (targetType !== expectedType) {
                return Msg.create(675, iId, i, referenceType, referenceValue, `expected ${expectedType}, found ${targetType}`);
            }
        }
    }

    return rspOK;
}

/**
* Check that all property values conform to their defined value ranges
* - For xs:string: validates maxLength and pattern
* - For numeric types: validates minInclusive and maxInclusive
* - For all types: validates that values are in eligibleValue list if defined
* @param pkg - Package to validate
* @param propertyMap - Map of Property definitions
* @returns IRsp (rspOK on success, error on constraint violation)
*/
function checkValueRanges(pkg: IAPackage, propertyMap: Map<TPigId, any>): IRsp {
    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemType = (item as any).itemType;
        // ToDo: Should always be id
        const itemId = (item as any)['@id'] ?? (item as any).id;

        // Check anEntity and aRelationship instances
        if (itemType === PigItemType.anEntity || itemType === PigItemType.aRelationship) {
            const instance = item as TPigAnElement;

            if (!instance.hasProperty || !Array.isArray(instance.hasProperty)) {
                continue;
            }

        /*    let str = 'checkValueRanges - prop list: ';
            instance.hasProperty.forEach(
                (p) => str += `\n-${JSON.stringify(p,null,2)}`
            );
            LOG.debug(str); 
            LOG.debug('checkValueRanges - prop list: ',instance.hasProperty.length); */

            // Check each property value
            for (let j = 0; j < instance.hasProperty.length; j++) {
                const prop = instance.hasProperty[j];
                const propClassId = prop.hasClass;

                // LOG.debug(`checkValueRanges - prop[${j}]:`, JSON.stringify(prop, null, 2));

                if (!propClassId) {
                    continue; // validated by schema
                }

                const propDef = propertyMap.get(propClassId);
                if (!propDef) {
                    continue; // property definition not found, has been checked before
                }

                // Get the value to validate
                const value = prop.value;
                const idRef = prop.idRef;
                if ((value === undefined || value === null) && (idRef === undefined || idRef === null)) {
                    LOG.warn(`checkValueRanges: Property[${j}] of item ${instance.id} has neither value nor reference to eligible value`);
                    continue; // neither value nor id - validated by schema
                }

                // Validate based on datatype
                const datatype = propDef.datatype;
                if (!datatype) {
                    continue; // no datatype defined - validated by schema
                }

                // Extract actual value (handle language-tagged strings)
                const actualValue = (typeof value === 'object' && value !== null && 'text' in value)
                    ? (value as any).text : value;

                // LOG.debug(`checkValueRanges - prop[${j}]:`, datatype, value, actualValue, idRef);

                // Check eligible values (enumerations) - applies to all datatypes
                if (propDef.eligibleValue !== undefined) {
                    // A: aProperty instances must have references to eligible values ...

                    // ToDo: eligibleValues is schema-checked and always a list
                    const eligibleValues = Array.isArray(propDef.eligibleValue)
                        ? propDef.eligibleValue
                        : [propDef.eligibleValue];

                    // Check if value is in eligible list
                    const isEligible = eligibleValues.some((eV: any) => {
                        // Handle both string values and object values with id
                        // ToDo: should always have an id.
                        const eligibleStr = typeof eV === 'object' && eV !== null && 'id' in eV
                            ? eV['id']
                            : String(eV);
                        return eligibleStr === idRef;
                    });

                    // LOG.debug(`checkValueRanges - enum list: ${JSON.stringify(eligibleValues, null, 2)}`, idRef, isEligible);

                    if (!isEligible) {
                        return Msg.create(
                            679,
                            itemId,
                            j,
                            propClassId,
                            `value '${idRef}' is not in eligibleValue list: [${eligibleValues.map((v: any) =>
                                typeof v === 'object' && v !== null && 'id' in v ? v['id'] : String(v)
                            ).join(', ')}]`
                        );
                    }
                } else {
                    // B: aProperty instances must have a literal value potentially with restrictions:

                    // String validation
                    if (datatype === 'xs:string' || datatype === 'xsd:string') {
                        const stringValue = String(actualValue);

                        // Check maxLength
                        if (propDef.maxLength !== undefined && stringValue.length > propDef.maxLength) {
                            return Msg.create(
                                679,
                                itemId,
                                j,
                                propClassId,
                                `string length ${stringValue.length} exceeds maxLength ${propDef.maxLength}`
                            );
                        }

                        // Check pattern
                        if (propDef.pattern) {
                            try {
                                const regex = new RegExp(propDef.pattern);
                                if (!regex.test(stringValue)) {
                                    return Msg.create(
                                        679,
                                        itemId,
                                        j,
                                        propClassId,
                                        `value '${stringValue}' does not match pattern '${propDef.pattern}'`
                                    );
                                }
                            } catch (e) {
                                LOG.warn(`Invalid regex pattern in property ${propClassId}: ${propDef.pattern}`);
                            }
                        }
                    }

                    // Numeric validation
                    if (isNumericDatatype(datatype)) {
                        const numValue = Number(actualValue);

                        if (isNaN(numValue)) {
                            return Msg.create(
                                679,
                                itemId,
                                j,
                                propClassId,
                                `value '${actualValue}' is not a valid number for datatype ${datatype}`
                            );
                        }

                        // Check minInclusive
                        if (propDef.minInclusive !== undefined && numValue < propDef.minInclusive) {
                            return Msg.create(
                                679,
                                itemId,
                                j,
                                propClassId,
                                `value ${numValue} is less than minInclusive ${propDef.minInclusive}`
                            );
                        }

                        // Check maxInclusive
                        if (propDef.maxInclusive !== undefined && numValue > propDef.maxInclusive) {
                            return Msg.create(
                                679,
                                itemId,
                                j,
                                propClassId,
                                `value ${numValue} exceeds maxInclusive ${propDef.maxInclusive}`
                            );
                        }
                    }
                }
            }
        }
    }

    return rspOK;
}

/**
 * Check if a datatype is numeric
 * @param datatype - XSD datatype string
 * @returns true if numeric type
 */
function isNumericDatatype(datatype: string): boolean {
    const numericTypes = [
        'xs:integer', 'xsd:integer',
        'xs:int', 'xsd:int',
        'xs:long', 'xsd:long',
        'xs:short', 'xsd:short',
        'xs:byte', 'xsd:byte',
        'xs:decimal', 'xsd:decimal',
        'xs:float', 'xsd:float',
        'xs:double', 'xsd:double',
        'xs:positiveInteger', 'xsd:positiveInteger',
        'xs:negativeInteger', 'xsd:negativeInteger',
        'xs:nonNegativeInteger', 'xsd:nonNegativeInteger',
        'xs:nonPositiveInteger', 'xsd:nonPositiveInteger',
        'xs:unsignedLong', 'xsd:unsignedLong',
        'xs:unsignedInt', 'xsd:unsignedInt',
        'xs:unsignedShort', 'xsd:unsignedShort',
        'xs:unsignedByte', 'xsd:unsignedByte'
    ];

    return numericTypes.includes(datatype);
}
