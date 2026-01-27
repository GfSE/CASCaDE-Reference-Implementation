/*!
 * Package-level constraint validation for Product Information Graph (PIG)
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * Package-level constraint validation for Product Information Graph (PIG)
 * 
 * This module validates cross-item constraints that cannot be checked at the individual item level:
 * - Uniqueness of primary IDs across all items in a package
 * - Validity of hasClass references in aProperty instances
 * - Validity of hasClass references in aLink instances (aSourceLink, aTargetLink)
 * - Future: Validation of eligibleProperty, eligibleEndpoint, etc.
 * 
 * Dependencies: pig-metaclasses.ts, messages.ts
 * Authors: oskar.dungern@gfse.org
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Link-Implementation/issues)
 *
 * To be discussed:
 * - Handling (error responses vs log messages)
 * - Old thinking: The whole package is rejected if any constraint fails (current approach).
 * - New thinking --> 'Permissive Computing': Report all issues but return the package with a valid subgraph;
 *   sometimes there may be 2 or more choices of valid subgraphs when constraints fail.
 *   Partial data is better than no data.
 * 
 * List of constraint checks:
 * Phase 1 (critical):
 *   ✅ Unique IDs
 *   ✅ aProperty.hasClass → Property
 *   ✅ aLink.hasClass → Link
 *      anEntity and aRelationship class references
 *      Entity and Relationship specializes references
 *      @type consistency
 * Phase 2 (important):
 *      eligibleProperty references
 *      eligibleEndpoint references
 *      Link endpoint compliance
 *      Enumeration value references
 * Phase 3 (useful):
 *      Cyclic specialization detection
 *      Cyclic composed property detection
 *      Property value constraints
 *      Required properties check --> done by schema validation!
 *      Relationship structure
 * Phase 4 (optional):
 *      Orphaned items (warnings)
 *      Language tag consistency
 *      Namespace usage
 *      Modification date validation
 */

import { IRsp, rspOK, Msg } from "../../../lib/messages";
import { logger } from "../../../lib/helpers";
import { IAPackage, PigItemType, PigItemTypeValue, TPigId } from "./pig-metaclasses";

/**
 * Check cross-item constraints for a package
 * @param pkg - Package to validate
 * @returns IRsp (rspOK on success, error IRsp on failure)
 */
export function checkConstraintsForPackage(pkg: IAPackage): IRsp {
    // 1. Check that all primary IDs are unique
    const uniquenessCheck = checkUniqueIds(pkg);
    if (!uniquenessCheck.ok) {
        return uniquenessCheck;
    }

    // 2. Build a map of itemTypes by ID for quick lookup
    const itemTypeMap = buildItemTypeMap(pkg);
    // if (pkg.id == 'd:test-invalid-prop')
        // logger.debug(`checkConstraintsForPackage (1): `, pkg, itemTypeMap);

    // 3. Check aProperty.hasClass references
    const propertyCheck = checkPropertyReferences(pkg, itemTypeMap);
    if (!propertyCheck.ok) {
        return propertyCheck;
    }

    // 4. Check aLink.hasClass references (aSourceLink and aTargetLink)
    const linkCheck = checkLinkReferences(pkg, itemTypeMap);
    if (!linkCheck.ok) {
        return linkCheck;
    }

    // logger.debug(`Package ${pkg.id || 'unnamed'}: all constraints validated successfully`);
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
        //    logger.warn(`Item at index ${i} is missing an ID`,item);
            return Msg.create(670, i);
        }

        if (idMap.has(itemId)) {
            const firstIndex = idMap.get(itemId)!;
            return Msg.create(671, itemId, firstIndex, i);
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
        //     logger.debug(`buildItemTypeMap (3): `, item, itemId, itemType);
        if (itemId && itemType) {
            itemTypeMap.set(itemId, itemType);
        }
    }

    // if (pkg.id == 'd:test-invalid-prop')
        // logger.debug(`buildItemTypeMap (9): `, pkg, itemTypeMap);
    return itemTypeMap;
}

