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
 * @ToDo:
 * - Extend the constraint checks - very limited now.
 */

import { DEF } from '../../lib/definitions';
import { PLI } from '../../lib/platform-independence';
import { IRsp, Msg, Rsp } from '../../lib/messages';
import { APackage } from '../../schema/pig/ts/pig-metaclasses';
import { XmlImporter } from '../xml/import-xml';
// import { ConstraintCheckType } from '../../schema/pig/ts/pig-package-constraints';

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

        const isZipped = normalized.endsWith('.reqifz') || normalized.endsWith('.reqif.zip');
        const isPlain = normalized.endsWith('.reqif');

        // Validate file extension
        if (!isPlain && !isZipped) {
            return Msg.create(660, filename, 'expected .reqif, .reqifz or .reqif.zip file extension');
        }

        // Read file content, unpacking the archive first if the file is zipped
        let xmlToTransform: string;
        if (isZipped) {
            const rspXml = await this.extractReqif(source, filename);
            if (!rspXml.ok) {
                return rspXml;
            }
            xmlToTransform = rspXml.response as string;
        } else {
            const rspRead = await PLI.readFileAsText(source);
            if (!rspRead.ok) {
                return rspRead;
            }
            xmlToTransform = rspRead.response as string;
        }

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
        const stylesheetPath = this.getStylesheetPath('ReqIF-to-CAS.sef.json');
        // LOG.debug(`ReqIFImporter: using stylesheet path: ${stylesheetPath}`);

        const rspTransform = await PLI.transformXSL(xmlToTransform, stylesheetPath);
        if (!rspTransform.ok) {
            rspTransform.statusText = filename + ': ' + rspTransform.statusText;
            return rspTransform;
        }

        const xmlString = rspTransform.response as string;
        // LOG.debug(`ReqIFImporter: transformed ${filename} to CAS format:`, xmlString);

        // (debug) optionally persist transformed XML here if needed
        // await PLI.writeFile(xmlString, 'from-ReqIF.xml');

        // check schema
        const schemaResult = XmlImporter.checkXmlSchema(xmlString);
        if (!schemaResult.ok) {
            schemaResult.statusText = filename + ': ' + schemaResult.statusText;
            return schemaResult;
        }

        // Write to file (platform-independent)
        // await PLI.writeFile(JSON.stringify(xmlString,null,2), "from-ReqIF.xml");

        // Instantiate APackage from transformed XML
        const aPackage = new APackage().setXML(xmlString /*, {
            checkConstraints: [
                ConstraintCheckType.UniqueIds,
                // Input has only instances, so omit constraint checks on classes
                ConstraintCheckType.aPropertyHasClass,
                ConstraintCheckType.aLinkHasClass
                //    ConstraintCheckType.anEntityHasClass,
                //    ConstraintCheckType.aRelationshipHasClass,
            ] as ConstraintCheckType[]
        } */);

        return { ...aPackage.status(), response: aPackage.getItems(), responseType: 'json' };
    }

    /**
     * Read a .reqifz / .reqif.zip archive and return the text content of the contained .reqif file.
     *
     * @param source - File path (Node.js), URL, or File/Blob (Browser)
     * @param filename - original filename for error messages
     * @returns IRsp whose response is the .reqif XML string
     * @private
     */
    private static async extractReqif(
        source: string | File,
        filename: string
    ): Promise<IRsp<unknown>> {
        const rspBytes = await PLI.readFileAsBytes(source);
        if (!rspBytes.ok) {
            return rspBytes;
        }

        return PLI.extractFromZip(
            rspBytes.response as Uint8Array,
            (name) => name.toLowerCase().endsWith('.reqif'),
            filename
        );
    }

    /**
     * Get platform-specific path to ReqIF-to-PIG stylesheet
     * 
     * @returns Path/URL to ReqIF-to-PIG.sef.json
     * @private
     */
    private static getStylesheetPath(filename: string): string {
        if (PLI.isBrowserEnv()) {
            // Browser: fetch from public directory via HTTP
            const baseUrl = window.location.origin;
            return `${baseUrl}/${DEF.xslPath}${filename}`;
        } else {
            // Node.js: read from local public directory
            return `./public/${DEF.xslPath}${filename}`;
        }
    }

    /**
     * Build detailed error report for failed items
     * 
     * @param allItems - All items including package
     * @returns Formatted error report string
     * @private
     * /
    private static buildErrorReport(allItems: any[]): string {
        let errorReport = '\nErroneous items:';

        for (let i = 1; i < allItems.length; i++) {
            const status = allItems[i].status();
            if (!status.ok) {
                errorReport += `\n- graph[${i}]: (${status.status}) ${status.statusText}`;
            }
        }

        return errorReport;
    } */

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
