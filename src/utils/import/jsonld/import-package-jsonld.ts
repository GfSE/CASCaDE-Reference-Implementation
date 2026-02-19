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

import { IRsp, rspOK, Msg } from '../../lib/messages';
import { LOG } from '../../lib/helpers';
import { PIN } from '../../lib/platform-independence';
import { APackage, TPigItem } from '../../schemas/pig/ts/pig-metaclasses';
import { SCH_LD } from '../../schemas/pig/jsonld/pig-schemata-jsonld';
// import { ConstraintCheckType } from '../../schemas/pig/ts/pig-package-constraints';

/**
 * JSON-LD document structure
 */
interface JsonLdDocument {
    '@context'?: unknown;
    '@graph'?: unknown[];
    '@id'?: string;
    '@type'?: string | string[];
    [key: string]: unknown;
}

/**
 * Import JSON-LD document and instantiate PIG items
 * @param source - File path, URL, or File/Blob object
 * @returns IRsp with array of TPigItem (first item is APackage, rest are graph items)
 */
export async function importJSONLD(source: string | File | Blob): Promise<IRsp> {
    // LOG.debug('importJSONLD: starting import from source', source);
    const rsp = await PIN.readFileAsText(source);
    if (!rsp.ok)
        return rsp;

    const text = rsp.response as string;

    let doc: JsonLdDocument;
    try {
        doc = JSON.parse(text) as JsonLdDocument;
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return Msg.create(690, 'JSON-LD', errorMessage);
    }

    // Validate entire JSON-LD document structure
    const isValidPackage = await SCH_LD.validatePackageLD(doc);
    if (!isValidPackage) {
        const errors = await SCH_LD.getValidatePackageLDErrors();
        LOG.error('JSON-LD package validation failed:', errors);
        return Msg.create(697, 'JSON-LD', errors);
    }

    // Instantiate APackage and load the document
    const aPackage = new APackage().setJSONLD(doc); // apply all constraint checks by default
    /*  keeping it because it will be needed when implementing further consistency checks:
        const aPackage = new APackage().setJSONLD(
            doc,
            // some examples are incomplete, so we skip the tests for specializes:
            {checkConstraints: [
                ConstraintCheckType.UniqueIds,
                ConstraintCheckType.aPropertyHasClass,
                ConstraintCheckType.aLinkHasClass,
                ConstraintCheckType.anEntityHasClass,
                ConstraintCheckType.aRelationshipHasClass,
            ]}
        );
    
    // Check if package was successfully created
    if (!aPackage.status().ok) {
        return aPackage.status();
    } */

    const allItems = aPackage.getItems();

    // allItems[0] is the package itself, rest are graph items

    const expectedCount = doc['@graph']?.length || 0;
    const actualCount = allItems.length - 1;

    let result: IRsp;
    if (actualCount === expectedCount) {
        LOG.info(`importJSONLD: successfully instantiated package with all ${actualCount} items`);
        result = rspOK;
    } else {
        let str = '\nErroneous items:';
        for (let i = 1; i < allItems.length; i++) {
            const st = allItems[i].status();
            if(!st.ok)
                str += `\n- graph[${i}]: (${st.status}) /${st.statusText}`;
        }
        LOG.warn(`importJSONLD: instantiated ${actualCount} of ${expectedCount} items` + str);

        result = Msg.create(691, 'JSON-LD', actualCount, expectedCount);
    }

    // Return all items (package + graph items)
    result.response = allItems;
    result.responseType = 'json';

    return result as IRsp<TPigItem[]>;
}

