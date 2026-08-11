/*!
 * Imports an FMI model description (FMI 2.0 or FMI 3.0) and transforms it using the FMI-to-CAS stylesheet.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * FMI Importer - Static class for importing FMI models
 *
 * Accepts either:
 *  - a packaged FMU (.fmu, a ZIP archive containing modelDescription.xml at its root), or
 *  - a raw modelDescription.xml (.xml).
 *
 * The model description is transformed with the FMI-to-CAS stylesheet into a
 * self-contained CAS package that embeds both a small 'fmi:' ontology layer and
 * the instance data extracted from the model.
 *
 * Authors: rakshit.mittal@uantwerpen.be
 */

import { unzipSync, strFromU8 } from 'fflate';

import { DEF } from '../../lib/definitions';
import { LOG } from '../../lib/helpers';
import { PLI } from '../../lib/platform-independence';
import { IRsp, Msg, Rsp } from '../../lib/messages';
import { APackage } from '../../schema/pig/ts/pig-metaclasses';
import { XmlImporter } from '../xml/import-xml';

/**
 * FMI Importer
 * Static class for importing and transforming FMI model descriptions to CAS format.
 */
export class FmiImporter {
    private static readonly maxSizeInput = DEF.maxSizeXML;
    private static readonly modelDescriptionName = 'modelDescription.xml';

    /**
     * Import an FMI model and transform it to CAS items.
     *
     * @param source - File path (Node.js), URL, or File/Blob object (Browser)
     * @returns IRsp containing array of TPigItem (first item is APackage, rest are graph items)
     *
     * @example
     * // Node.js
     * const result = await FmiImporter.import('./model.fmu');
     *
     * @example
     * // Browser
     * const file = fileInput.files[0];
     * const result = await FmiImporter.import(file);
     */
    static async import(source: string | File): Promise<IRsp<unknown>> {
        // Extract filename for validation and logging
        const filename = typeof source === 'string' ? source : source.name;

        // Normalize filename/URL for extension check (strip query/fragment, lower-case)
        const normalized = filename.split(/[?#]/, 1)[0].toLowerCase();
        const isFmu = normalized.endsWith('.fmu');
        const isXml = normalized.endsWith('.xml');

        if (!isFmu && !isXml) {
            return Msg.create(660, filename, 'expected .fmu archive or .xml model description');
        }

        // Obtain the modelDescription.xml content (unzip .fmu, or read .xml directly)
        let xmlToTransform: string;
        if (isFmu) {
            const rspXml = await this.extractModelDescription(source, filename);
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

        // Security: size limit check
        if (xmlToTransform.length > this.maxSizeInput) {
            return Msg.create(
                660,
                filename,
                `model description too large (max ${this.maxSizeInput / 1024 / 1024}MB)`
            );
        }

        // Parse and validate the FMI document structure
        const parser = PLI.createDOMParser();
        const xmlDoc = parser.parseFromString(xmlToTransform, 'text/xml');

        const sourceError = PLI.getXmlParseError(xmlDoc);
        if (sourceError) {
            return Msg.create(
                660,
                filename,
                sourceError.textContent ?? 'Unknown XML parsing error'
            );
        }

        if (!this.isValid(xmlDoc)) {
            return Msg.create(
                660,
                filename,
                'missing fmiModelDescription root element'
            );
        }

        // Get stylesheet path and transform document
        const stylesheetPath = this.getStylesheetPath('FMI-to-CAS.sef.json');

        const rspTransform = await PLI.transformXSL(xmlToTransform, stylesheetPath);
        if (!rspTransform.ok) {
            return rspTransform;
        }

        const xmlString = rspTransform.response as string;

        // Check schema of the transformed CAS XML
        const schemaResult = XmlImporter.checkXmlSchema(xmlString);
        if (!schemaResult.ok) {
            return schemaResult;
        }

        // Instantiate APackage from transformed XML
        const aPackage = new APackage().setXML(xmlString);

    /*    if (!aPackage.status().ok) {
            return aPackage.status();
        }
    */
        // Get all items (package + graph items)
        const allItems = aPackage.getItems();

        const expectedCount = aPackage.graph?.length || 0;
        const actualCount = allItems.length - 1; // -1 for package itself

        let result: IRsp;
        if (actualCount === expectedCount) {
        //    LOG.info( `FmiImporter: successfully imported ${filename} with all ${actualCount} items` );
            result = Rsp.create(0, allItems, 'json');
        } else {
            const errorDetails = this.buildErrorReport(allItems);
            LOG.warn( `FmiImporter: imported ${actualCount} of ${expectedCount} items from ${filename}${errorDetails}` );
            result = Rsp.create(604, allItems, 'json', 'FMI', actualCount, expectedCount);
        }

        return result;
    }

    /**
     * Read a .fmu (ZIP) archive and return the text content of modelDescription.xml.
     *
     * @param source - File path (Node.js), URL, or File/Blob (Browser)
     * @param filename - original filename for error messages
     * @returns IRsp whose response is the modelDescription.xml string
     * @private
     */
    private static async extractModelDescription(
        source: string | File,
        filename: string
    ): Promise<IRsp<unknown>> {
        const rspBytes = await PLI.readFileAsBytes(source);
        if (!rspBytes.ok) {
            return rspBytes;
        }

        const bytes = rspBytes.response as Uint8Array;

        let entries: Record<string, Uint8Array>;
        try {
            // Only the modelDescription.xml is needed from the archive.
            entries = unzipSync(bytes, {
                filter: (file) => file.name === this.modelDescriptionName
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return Msg.create(660, filename, `failed to read FMU archive: ${msg}`);
        }

        const entry = entries[this.modelDescriptionName];
        if (!entry) {
            return Msg.create(
                660,
                filename,
                `archive does not contain ${this.modelDescriptionName}`
            );
        }

        try {
            return Rsp.create(0, strFromU8(entry), 'text');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return Msg.create(660, filename, `failed to decode ${this.modelDescriptionName}: ${msg}`);
        }
    }

    /**
     * Get platform-specific path to the FMI-to-CAS stylesheet.
     *
     * @returns Path/URL to FMI-to-CAS.sef.json
     * @private
     */
    private static getStylesheetPath(filename: string): string {
        if (PLI.isBrowserEnv()) {
            const baseUrl = window.location.origin;
            return `${baseUrl}/${DEF.xslPath}${filename}`;
        } else {
            return `./public/${DEF.xslPath}${filename}`;
        }
    }

    /**
     * Build a detailed error report for failed items.
     *
     * @param allItems - All items including the package
     * @returns Formatted error report string
     * @private
     */
    private static buildErrorReport(allItems: any[]): string {
        let errorReport = '\nErroneous items:';

        for (let i = 1; i < allItems.length; i++) {
            const status = allItems[i].status();
            if (!status.ok) {
                errorReport += `\n- graph[${i}]: (${status.status}) ${status.statusText}`;
            }
        }

        return errorReport;
    }

    /**
     * Validate that the XML document is an FMI model description.
     *
     * Checks for the fmiModelDescription root element (FMI 2.0 and FMI 3.0 both use it).
     *
     * @param xmlDoc - The XML document to validate
     * @returns True if the document is a valid FMI model description
     * @private
     */
    private static isValid(xmlDoc: Document): boolean {
        const rootElement = xmlDoc.documentElement;
        if (!rootElement) {
            return false;
        }
        return (
            rootElement.localName === 'fmiModelDescription' ||
            rootElement.tagName === 'fmiModelDescription'
        );
    }
}
