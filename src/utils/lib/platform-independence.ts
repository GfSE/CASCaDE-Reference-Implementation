/*!
 * Platform Independence Utilities
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * Platform Independence Utilities
 * Provides platform-agnostic implementations for browser and Node.js environments.
 * 
 * Security Note: Uses @xmldom/xmldom for Node.js XML parsing, which has known
 * vulnerabilities. See SECURITY.md for details and mitigation measures.
 * 
 * Dependencies:
 * - @xmldom/xmldom (Node.js only, dynamically loaded)
 * - saxon-js (for XSLT transformations, works in both environments)
 * 
 * Authors: oskar.dungern@gfse.org
 * License: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { IRsp, Rsp, Msg } from './messages';
import { LOG } from './helpers';
import SaxonJS from 'saxon-js';

/**
 * Platform-independent DOM Node Type constants
 * These mirror the standard DOM Node.* constants but work in both browser and Node.js
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
 */
export const NodeType = {
    ELEMENT_NODE: 1,   // (e.g., <p>, <div>)
    ATTRIBUTE_NODE: 2,   // (deprecated but included for completeness)
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11
} as const;

// Type for Node.js process object
interface NodeProcess {
    versions?: {
        node?: string;
    };
}

// Cache for loaded modules
let cachedDOMParser: typeof DOMParser | null = null;
let cachedXMLSerializer: typeof XMLSerializer | null = null;

