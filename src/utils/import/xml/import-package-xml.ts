/*! Cross-environment XML importer.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * Cross-environment XML importer.
 * - Accepts a Node file path, an http(s) URL string or a browser File/Blob.
 * - Parses XML document, converts XML structure to internal keys
 *   and instantiates matching PIG class instances where possible.
 *
 * Authors: oskar.dungern@gfse.org
 * 
 * Usage:
 * - Node:   await importXML('C:/path/to/file.xml')
 * - URL:    await importXML('https://example/.../doc.xml')
 * - Browser: await importXML(fileInput.files[0])
 */

import { IRsp, rspOK, Msg } from '../../lib/messages';
import { LOG } from '../../lib/helpers';
import { PIN } from '../../lib/platform-independence';
import { APackage, TPigItem } from '../../schemas/pig/ts/pig-metaclasses';
//import { ConstraintCheckType } from '../../schemas/pig/ts/pig-package-constraints';

/**
 * Import XML document and instantiate PIG items
 * @param source - File path, URL, or File/Blob object
 * @returns IRsp with array of TPigItem (first item is APackage, rest are graph items)
 */
export async function importXML(source: string | File | Blob): Promise<IRsp> {
    const rsp = await PIN.readFileAsText(source);
    if (!rsp.ok)
        return rsp;

    const xmlString = rsp.response as string;
    // LOG.info('importXML: loaded text length ' + xmlString.length);

    // Optional: Pre-validate XML syntax
    try {
        const parser = PIN.createDOMParser();

        const doc = parser.parseFromString(xmlString, 'text/xml');
        const parserError = PIN.getXmlParseError(doc);

        if (parserError) {
            const errorMessage = parserError.textContent || 'Unknown XML parsing error';
            return Msg.create(690, 'XML', errorMessage);
        }
    } catch (err: any) {
        return Msg.create(690, 'XML', err?.message ?? err);
    }
    /*
        // Validate entire XML document structure
        const isValidPackage = await SCH_XSD.validatePackageXML(doc);
        if (!isValidPackage) {
            const errors = await SCH_XSD.getValidatePackageXMLErrors();
            LOG.error('XML package validation failed:', errors);
            return Msg.create(697, 'XML', errors);
        }
    */

    // Instantiate APackage directly from XML string
    const aPackage = new APackage().setXML(xmlString); // apply all constraint checks by default
/*  keeping it because it will be needed when implementing further consistency checks:
    const aPackage = new APackage().setXML(
        xmlString,
        // some examples are incomplete, so we skip the tests for specializes:
        [
            ConstraintCheckType.UniqueIds,
            ConstraintCheckType.aPropertyHasClass,
            ConstraintCheckType.aLinkHasClass,
            ConstraintCheckType.anEntityHasClass,
            ConstraintCheckType.aRelationshipHasClass,
        ]
    );

    // Check if package was successfully created
    if (!aPackage.status().ok) {
        return aPackage.status();
    }
*/
    // allItems[0] is the package itself, rest are graph items:
    const allItems = aPackage.getItems();
    
    const expectedCount = aPackage.graph?.length || 0;
    const actualCount = allItems.length - 1;
    
    let result: IRsp;
    if (actualCount === expectedCount) {
        LOG.info(`importXML: successfully instantiated package with all ${actualCount} items`);
        result = rspOK;
    } else {
        let str = '\nErroneous items:';
        for (let i = 1; i < allItems.length; i++) {
            const st = allItems[i].status();
            if (!st.ok)
                str += `\n- graph[${i}]: (${st.status}) /${st.statusText}`;
        }
        LOG.warn(`importJXML: instantiated ${actualCount} of ${expectedCount} items` + str);

        result = Msg.create(691, 'XML', actualCount, expectedCount);
    }

    // Return all items (package + graph items)
    result.response = allItems;
    result.responseType = 'json';
    
    return result as IRsp<TPigItem[]>;
}
