/*!
 * XSL Transformation Utilities
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * Utilities for applying XSL transformations to XML documents.
 * Uses native browser XSLT support via XSLTProcessor.
 * In Node.js environment, DOM APIs are polyfilled but XSLT is not supported - tests requiring XSLT should run in browser via Karma.
 */

import './node-polyfills'; // DOM polyfills for Node.js
import { IRsp, Rsp, Msg } from './messages';

/**
 * Applies an XSL transformation to an XML document.
 * 
 * @param xmlDoc - The XML document to transform
 * @param xslStylesheet - The XSL stylesheet to apply
 * @returns IRsp containing the transformed XML document or error messages
 */
export function transformXSL(xmlDoc: Document, xslStylesheet: Document): IRsp<unknown> {
    const xsltProcessor = new XSLTProcessor();

    try {
        xsltProcessor.importStylesheet(xslStylesheet);
        const resultDoc = xsltProcessor.transformToDocument(xmlDoc);

        if (!resultDoc) {
            return Msg.create(660, 'XSL', 'transformation returned null document');
        }

        return Rsp.create(0, resultDoc, 'document') as IRsp<Document>;
    } catch (error) {
        return Msg.create(660, 'XSL', error instanceof Error ? error.message : String(error));
    }
}

/**
 * Applies an XSL transformation and returns the result as a string.
 * 
 * @param xmlDoc - The XML document to transform
 * @param xslStylesheet - The XSL stylesheet to apply
 * @returns IRsp containing the transformed XML as a string or error messages
 */
export function transformXSLToString(xmlDoc: Document, xslStylesheet: Document): IRsp<unknown> {
    const rsp = transformXSL(xmlDoc, xslStylesheet);

    if (!rsp.ok) {
        return rsp;
    }

    try {
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(rsp.response as Document);
        return Rsp.create(0, xmlString, 'text') as IRsp<string>;
    } catch (error) {
        return Msg.create(660, 'XML', error instanceof Error ? error.message : String(error));
    }
}

/**
 * Applies an XSL transformation and returns the result as a fragment.
 * 
 * @param xmlDoc - The XML document to transform
 * @param xslStylesheet - The XSL stylesheet to apply
 * @returns IRsp containing the transformed content as a DocumentFragment or error messages
 */
export function transformXSLToFragment(xmlDoc: Document, xslStylesheet: Document): IRsp<unknown> {
    const xsltProcessor = new XSLTProcessor();

    try {
        xsltProcessor.importStylesheet(xslStylesheet);
        const resultFragment = xsltProcessor.transformToFragment(xmlDoc, document);

        if (!resultFragment) {
            return Msg.create(660, 'XSL', 'transformation returned null fragment');
        }

        return Rsp.create(0, resultFragment, 'document');
    } catch (error) {
        return Msg.create(660, 'XSL', error instanceof Error ? error.message : String(error));
    }
}
