/*! Cross-environment JSON-LD importer.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * Cross-environment JSON-LD importer.
 * - Accepts a Node file path, an http(s) URL string or a browser File/Blob.
 * - Extracts elements from '@graph' (or 'graph'), converts JSON-LD keys to internal keys
 *   and instantiates matching PIG class instances where possible.
 *
 *  Dependencies:
 *  Authors: oskar.dungern@gfse.org, ..
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 *
 * Usage:
 * - Node:   await importJsonLd('C:/path/to/file.jsonld')
 * - URL:    await importJsonLd('https://example/.../doc.jsonld')
 * - Browser: await importJsonLd(fileInput.files[0])
 */

import { IRsp, rspOK, Msg } from "../../lib/messages";
import { LIB, logger } from "../../lib/helpers";
import { APackage, TPigItem } from '../../schemas/pig/pig-metaclasses';
import { SCH_LD } from '../../schemas/pig/pig-schemata-jsonld';

/**
 * Import JSON-LD document and instantiate PIG items
 * @param source - File path, URL, or File/Blob object
 * @returns IRsp with array of TPigItem (first item is APackage, rest are graph items)
 */
export async function importJSONLD(source: string | File | Blob): Promise<IRsp> {
    const rsp = await LIB.readFileAsText(source);
    if (!rsp.ok)
        return rsp;

    const text = rsp.response as string;
    logger.info('importJSONLD: loaded text length ' + text.length);

    let doc: any;
    try {
        doc = JSON.parse(text);
    } catch (err: any) {
        return Msg.create(690, err?.message ?? err);
    }

    // ✅ Validate entire JSON-LD document structure
    const isValidPackage = SCH_LD.validatePackageLD(doc);
    if (!isValidPackage) {
        const errors = SCH_LD.getValidatePackageLDErrors();
        logger.error('JSON-LD package validation failed:', errors);
        return Msg.create(697, errors);
    }

    // Instantiate APackage and load the document
    const aPackage = new APackage();
    const allItems = aPackage.setJSONLD(doc);

    // allItems[0] is the package itself, rest are graph items
    const expectedCount = doc['@graph']?.length || 0;
    const actualCount = allItems.length -1;

    let result: IRsp;
    if (actualCount === expectedCount) {
        result = rspOK;
        logger.info(`importJSONLD: successfully instantiated package with all ${actualCount} items`);
    } else {
        result = Msg.create(691, actualCount, expectedCount);
        logger.warn(`importJSONLD: instantiated ${actualCount} of ${expectedCount} items`);
    }

    // Return all items (package + graph items)
    result.response = allItems;
    result.responseType = 'json';

    result = result as IRsp<TPigItem[]>;

    return result
}