export const PIN = {
    /**
     * Transform XML using XSLT with Saxon-JS
     * Works in both Node.js and browser environments
     * 
     * @param xmlContent - The XML content to transform
     * @param sefPath - Path to the compiled XSLT stylesheet (SEF.JSON)
     * @returns IRsp with transformed XML as string or error
     */
    async transformXSL(
        xmlContent: string,
        sefPath: string
    ): Promise<IRsp<unknown>> {
        try {
            // Load compiled XSLT stylesheet
            const sefResult = await PIN.readFileAsText(sefPath);
            if (!sefResult.ok)
                return sefResult;

        //    LOG.debug(`PIN.transformXSL: loaded SEF stylesheet from ${sefPath}`);
            const output = await SaxonJS.transform(
                {
                    stylesheetText: sefResult.response as string,
                    sourceText: xmlContent,
                    destination: 'serialized'
                },
                'async'
            );

        //    LOG.debug(`PIN.transformXSL: transformation completed successfully`, output);
            return Rsp.create(0, output.principalResult as string, 'text');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return Msg.create(660, 'XSL', errorMessage);
        }
    },

    /**
     * Check if Saxon-JS is available and get version info
     */
    getSaxonInfo(): IRsp<unknown> {
        try {
            const info = SaxonJS.getProcessorInfo();
            return {
                status: 0,
                statusText: 'Saxon-JS information retrieved',
                response: info,
                responseType: 'json'
            };
        } catch (error) {
            return {
                status: 999,
                statusText: 'Saxon-JS is not available in this environment',
                responseType: 'text'
            };
        }
    },

    /**
     * Get platform-appropriate DOMParser
     * - In browser: use native DOMParser
     * - In Node.js: use @xmldom/xmldom (cached after first load)
     */
    getDOMParser(): typeof DOMParser {
        if (typeof DOMParser !== 'undefined') {
            return DOMParser;
        }

        if (cachedDOMParser) {
            return cachedDOMParser;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const xmldom = require('@xmldom/xmldom');
            cachedDOMParser = xmldom.DOMParser as typeof DOMParser;
            return cachedDOMParser;
        } catch (e) {
            throw new Error(
                'DOMParser not available - in Node.js, install @xmldom/xmldom: npm install @xmldom/xmldom'
            );
        }
    },

    /**
     * Create a new DOMParser instance for the current environment
     */
    createDOMParser(): DOMParser {
        const ParserClass = this.getDOMParser();
        return new ParserClass();
    },

    /**
     * Get platform-appropriate XMLSerializer
     * - In browser: use native XMLSerializer
     * - In Node.js: use @xmldom/xmldom (cached after first load)
     */
    getXMLSerializer(): typeof XMLSerializer {
        if (typeof XMLSerializer !== 'undefined') {
            return XMLSerializer;
        }

        if (cachedXMLSerializer) {
            return cachedXMLSerializer;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const xmldom = require('@xmldom/xmldom');
            cachedXMLSerializer = xmldom.XMLSerializer as typeof XMLSerializer;
            return cachedXMLSerializer;
        } catch (e) {
            throw new Error(
                'XMLSerializer not available - in Node.js, install @xmldom/xmldom: npm install @xmldom/xmldom'
            );
        }
    },

    /**
     * Create a new XMLSerializer instance for the current environment
     */
    createXMLSerializer(): XMLSerializer {
        const SerializerClass = this.getXMLSerializer();
        return new SerializerClass();
    },

    /**
     * Parse XML string to Document using platform-appropriate parser
     */
    parseXML(xmlString: string, mimeType: 'text/xml' | 'application/xml' = 'text/xml'): Document {
        const parser = this.createDOMParser();
        return parser.parseFromString(xmlString, mimeType);
    },

    /**
     * Serialize Document to XML string using platform-appropriate serializer
     */
    serializeXML(doc: Document | Node): string {
        const serializer = this.createXMLSerializer();
        return serializer.serializeToString(doc);
    },

    /**
     * Check if XML string has parser errors
     * @returns Error message if parsing failed, null if successful
     */
    validateXML(xmlString: string): string | null {
        try {
            const doc = this.parseXML(xmlString);
            const parseError = doc.querySelector('parsererror');

            if (parseError) {
                return parseError.textContent || 'XML parsing error';
            }

            return null;
        } catch (e) {
            return e instanceof Error ? e.message : String(e);
        }
    },

    /**
     * Check if XML parsing resulted in an error
     * Platform-independent error detection for DOMParser results
     * 
     * @param doc - Document returned by DOMParser.parseFromString()
     * @returns Error element if parsing failed, null if successful
     * 
     * @example
     * const doc = parser.parseFromString(xml, 'text/xml');
     * const error = PIN.getXmlParseError(doc);
     * if (error) {
     *     console.error('Parse error:', error.textContent);
     * }
     */
    getXmlParseError(doc: Document): Element | null {
        // Method 1: Check if root element is parsererror (common in browsers)
        if (doc.documentElement?.nodeName === 'parsererror') {
            return doc.documentElement;
        }

        // Method 2: Search for parsererror element (works in both environments)
        // getElementsByTagName is DOM Level 1 and supported by @xmldom/xmldom
        const errors = doc.getElementsByTagName('parsererror');
        if (errors && errors.length > 0) {
            return errors[0];
        }

        return null;
    },

    /**
     * Load text from Node file path, HTTP(S) URL or browser File/Blob
     */

    async readFileAsText(source: string | File | Blob): Promise<IRsp<unknown>> {
        if (typeof source === 'string') {
            // string can be a URL or a Node filesystem path
            if (this.isHttpUrl(source)) {
                // browser or Node fetch
                try {
                    const resp = await fetch(source);
                    if (!resp.ok) {
                        return Msg.create(692, source, resp.statusText);
                    }
                    const text = await resp.text();
                    return Rsp.create(0, text, 'text');
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    return Msg.create(693, source, msg);
                }
            }
            // assume Node path: dynamic import to avoid bundling 'fs' into browser build
            if (this.isNodeEnv()) {
                try {
                    const { readFile } = await import('fs/promises');

                    const data = await readFile(source, { encoding: 'utf8' });
                    return Rsp.create(0, data, 'text');

                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    return Msg.create(694, source, msg);
                }
            }

            return Msg.create(695);  // not an http(s) URL and not running in Node
        }


        if (typeof (source as Blob).text === 'function') {
            try {
                const text = await (source as Blob).text();
                return Rsp.create(0, text, 'text');
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                return Msg.create(694, '', msg);
            }
        }

        return Msg.create(696); // unsupported source type
    },

    /**
     * Get innerHTML of an element (platform-independent)
     * Polyfill for xmlElement.innerHTML which is not available in @xmldom/xmldom
     * 
     * Works in both browser and Node.js environments.
     * Returns serialized HTML content of all child nodes.
     * 
     * @param element - DOM Element
     * @returns HTML content as string (child nodes serialized without escaping)
     * 
     * @example
     * // Browser and Node.js compatible
     * const html = PIN.innerHTML(element);
     * console.log(html); // "<p>Hello</p><span>World</span>"
     */
    innerHTML(element: Element): string {
        // Browser: Use native innerHTML if available
        if ('innerHTML' in element && typeof element.innerHTML === 'string') {
            return element.innerHTML;
        }

        // Node.js/xmldom: Serialize child nodes manually
        try {
            const SerializerClass = this.getXMLSerializer();
            const serializer = new SerializerClass();
            const parts: string[] = [];

            for (const child of Array.from(element.childNodes)) {
                parts.push(serializer.serializeToString(child));
            }

            return parts.join('').trim();
        } catch (e) {
            // Ultimate fallback: return text content
            LOG.warn('PIN.innerHTML: XMLSerializer failed, falling back to textContent');
            return element.textContent || '';
        }
    /*    } catch(e) {
            // Fallback: Manual serialization if XMLSerializer not available
            return manualSerializeHtml(element);
        } */
    },

    /**
     * Check if string is an HTTP(S) URL
     */
    isHttpUrl(s: string): boolean {
        return /^https?:\/\//i.test(s);
    },

    /**
     * Check if running in Node.js environment
     */
    isNodeEnv(): boolean {
        const p = (globalThis as Record<string, unknown>).process as NodeProcess | undefined;
        return typeof p !== 'undefined' && !!(p.versions && p.versions.node);
    },

    /**
     * Check if running in browser environment
     */
    isBrowserEnv(): boolean {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    }
};
/**
 * Serialize XML element content to HTML string (platform-independent)
 * Preserves HTML structure WITHOUT XML escaping
 * Works in both browser and Node.js with @xmldom/xmldom
 * 
 * @param element - XML DOM Element to serialize
 * @returns HTML content as string (unescaped)
 * /
function serializeXmlContent(element: ElementXML): string {
    // ✅ Use PIN.getXMLSerializer() for platform independence
    try {
        const SerializerClass = PIN.getXMLSerializer();
        const serializer = new SerializerClass();
        const children: string[] = [];

        for (const child of Array.from(element.childNodes)) {
            children.push(serializer.serializeToString(child));
        }

        return children.join('').trim();
    } catch (e) {
        // Fallback: Manual serialization if XMLSerializer not available
        return manualSerializeHtml(element);
    }
} */

