/*!
 * Cross-environment XML importer.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * XML Importer - Static class for importing PIG XML documents
 * 
 * Cross-environment XML importer:
 * - Accepts a Node file path, an http(s) URL string or a browser File/Blob.
 * - Parses XML document, converts XML structure to internal keys
 *   and instantiates matching PIG class instances where possible.
 *
 * Authors: oskar.dungern@gfse.org
 * 
 * Design Decisions:
 * - Static class design for consistency with ReqIFImporter
 * - Direct parsing without XSLT transformation (unlike ReqIF)
 * - Validation through APackage.setXML() method
 * 
 * Usage:
 * - Node:   await XmlImporter.import('C:/path/to/file.xml')
 * - URL:    await XmlImporter.import('https://example/.../doc.xml')
 * - Browser: await XmlImporter.import(fileInput.files[0])
 */

import { IRsp, Rsp, Msg, rspOK } from '../../lib/messages';
import { LOG } from '../../lib/helpers';
import { PIN } from '../../lib/platform-independence';
import { APackage, TPigItem } from '../../schema/pig/ts/pig-metaclasses';

/**
 * XML Importer
 * Static class for importing and parsing PIG XML documents
 */
export class XmlImporter {
    /**
     * Import XML document and instantiate PIG items
     * 
     * @param source - File path (Node.js), URL, or File/Blob object (Browser)
     * @returns IRsp containing array of TPigItem (first item is APackage, rest are graph items)
     * 
     * @example
     * // Node.js
     * const result = await XmlImporter.import('./package.xml');
     * 
     * @example
     * // Browser
     * const file = fileInput.files[0];
     * const result = await XmlImporter.import(file);
     * 
     * @example
     * // URL
     * const result = await XmlImporter.import('https://example.org/data.xml');
     */
    static async import(source: string | File | Blob): Promise<IRsp> {
        // Read file content
        const rsp = await PIN.readFileAsText(source);
        if (!rsp.ok) {
            return rsp;
        }

        const xmlString = rsp.response as string;

        // Validate XML syntax
        const validationResult = this.validateXmlSyntax(xmlString);
        if (!validationResult.ok) {
            return validationResult;
        }

        // Instantiate APackage directly from XML string
        // APackage.setXML() handles:
        // - XML to JSON conversion
        // - Schema validation
        // - Constraint checking
        // - Graph item instantiation
        const aPackage = new APackage().setXML(xmlString);

        // Get all items (package + graph items)
        const allItems = aPackage.getItems();

        // Calculate import statistics
        const expectedCount = aPackage.graph?.length || 0;
        const actualCount = allItems.length - 1; // -1 for package itself

        // Build result response
        let result: IRsp;
        if (actualCount === expectedCount) {
            LOG.info(
                `XmlImporter: successfully imported package with all ${actualCount} items`
            );
            result = Rsp.create(0, allItems, 'json');
        } else {
            // Log details about erroneous items
            const errorDetails = this.buildErrorReport(allItems);
            LOG.warn(
                `XmlImporter: imported ${actualCount} of ${expectedCount} items${errorDetails}`
            );

            result = Rsp.create(691, allItems, 'json', 'XML', actualCount, expectedCount);
        }

        return result as IRsp<TPigItem[]>;
    }

    /**
     * Validate XML syntax before parsing
     * 
     * @param xmlString - XML string to validate
     * @returns IRsp indicating success or error
     * @private
     */
    private static validateXmlSyntax(xmlString: string): IRsp {
        try {
            const parser = PIN.createDOMParser();
            const doc = parser.parseFromString(xmlString, 'text/xml');
            const parserError = PIN.getXmlParseError(doc);

            if (parserError) {
                const errorMessage =
                    parserError.textContent || 'Unknown XML parsing error';
                return Msg.create(690, 'XML', errorMessage);
            }

            return rspOK;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            return Msg.create(690, 'JSON-LD', errorMessage);
        }
    }

    /**
     * Build detailed error report for failed items
     * 
     * @param allItems - All items including package
     * @returns Formatted error report string
     * @private
     */
    private static buildErrorReport(allItems: TPigItem[]): string {
        let errorReport = '\nErroneous items:';

        for (let i = 1; i < allItems.length; i++) {
            const status = allItems[i].status();
            if (!status.ok) {
                errorReport += `\n- graph[${i}]: (${status.status}) ${status.statusText}`;
            }
        }

        return errorReport;
    }
}

// Export convenience function for backward compatibility
// export const importXML = XmlImporter.import.bind(XmlImporter);