/**
 * Check that all aProperty.hasClass references point to pig:Property items
 * @param pkg - Package to validate
 * @param itemTypeMap - Map from ID to itemType for reference lookup
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function checkPropertyReferences(
    pkg: IAPackage,
    itemTypeMap: Map<TPigId, PigItemTypeValue>
): IRsp {
    for (let i = 0; i < pkg.graph.length; i++) {
        const item = pkg.graph[i];
        const itemType = (item as any).itemType;
        const itemId = (item as any)['@id'] ?? (item as any).id;
        // if (pkg.id == 'd:test-invalid-prop')
            // logger.debug(`checkPropertyReferences (1): `, pkg, itemType, itemId);

        // Check AnEntity items
        if (itemType === PigItemType.anEntity) {
            const entity = item as any;
            // logger.debug(`Checking properties for AnEntity `, entity);
            if (entity.hasProperty && Array.isArray(entity.hasProperty)) {
                for (let j = 0; j < entity.hasProperty.length; j++) {
                    const prop = entity.hasProperty[j];
                    const checkResult = validatePropertyHasClass(prop, itemId, j, itemTypeMap);
                    if (!checkResult.ok) {
                        return checkResult;
                    }
                }
            }
        }

        // Check ARelationship items
        if (itemType === PigItemType.aRelationship) {
            const rel = item as any;
            if (rel.hasProperty && Array.isArray(rel.hasProperty)) {
                for (let j = 0; j < rel.hasProperty.length; j++) {
                    const prop = rel.hasProperty[j];
                    const checkResult = validatePropertyHasClass(prop, itemId, j, itemTypeMap);
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
 * Validate a single aProperty's hasClass reference
 * @param prop - Property to validate
 * @param parentId - ID of parent item (for error messages)
 * @param propIndex - Index of property in parent's hasProperty array
 * @param itemTypeMap - Map for reference lookup
 * @returns IRsp (rspOK on success, error on invalid reference)
 */
function validatePropertyHasClass(
    prop: any,
    parentId: string,
    propIndex: number,
    itemTypeMap: Map<TPigId, PigItemTypeValue>
): IRsp {
    if (!prop.hasClass) {
        return Msg.create(672, parentId, propIndex, 'missing hasClass');
    }

    // logger.debug(`validatePropertyHasClass: checking hasClass ${JSON.stringify(prop, null, 2)} for property at index ${propIndex} of parent ${parentId}`);
    // logger.debug(`validatePropertyHasClass: itemTypeMap = ${JSON.stringify(Array.from(itemTypeMap.entries()), null, 2)}`);

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

        // Check AnEntity items (hasTargetLink)
        if (itemType === PigItemType.anEntity) {
            const entity = item as any;
            if (entity.hasTargetLink && Array.isArray(entity.hasTargetLink)) {
                for (let j = 0; j < entity.hasTargetLink.length; j++) {
                    const link = entity.hasTargetLink[j];
                    const checkResult = validateLinkHasClass(link, itemId, j, 'hasTargetLink', itemTypeMap);
                    if (!checkResult.ok) {
                        return checkResult;
                    }
                }
            }
        }

        // Check ARelationship items (hasSourceLink and hasTargetLink)
        if (itemType === PigItemType.aRelationship) {
            const rel = item as any;

            // Check source links
            if (rel.hasSourceLink && Array.isArray(rel.hasSourceLink)) {
                for (let j = 0; j < rel.hasSourceLink.length; j++) {
                    const link = rel.hasSourceLink[j];
                    const checkResult = validateLinkHasClass(link, itemId, j, 'hasSourceLink', itemTypeMap);
                    if (!checkResult.ok) {
                        return checkResult;
                    }
                }
            }

            // Check target links
            if (rel.hasTargetLink && Array.isArray(rel.hasTargetLink)) {
                for (let j = 0; j < rel.hasTargetLink.length; j++) {
                    const link = rel.hasTargetLink[j];
                    const checkResult = validateLinkHasClass(link, itemId, j, 'hasTargetLink', itemTypeMap);
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
function validateLinkHasClass(
    link: any,
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