/**
 * Manual HTML serialization for child nodes (preserves HTML structure)
 * Does NOT escape HTML entities - preserves them as-is
 * 
 * @param element - Element containing HTML content
 * @returns HTML string with preserved structure
 * /
function manualSerializeHtml(element: ElementXML): string {
    const parts: string[] = [];

    for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const elem = child as ElementXML;
            parts.push(serializeHtmlElement(elem));
        } else if (child.nodeType === NodeType.TEXT_NODE) {
            // ✅ NO ESCAPING - preserve text as-is
            const text = child.textContent || '';
            if (text.trim()) {
                parts.push(text);
            }
        }
    }

    return parts.join('').trim();
} */
/**
 * Serialize a single HTML element (recursively)
 * Preserves HTML structure without XML escaping
 * 
 * @param elem - Element to serialize
 * @returns HTML string
 * /
function serializeHtmlElement(elem: ElementXML): string {
    const tagName = elem.tagName.toLowerCase(); // Use lowercase for HTML
    const attributes: string[] = [];

    // Serialize attributes
    for (const attr of Array.from(elem.attributes)) {
        // ✅ Only escape quotes in attribute values, not the content
        const attrValue = attr.value.replace(/"/g, '&quot;');
        attributes.push(`${attr.name}="${attrValue}"`);
    }

    const attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';

    // Self-closing tags (HTML5 void elements)
    const voidElements = new Set(['br', 'hr', 'img', 'input', 'link', 'meta']);
    if (voidElements.has(tagName) && !elem.hasChildNodes()) {
        return `<${tagName}${attrString}>`;
    }

    // Serialize children
    const children: string[] = [];
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            children.push(serializeHtmlElement(child as ElementXML));
        } else if (child.nodeType === NodeType.TEXT_NODE) {
            // ✅ NO ESCAPING - preserve text content as-is
            children.push(child.textContent || '');
        }
    }

    return `<${tagName}${attrString}>${children.join('')}</${tagName}>`;
} */

