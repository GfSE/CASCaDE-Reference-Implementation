/*!
 * Imports a ReqIF XML document and transforms it using the ReqIF-to-PIG stylesheet.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * ReqIF Importer - Static class for importing ReqIF documents
 * 
 * Imports a ReqIF XML document and transforms it using a ReqIF-to-PIG stylesheet.
 * Authors: oskar.dungern@gfse.org
 * 
 * Security note: Uses saxon-js which has a transitive dependency on @xmldom/xmldom
 * with known vulnerabilities. Input is validated and size-limited. See docs/SECURITY.md
 * - The build configuration via package.json loads a newer version of xmldom without critical vulnerability
 *   replacing the dependency of saxon-js.
 *
 * Design Decisions:
 * - SEF stylesheet is loaded from public/assets/xslt/ in both environments
 * - Browser: fetches via HTTP from /assets/xslt/
 * - Node.js: reads from local public/assets/xslt/ directory
 * - Single source of truth: SEF file stored only in public/assets/xslt/
 * - Static class design for consistency with other importers
 * - Source file is loaded inside (like importXML and importJSONLD), for consistency.
 * 
 * ToDo:
 * - Extend the constraint checks - very limited now.
 */

import { DEF } from '../../lib/definitions';
import { LOG } from '../../lib/helpers';
import { PLI } from '../../lib/platform-independence';
import { IRsp, Msg, Rsp /*, rspOK*/ } from '../../lib/messages';
import { APackage /*, TPigItem*/ } from '../../schema/pig/ts/pig-metaclasses';
import { XmlImporter } from '../xml/import-xml';
import { ConstraintCheckType } from '../../schema/pig/ts/pig-package-constraints';

/**
 * ReqIF Importer
 * Static class for importing and transforming ReqIF documents to PIG format
 */
export class ReqifImporter {
    private static readonly maxSizeInput = DEF.maxSizeXML;

    /**
     * Import ReqIF document and transform to PIG items
     * 
     * @param source - File path (Node.js), URL, or File/Blob object (Browser)
     * @returns IRsp containing array of TPigItem (first item is APackage, rest are graph items)
     * 
     * @example
     * // Node.js
     * const result = await ReqIFImporter.import('./test.reqif');
     * 
     * @example
     * // Browser
     * const file = fileInput.files[0];
     * const result = await ReqifImporter.import(file);
     */
    static async import(source: string | File): Promise<IRsp<unknown>> {
        // Extract filename for validation and logging
        const filename = typeof source === 'string' ? source : source.name;

        // Normalize filename/URL for extension check:
        // - Strip query/fragment (for URLs)
        // - Make case-insensitive
        const normalized = filename.split(/[?#]/, 1)[0].toLowerCase();

        // Validate file extension
        if (!normalized.endsWith('.reqif')) {
            return Msg.create(660, filename, 'expected .reqif file extension');
        }

        // Read file content
        const rspRead = await PLI.readFileAsText(source);
        if (!rspRead.ok) {
            return rspRead;
        }

        const xmlToTransform = rspRead.response as string;

        // Security: Size limit check
        if (xmlToTransform.length > this.maxSizeInput) {
            return Msg.create(
                660,
                filename,
                `file too large (max ${this.maxSizeInput / 1024 / 1024}MB)`
            );
        }

        // Parse XML document
        const parser = PLI.createDOMParser();
        const xmlDoc = parser.parseFromString(xmlToTransform, 'text/xml');

        // Check for parsing errors
        const sourceError = PLI.getXmlParseError(xmlDoc);
        if (sourceError) {
            return Msg.create(
                660,
                filename,
                sourceError.textContent ?? 'Unknown XML parsing error'
            );
        }

        // Validate ReqIF document structure
        if (!this.isValid(xmlDoc)) {
            return Msg.create(
                660,
                filename,
                'missing required ReqIF namespace or root element'
            );
        }

        // Get stylesheet path and transform document
        const stylesheetPath = this.getStylesheetPath();
        // LOG.debug(`ReqIFImporter: using stylesheet path: ${stylesheetPath}`);

        const rspTransform = await PLI.transformXSL(xmlToTransform, stylesheetPath);
        if (!rspTransform.ok)
            return rspTransform;

        const xmlString = rspTransform.response as string;

        // check schema
        const schemaResult = XmlImporter.checkXmlSchema(xmlString);
        if (!schemaResult.ok)
            return schemaResult;

        // Instantiate APackage from transformed XML
        const aPackage = new APackage().setXML(xmlString, {
            checkConstraints: [
                ConstraintCheckType.UniqueIds,
                // Input has only instances, so omit constraint checks on classes
                ConstraintCheckType.aPropertyHasClass,
                ConstraintCheckType.aLinkHasClass
                //    ConstraintCheckType.anEntityHasClass,
                //    ConstraintCheckType.aRelationshipHasClass,
            ] as ConstraintCheckType[]
        });

        // Check if package was successfully created
        if (!aPackage.status().ok) {
            return aPackage.status();
        }

        // Get all items (package + graph items)
        const allItems = aPackage.getItems();

        // Calculate import statistics
        const expectedCount = aPackage.graph?.length || 0;
        const actualCount = allItems.length - 1; // -1 for package itself

        LOG.info(
            `ReqifImporter: successfully imported ${filename} with ${actualCount} of ${expectedCount} items`
        );

        // Return success response with items (clone rspOK to avoid shared-state mutation)
        const result = Rsp.create(0, allItems, 'json', 'ReqIF', actualCount, expectedCount);
        return result;
    }

    /**
     * Get platform-specific path to ReqIF-to-PIG stylesheet
     * 
     * @returns Path/URL to ReqIF-to-PIG.sef.json
     * @private
     */
    private static getStylesheetPath(): string {
        const reqifToPigSef = 'ReqIF-to-PIG.sef.json';
        if (PLI.isBrowserEnv()) {
            // Browser: fetch from public directory via HTTP
            const baseUrl = window.location.origin;
            return `${baseUrl}/${DEF.xslPath}${reqifToPigSef}`;
        } else {
            // Node.js: read from local public directory
            return `./public/${DEF.xslPath}${reqifToPigSef}`;
        }
    }

    /**
     * Validate that the XML document is a valid ReqIF document
     * 
     * Checks for:
     * - ReqIF namespace (http://www.omg.org/spec/ReqIF/20110401/reqif.xsd)
     * - REQ-IF root element
     * 
     * @param xmlDoc - The XML document to validate
     * @returns True if the document is a valid ReqIF document
     * @private
     */
    private static isValid(xmlDoc: Document): boolean {
        const rootElement = xmlDoc.documentElement;

        if (!rootElement) {
            return false;
        }

        // Check for ReqIF namespace
        const reqifNamespace = 'http://www.omg.org/spec/ReqIF/20110401/reqif.xsd';
        const hasReqIFNamespace =
            rootElement.namespaceURI === reqifNamespace ||
            rootElement.getAttribute('xmlns') === reqifNamespace ||
            rootElement.lookupNamespaceURI('reqif') === reqifNamespace;

        // Check for REQ-IF root element
        const isReqIFRoot =
            rootElement.localName === 'REQ-IF' ||
            rootElement.tagName === 'REQ-IF' ||
            rootElement.tagName === 'reqif:REQ-IF';

        return hasReqIFNamespace && isReqIFRoot;
    }
}

// Export convenience function for backward compatibility
// export const importReqif = ReqifImporter.import.bind(ReqifImporter);
