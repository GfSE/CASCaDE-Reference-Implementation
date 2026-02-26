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

import { LOG } from '../../../utils/lib/helpers';
import { PIN } from '../../../utils/lib/platform-independence';
import { IRsp, Msg, rspOK } from '../../../utils/lib/messages';
import { APackage, TPigItem } from '../../../utils/schemas/pig/ts/pig-metaclasses';
import { ConstraintCheckType } from '../../../utils/schemas/pig/ts/pig-package-constraints';

/**
 * ReqIF Importer
 * Static class for importing and transforming ReqIF documents to PIG format
 */
export class ReqifImporter {
    private static readonly MAX_XML_SIZE = 4 * 1024 * 1024; // 4MB

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
     * const result = await ReqIFImporter.import(file);
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
        const rspRead = await PIN.readFileAsText(source);
        if (!rspRead.ok) {
            return rspRead;
        }

        const xmlString = rspRead.response as string;

        // Security: Size limit check
        if (xmlString.length > this.MAX_XML_SIZE) {
            return Msg.create(
                660,
                filename,
                `file too large (max ${this.MAX_XML_SIZE / 1024 / 1024}MB)`
            );
        }

        // Security: Basic XML structure validation
        const trimmed = xmlString.trim();
        if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<')) {
            return Msg.create(660, filename, 'invalid XML structure');
        }

        // Parse XML document
        const parser = PIN.createDOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        // Check for parsing errors
        const sourceError = PIN.getXmlParseError(xmlDoc);
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
        LOG.debug(`ReqIFImporter: using stylesheet path: ${stylesheetPath}`);

        const rspTransform = await PIN.transformXSL(xmlString, stylesheetPath);
        if (!rspTransform.ok) {
            return Msg.create(
                660,
                filename,
                rspTransform.statusText ?? 'Transformation failed'
            );
        }

        // Instantiate APackage from transformed XML
        const aPackage = new APackage().setXML(rspTransform.response as string, {
            checkConstraints: [
                ConstraintCheckType.UniqueIds
                // Input has only instances, so omit constraint checks on classes
                //    ConstraintCheckType.aPropertyHasClass,
                //    ConstraintCheckType.aLinkHasClass,
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

        LOG.info(
            `ReqIFImporter: successfully imported ${filename} with ${allItems.length - 1} items`
        );

        // Return success response with items (clone rspOK to avoid shared-state mutation)
        const result: IRsp<TPigItem[]> = {
            ...rspOK,
            response: allItems,
            responseType: 'json'
        };

        return result;
    }

    /**
     * Get platform-specific path to ReqIF-to-PIG stylesheet
     * 
     * @returns Path/URL to ReqIF-to-PIG.sef.json
     * @private
     */
    private static getStylesheetPath(): string {
        if (PIN.isBrowserEnv()) {
            // Browser: fetch from public directory via HTTP
            const baseUrl = window.location.origin;
            return `${baseUrl}/assets/xslt/ReqIF-to-PIG.sef.json`;
        } else {
            // Node.js: read from local public directory
            return './public/assets/xslt/ReqIF-to-PIG.sef.json';
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
