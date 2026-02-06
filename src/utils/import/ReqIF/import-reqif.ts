/*!
 * ReqIF Import Utilities
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */

import '../../lib/node-polyfills'; // DOM polyfills for Node.js
import { LIB, LOG } from '../../lib/helpers';
import { IRsp, /*Rsp,*/ Msg, rspOK } from '../../lib/messages';
import { APackage, TPigItem, stringXML } from '../../schemas/pig/ts/pig-metaclasses';
import { ConstraintCheckType } from '../../schemas/pig/ts/pig-package-constraints';
import { transformXSLToString } from '../../lib/transform-xsl';

/**
 * Imports a ReqIF XML document and transforms it using the ReqIF-to-PIG stylesheet.
 * 
 * @param xmlDoc - The XML document to import
 * @param filename - The name of the file being imported (for validation)
 * @returns IRsp containing the transformed XML document or error messages
 */
export async function importReqif(xmlString: stringXML, filename: string): Promise<IRsp<unknown>> {
    // Check file extension
    if (!filename.toLowerCase().endsWith('.reqif')) {
        return Msg.create(660, filename, 'expected .reqif file extension');
    }

/*    const rspRead = await LIB.readFileAsText(source);
    if (!rspRead.ok)
        return rspRead;

    const xmlString = rspRead.response as string;
    // LOG.info('importXML: loaded text length ' + xmlString.length); 
*/
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parsing errors
    const sourceError = xmlDoc.querySelector('parsererror');
    if (sourceError) {
        throw new Error(`XML parsing error: ${sourceError.textContent}`);
    }

    // Validate that it's a ReqIF XML document
    if (!isValidReqIFDocument(xmlDoc)) {
        return Msg.create(660, filename, 'missing required ReqIF namespace or root element');
    }

    // Load XSL stylesheet
    const stylesheetPath = './src/utils/schemas/ReqIF/ReqIF-to-PIG.xsl';
    const stylesheetRsp = await LIB.readFileAsText(stylesheetPath);

    if (!stylesheetRsp.ok) {
        return Msg.create(694, stylesheetPath, stylesheetRsp.statusText);
    }

    // Parse stylesheet
    const xslDoc = parser.parseFromString(stylesheetRsp.response as string, 'text/xml');

    // Check for parsing errors
    const stylesheetError = xslDoc.querySelector('parsererror');
    if (stylesheetError) {
        return Msg.create(690, stylesheetPath, stylesheetError.textContent || 'XML parsing error');
    }

    // Transform the document
    const rsp = transformXSLToString(xmlDoc, xslDoc);

    if (!rsp.ok) {
        return Msg.create(660, filename, rsp.statusText);
    }

    const aPackage = new APackage().setXML(
        rsp.response as string,
        // input has only instances, so omit constraint checks on classes:
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

    // allItems[0] is the package itself, rest are graph items:
    const allItems = aPackage.getAllItems();

    const actualCount = allItems.length - 1;
    LOG.info(`importReqIF: successfully instantiated ${actualCount} items`);

    // Return all items (package + graph items)
    const result = rspOK;
    result.response = allItems;
    result.responseType = 'json';

    return result as IRsp<TPigItem[]>;
}

/**
 * Validates that the XML document is a valid ReqIF document.
 * 
 * @param xmlDoc - The XML document to validate
 * @returns True if the document is a valid ReqIF document
 */
function isValidReqIFDocument(xmlDoc: Document): boolean {
    const rootElement = xmlDoc.documentElement;

    if (!rootElement) {
        return false;
    }

    // Check for ReqIF namespace
    const reqifNamespace = 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd';
    const hasReqIFNamespace = rootElement.namespaceURI === reqifNamespace ||
        rootElement.getAttribute('xmlns') === reqifNamespace ||
        rootElement.lookupNamespaceURI('reqif') === reqifNamespace;

    // Check for REQ-IF root element
    const isReqIFRoot = rootElement.localName === 'REQ-IF' ||
        rootElement.tagName === 'REQ-IF' ||
        rootElement.tagName === 'reqif:REQ-IF';

    return hasReqIFNamespace || isReqIFRoot;
}
