/*!
 * Cross-environment JSON-LD importer.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * JSON-LD Importer - Static class for importing PIG JSON-LD documents
 * 
 * Cross-environment JSON-LD importer:
 * - Accepts a Node file path, an http(s) URL string or a browser File/Blob.
 * - Extracts elements from '@graph' (or 'graph'), converts JSON-LD keys to internal keys
 *   and instantiates matching PIG class instances where possible.
 *
 * Authors: oskar.dungern@gfse.org
 * 
 * Design Decisions:
 * - Static class design for consistency with ReqIFImporter and XmlImporter
 * - Direct JSON-LD processing without transformation
 * - Validation through APackage.setJSONLD() method
 * 
 * Usage:
 * - Node:   await JsonldImporter.import('C:/path/to/file.jsonld')
 * - URL:    await JsonldImporter.import('https://example/.../doc.jsonld')
 * - Browser: await JsonldImporter.import(fileInput.files[0])
 */

import { IRsp, rspOK, Rsp, Msg } from '../../../utils/lib/messages';
import { LOG } from '../../../utils/lib/helpers';
import { PIN } from '../../../utils/lib/platform-independence';
import { APackage, TPigItem } from '../../../utils/schemas/pig/ts/pig-metaclasses';
import { SCH_LD } from '../../../utils/schemas/pig/jsonld/pig-schemata-jsonld';

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
 * JSON-LD Importer
 * Static class for importing and parsing PIG JSON-LD documents
 */
export class JsonldImporter {
    /**
     * Import JSON-LD document and instantiate PIG items
     * 
     * @param source - File path (Node.js), URL, or File/Blob object (Browser)
     * @returns IRsp containing array of TPigItem (first item is APackage, rest are graph items)
     * 
     * @example
     * // Node.js
     * const result = await JsonldImporter.import('./package.jsonld');
     * 
     * @example
     * // Browser
     * const file = fileInput.files[0];
     * const result = await JsonldImporter.import(file);
     * 
     * @example
     * // URL
     * const result = await JsonldImporter.import('https://example.org/data.jsonld');
     */
    static async import(source: string | File | Blob): Promise<IRsp> {
        // Read file content
        const rsp = await PIN.readFileAsText(source);
        if (!rsp.ok) {
            return rsp;
        }

        const text = rsp.response as string;

        // Parse JSON document
        let doc: JsonLdDocument;
        try {
            doc = JSON.parse(text) as JsonLdDocument;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            return Msg.create(690, 'JSON-LD', errorMessage);
        }

        // Validate JSON-LD document structure
        const validationResult = await this.validateJsonLdDocument(doc);
        if (!validationResult.ok) {
            return validationResult;
        }

        // Instantiate APackage and load the document
        const aPackage = new APackage().setJSONLD(doc);

        // Check if package was successfully created
        if (!aPackage.status().ok) {
            return aPackage.status();
        }

        // Get all items (package + graph items)
        const allItems = aPackage.getItems();

        // Calculate import statistics
        const expectedCount = doc['@graph']?.length || 0;
        const actualCount = allItems.length - 1; // -1 for package itself

        // Build result response
        let result: IRsp;
        if (actualCount === expectedCount) {
            LOG.info(
                `JsonldImporter: successfully imported package with all ${actualCount} items`
            );
            result = rspOK;
        } else {
            // Log details about erroneous items
            const errorDetails = this.buildErrorReport(allItems);
            LOG.warn(
                `JsonldImporter: imported ${actualCount} of ${expectedCount} items${errorDetails}`
            );

            result = Rsp.create(691, 'JSON-LD', undefined, '', actualCount, expectedCount);
        }

        // Attach items to response
        result.response = allItems;
        result.responseType = 'json';

        return result as IRsp<TPigItem[]>;
    }

    /**
     * Validate JSON-LD document structure
     * 
     * Checks for:
     * - Valid @context
     * - Valid @graph structure
     * - Schema compliance
     * 
     * @param doc - Parsed JSON-LD document
     * @returns IRsp indicating success or error
     * @private
     */
    private static async validateJsonLdDocument(doc: JsonLdDocument): Promise<IRsp> {
        // Validate entire JSON-LD document structure using schema
        const isValidPackage = await SCH_LD.validatePackageLD(doc);

        if (!isValidPackage) {
            const errors = await SCH_LD.getValidatePackageLDErrors();
            LOG.error('JSON-LD package validation failed:', errors);
            return Msg.create(697, 'JSON-LD', errors);
        }

        return rspOK;
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
// export const importJSONLD = JsonldImporter.import.bind(JsonldImporter);
