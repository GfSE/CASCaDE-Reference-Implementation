/*!
 * Imports a ReqIF XML document and transforms it using the ReqIF-to-PIG stylesheet.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * Imports a ReqIF XML document and transforms it using a ReqIF-to-PIG stylesheet.
 *  Authors: oskar.dungern@gfse.org
 * 
 * Security note: Uses saxon-js which has a transitive dependency on @xmldom/xmldom
 * with known vulnerabilities. Input is validated and size-limited. See docs/SECURITY.md
 *
 * Design Decisions:
 * - SEF stylesheet is loaded from public/assets/xslt/ in both environments
 * - Browser: fetches via HTTP from /assets/xslt/
 * - Node.js: reads from local public/assets/xslt/ directory
 * - Single source of truth: SEF file stored only in public/assets/xslt/
 * 
 * ToDo:
 * - Decide whether the file is read within or outside the import function.
 *   Here it is outside, but in case of importXML() and importSJSONLD(), it is inside.
 * - Extend the constraint checks - very limited now.
 * 
 * @param xmlString - The XML document to import
 * @param filename - The name of the file being imported (for error messages)
 * @returns IRsp containing the transformed XML document or error messages
 */

import { LOG } from '../../lib/helpers';
import { PIN } from '../../lib/platform-independence';
import { IRsp, /*Rsp,*/ Msg, rspOK } from '../../lib/messages';
import { APackage, TPigItem, stringXML } from '../../schemas/pig/ts/pig-metaclasses';
import { ConstraintCheckType } from '../../schemas/pig/ts/pig-package-constraints';

const MAX_XML_SIZE = 4 * 1024 * 1024;

/**
 * Get platform-appropriate path to ReqIF-to-PIG stylesheet
 * - Browser: URL to public asset (/assets/xslt/)
 * - Node.js: Local filesystem path to public directory (public/assets/xslt/)
 * 
 * @returns Path/URL to ReqIF-to-PIG.sef.json
 */
function getStylesheetPath(): string {
    if (PIN.isBrowserEnv()) {
        // Browser: fetch from public directory via HTTP
        const baseUrl = window.location.origin;
        return `${baseUrl}/assets/xslt/ReqIF-to-PIG.sef.json`;
    } else {
        // Node.js: read from local public directory
        return './public/assets/xslt/ReqIF-to-PIG.sef.json';
    }
}

export async function importReqif(
    xmlString: stringXML,
    filename: string
    //    options?: any
): Promise<IRsp<unknown>> {
    LOG.debug(`importReqIF: starting import of file ${filename}`);

    // Check file extension
    if (!filename.toLowerCase().endsWith('.reqif')) {
        return Msg.create(660, filename, 'expected .reqif file extension');
    }

    // Security: Size limit check
    if (xmlString.length > MAX_XML_SIZE) {
        return Msg.create(660, filename, `file too large (max ${MAX_XML_SIZE / 1024 / 1024}MB)`);
    }

    // Security: Basic XML structure validation before parsing
    if (!xmlString.trim().startsWith('<?xml') && !xmlString.trim().startsWith('<')) {
        return Msg.create(660, filename, 'invalid XML structure');
    }

    /*    const rspRead = await LIB.readFileAsText(source);
        if (!rspRead.ok)
            return rspRead;
    
        const xmlString = rspRead.response as string;
        // LOG.info('importXML: loaded text length ' + xmlString.length); 
    */
    const parser = PIN.createDOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // LOG.debug(`importReqIF: parsed XML document with root element <${xmlDoc.documentElement?.tagName}>`);
    // Check for parsing errors
    const sourceError = PIN.getXmlParseError(xmlDoc);
    if (sourceError) {
        return Msg.create(660, filename, sourceError.textContent ?? 'Unknown error');
    }

    // Validate that it's a ReqIF XML document
    if (!isValidReqIFDocument(xmlDoc)) {
        return Msg.create(660, filename, 'missing required ReqIF namespace or root element');
    }

    // In future, we will support different transformation methods:
    //    const method = options?.method || 'XSLT';

    // Get platform-appropriate stylesheet path
    const stylesheetPath = getStylesheetPath();
    LOG.debug(`importReqIF: using stylesheet path: ${stylesheetPath}`);

    // LOG.debug(`importReqIF: starting transformation using stylesheet ${stylesheetPath}...`);
    // Transform the document
    const rsp = await PIN.transformXSL(xmlString, stylesheetPath);

    if (!rsp.ok) {
        return Msg.create(660, filename, rsp.statusText ?? 'Unknown error');
    }

    // LOG.debug('importReqIF: transformation successful', rsp.response);
    const aPackage = new APackage().setXML(
        rsp.response as string,
        // input has only instances, so omit constraint checks on classes:
        {
            checkConstraints: [
                ConstraintCheckType.UniqueIds
                //    ConstraintCheckType.aPropertyHasClass,
                //    ConstraintCheckType.aLinkHasClass,
                //    ConstraintCheckType.anEntityHasClass,
                //    ConstraintCheckType.aRelationshipHasClass,
            ] as ConstraintCheckType[]
        }
    );

    // Check if package was successfully created
    if (!aPackage.status().ok) {
        return aPackage.status();
    }

    // allItems[0] is the package itself, rest are graph items:
    const allItems = aPackage.getItems();

    // const actualCount = allItems.length - 1;
    // LOG.info(`importReqIF: successfully instantiated ${actualCount} items`);

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

    return hasReqIFNamespace && isReqIFRoot;
}
