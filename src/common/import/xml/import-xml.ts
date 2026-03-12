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

import { DEF } from '../../lib/definitions';
import { IRsp, Rsp, Msg, rspOK } from '../../lib/messages';
import { LOG } from '../../lib/helpers';
import { PIN } from '../../lib/platform-independence';
import { APackage, TPigItem, PigItem, PigItemType, PigItemTypeValue } from '../../schema/pig/ts/pig-metaclasses';

/**
 * XML Importer
 * Static class for importing and parsing PIG XML documents
 */
export class XmlImporter {
    private static readonly maxSizeInput = DEF.maxSizeXML;

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

        // Security: Size limit check
        if (xmlString.length > this.maxSizeInput) {
            return Msg.create(
                660,
                typeof(source) === 'string'? source : 'unknown',
                `file too large (max ${this.maxSizeInput / 1024 / 1024}MB)`
            );
        }

        // Validate XML syntax
        const validationResult = this.checkXmlSyntax(xmlString);
        if (!validationResult.ok) {
            return validationResult;
        }

        // check schema
        const schemaResult = this.checkXmlSchema(xmlString);
        if (!schemaResult.ok) {
            return schemaResult;
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
     * Check XML syntax before parsing
     * 
     * @param xmlString - XML string to validate
     * @returns IRsp indicating success or error
     * @private
     */
    static checkXmlSyntax(xmlString: string): IRsp {
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
            return Msg.create(690, 'XML', errorMessage);
        }
    }

    /**
     * Check schema
     * @param xmlString - XML-String
     * @returns IRsp
     */
    static checkXmlSchema(xmlString: string): IRsp {
        const parser = PIN.createDOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const parserError = PIN.getXmlParseError(doc);
        if (parserError) {
            return Msg.create(690, 'XML', parserError.textContent || 'Unknown XML parsing error');
        }

        // LOG.debug('import-xml', doc);
        const invalidTags: string[] = [];
        const invalidIds: string[] = [];
        const missingProperty: string[] = [];

        // Check root element
        const root = doc.documentElement;
        if (!root) {
            return Msg.create(682, '(no Root)');
        }
        if (root.tagName !== PigItemType.aPackage) {
            return Msg.create(682, root.tagName);
        }

        // Check package id
        // At this stage we expect only a string like in JSON-LD schema ... the id is normalized later
        const pkgId = root.getAttribute('id');
        //    if (!pkgId || !PigItem.isValidIdString(pkgId)) {
        if (typeof pkgId !== 'string' || pkgId.length<DEF.minLengthId) {
            invalidIds.push(`aPackage: ${pkgId ?? '(missing)'}`);
        }

        // Find graph element among child nodes (only element nodes)
        let graph: Element | undefined;
        for (let i = 0; i < root.childNodes.length; i++) {
            const node = root.childNodes[i];
            if (node.nodeType === 1 && (node as Element).tagName === 'graph') {
                graph = node as Element;
                break;
            }
        }

        if (graph) {
            for (let i = 0; i < graph.childNodes.length; i++) {
                const node = graph.childNodes[i];
                if (node.nodeType === 1) {
                    const elem = node as Element;
                    const tag = elem.tagName as PigItemTypeValue;
                    // Check if tag is instantiable
                    if (!PigItem.isInstantiable(tag)) {
                        invalidTags.push(tag);
                    }
                    else {
                        // Check id of graph element
                        // At this stage we expect only a string like in JSON-LD schema ... the id is normalized later
                        const elId = elem.getAttribute('id');
                        // if (!elId || !PigItem.isValidIdString(elId)) {
                        if (typeof elId !== 'string' || elId.length < DEF.minLengthId) {
                            invalidIds.push(`${tag}: ${elId ?? '(missing)'}`);
                        }
                        else {
                            // LOG.debug('import-xml', `Checking element <${tag}> with id="${elId}"`);
                            // Check for class requirements
                            if (PigItem.isClass(tag)) {
                                // Must have either 'pig:specializes' or 'pig:hasClass' as attribute or child
                                // XML is more tolerant than JSON-LD, as it allows both pig and RDF/OWL terms for specialization and classification
                                // The MVF must however map both to the same internal keys
                                // LOG.debug('import-xml 1', elem.getAttribute('pig:specializes'), elem.getAttribute('owl:subClassOf'), elem.getAttribute('pig:hasClass'), elem.getAttribute('rdf:type') );
                                const specializesAttr = elem.getAttribute(`${DEF.pfxNsMeta}specializes`) || elem.getAttribute('owl:subClassOf');  // don't use '??'
                                const hasClassAttr = elem.getAttribute(`${DEF.pfxNsMeta}hasClass`) || elem.getAttribute('rdf:type');  // don't use '??'
                                let specializesChild = false;
                                let hasClassChild = false;
                                for (let j = 0; j < elem.childNodes.length; j++) {
                                    const child = elem.childNodes[j];
                                    if (child.nodeType === 1) {
                                        const childTag = (child as Element).tagName;
                                        if ([`${DEF.pfxNsMeta}specializes`, 'owl:subClassOf'].includes(childTag)) specializesChild = true;
                                        if ([`${DEF.pfxNsMeta}hasClass`, 'rdf:type'].includes(childTag)) hasClassChild = true;
                                    }
                                }
                                // LOG.debug('import-xml 2', specializesAttr, hasClassAttr, specializesChild, hasClassChild);
                                if (!(specializesAttr || hasClassAttr || specializesChild || hasClassChild)) {
                                    missingProperty.push(`${tag} with id ${elId ?? '(missing id)'} requires either '${DEF.pfxNsMeta}specializes' or '${DEF.pfxNsMeta}hasClass'`);
                                }
                            }
                            // Check for instance requirements
                            else if (PigItem.isInstance(tag)) {
                                // Must have 'pig:hasClass' as attribute or child and a child 'dcterms:modified'
                                const hasClassAttr = elem.getAttribute(`${DEF.pfxNsMeta}hasClass`) || elem.getAttribute('rdf:type');  // don't use '??'
                                let hasClassChild = false;
                                let modifiedChild = false;
                                for (let j = 0; j < elem.childNodes.length; j++) {
                                    const child = elem.childNodes[j];
                                    if (child.nodeType === 1) {
                                        const childTag = (child as Element).tagName;
                                        if ([`${DEF.pfxNsMeta}hasClass`, 'rdf:type'].includes(childTag)) hasClassChild = true;
                                        if (childTag === 'dcterms:modified') modifiedChild = true;
                                    }
                                }
                                if (!(hasClassAttr || hasClassChild)) {
                                    missingProperty.push(`${tag} with id ${elId ?? '(missing id)'} requires '${DEF.pfxNsMeta}hasClass'`);
                                }
                                if (!modifiedChild) {
                                    missingProperty.push(`${tag} with id ${elId ?? '(missing id)'} requires 'dcterms:modified'`);
                                }
                            }
                            else
                                throw new Error(`import-xml: After checking the itemType, the element must be either class od instance`);
                        }
                    }

                }
            }
        } else {
            return Msg.create(682, '(no graph)');
        }

        if (invalidTags.length > 0) {
            return Msg.create(682, invalidTags.join(', '));
        }
        if (invalidIds.length > 0) {
            return Msg.create(632, 'id', invalidIds.join(', '));
        }
        if (missingProperty.length > 0) {
            return Msg.create(681, PigItemType.aPackage, pkgId??'unknown', 'Missing Property: '+missingProperty.join('; '));
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
// export const importXML = XmlImporter.import.bind(XmlImporter);
