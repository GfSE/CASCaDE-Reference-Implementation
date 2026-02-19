/*!
 * Product Information Graph (PIG) - helper routines
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/** Product Information Graph (PIG) - helper routines
 *  Dependencies: none
 *  Authors: oskar.dungern@gfse.org
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 *  Design Decisions:
 *  -
 *
 *  ToDo:
 *  -
 */

/**
 * JSON helper types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export type JsonArray = Array<JsonValue>

export type tagIETF = string; // contains IETF language tag
export type TISODateString = string;

/**
 * Standard XML Namespaces used in PIG XML documents
 * Collected from tests/data/XML files
 * /
const NAMESPACE_MAP: Record<string, string> = {
    'xml': 'http://www.w3.org/XML/1998/namespace',
    'xs': 'http://www.w3.org/2001/XMLSchema#',
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'dcterms': 'http://purl.org/dc/terms/',
    'FMC': 'http://fmc-modeling.org#',
    'IREB': 'https://cpre.ireb.org/en/downloads-and-resources/glossary#',
    'ReqIF': 'https://www.prostep.org/fileadmin/downloads/PSI_ImplementationGuide_ReqIF_V1-7.pdf#',
    'oslc_rm': 'http://open-services.net/ns/rm#',
    'pig': 'https://product-information-graph.org/v0.2/metamodel#',
    'SpecIF': 'https://specif.de/v1.2/schema#',
    'o': 'https://product-information-graph.org/ontology/application#',
    'd': 'https://product-information-graph.org/example#'  // default example namespace
};

/**
 * Generate XML namespace declarations string from NAMESPACE_MAP
 * /
export const XML_NAMESPACES = Object.entries(NAMESPACE_MAP)
    .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
    .join('\n    ');
*/

// LIB object with helper methods
export const LIB = {

    isLeaf(node: JsonValue): boolean {
        return (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean');
    },
    /**
     * Recursively iterates a JSON value and calls `cb` for each primitive (value).
     * - objects: iterates keys
     * - arrays: iterates indices
     *
     * `path` is an array of keys (string for object keys, number for array indices) from the root to the current value.
     *
     * This function does not mutate the input and returns nothing.
     */
    iterateJson(
        node: JsonValue,
        cb: (value: JsonPrimitive, path: Array<string | number>, parent?: JsonObject | JsonArray, key?: string | number) => void,
        path: Array<string | number> = []
    ): void {
        if (node === undefined || node === null)
            return;
        if (LIB.isLeaf(node)) {
            cb(node as JsonPrimitive, path);
            return;
        }
        if (Array.isArray(node)) {
            for (let i = 0; i < node.length; i++) {
                const item = node[i];
                if (LIB.isLeaf(item)) {
                    cb(item as JsonPrimitive, [...path, i], node, i);
                } else {
                    this.iterateJson(item, cb, [...path, i]);
                }
            }
            return;
        }
        // object
        for (const key of Object.keys(node)) {
            const child = (node as JsonObject)[key];
            if (LIB.isLeaf(child)) {
                cb(child as JsonPrimitive, [...path, key], node as JsonObject, key);
            } else {
                this.iterateJson(child, cb, [...path, key]);
            }
        }
    },
    /**
     * Maps all JSON primitives using the provided callback function.
     * - If `mutate === true`, values are replaced in the original object (in-place).
     * - Default: immutable — a new JSON object is returned.
     *
     * The callback receives (value, path) and must return a new JsonPrimitive value.
     */
    mapJson(
        node: JsonValue,
        cb: (value: JsonPrimitive, path: Array<string | number>) => JsonPrimitive,
        options ?: { mutate?: boolean },
        path: Array<string | number> = []
    ): JsonValue {
            const mutate = !!(options && options.mutate);

    if (node === undefined || node === null)
        return node;

    if (LIB.isLeaf(node)) {
        return cb(node as JsonPrimitive, path);
    }

    if (Array.isArray(node)) {
        if (mutate) {
            for (let i = 0; i < node.length; i++) {
                const item = node[i];
                if (LIB.isLeaf(item)) {
                    node[i] = cb(item as JsonPrimitive, [...path, i]);
                } else {
                    node[i] = this.mapJson(item, cb, options, [...path, i]);
                }
            }
            return node;
        }
        const out: JsonArray = [];
        for (let i = 0; i < node.length; i++) {
            const item = node[i];
            out[i] = (LIB.isLeaf(item))
                ? cb(item as JsonPrimitive, [...path, i])
                : this.mapJson(item, cb, options, [...path, i]);
        }
        return out;
    }

    // object
    if (mutate) {
        const obj = node as JsonObject;
        for (const key of Object.keys(obj)) {
            const child = obj[key];
            if (LIB.isLeaf(child)) {
                obj[key] = cb(child as JsonPrimitive, [...path, key]);
            } else {
                obj[key] = this.mapJson(child, cb, options, [...path, key]);
            }
        }
        return obj;
    }

    const outObj: JsonObject = {};
    for (const key of Object.keys(node as JsonObject)) {
        const child = (node as JsonObject)[key];
        outObj[key] = (child === null || typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean')
            ? cb(child as JsonPrimitive, [...path, key])
            : this.mapJson(child, cb, options, [...path, key]);
    }
    return outObj;
    },
    /**
     * Convert a string to an enum member value.
     * - Tries to match enum values first, then (optionally) enum keys (names).
     * - Works for string and numeric enums.
     *
     * Options:
     *  - caseInsensitive (default true)
     *  - matchKey (default false)
     *  - throwOnInvalid (default false)
     *
    stringToEnum<T extends Record<string, string | number>>(
        value: string | null | undefined,
        enumObj: T,
        options?: { caseInsensitive?: boolean; matchKey?: boolean; throwOnInvalid?: boolean }
    ): T[keyof T] | undefined {
        const caseInsensitive = options?.caseInsensitive !== false;
        const matchKey = options?.matchKey === true;
        const throwOnInvalid = options?.throwOnInvalid === true;

        if (value === null || value === undefined) {
            if (throwOnInvalid) throw new Error('LIB.stringToEnum: value is null or undefined');
            return undefined;
        }

        const normalize = (x: unknown) => {
            if (typeof x === 'string' && caseInsensitive) return x.toLowerCase();
            return String(x);
        };

        const needle = normalize(value);

        // match enum values first
        for (const key of Object.keys(enumObj)) {
            const val = enumObj[key];
            if (normalize(val) === needle) return val as T[keyof T];
        }

        // optionally match enum keys (names)
        if (matchKey) {
            for (const key of Object.keys(enumObj)) {
                if (normalize(key) === needle) return enumObj[key] as T[keyof T];
            }
        }

        if (throwOnInvalid) throw new Error(`LIB.stringToEnum: '${value}' is not a valid enum member`);
        return undefined;
    }, */
    /**
     * Remove all undefined values from an object or array recursively.
     * @param value
     * @returns
     */
    stripUndefined(value: any): any {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (Array.isArray(value)) {
            return value.map(v => this.stripUndefined(v));
        }
        if (typeof value === 'object') {
            const out: Record<string, any> = {};
            for (const k of Object.keys(value)) {
                const v = this.stripUndefined((value as Record<string, any>)[k]);
                if (v !== undefined) out[k] = v;
            }
            return out;
        }
        return value;
    },

    /**
     * Wrap XML fragment with root element and namespace declarations
     * Automatically detects namespace prefixes used in the XML and extracts their URIs
     * from existing xmlns declarations in the content.
     * 
     * @param xml - XML fragment (may contain xmlns declarations)
     * @param options - Optional configuration
     * @returns Complete XML document with namespace declarations on root element
     * 
     * @example
     * // XML with existing namespace declarations
     * const xml = '<pig:Item xmlns:pig="https://example.org/pig#">content</pig:Item>';
     * const doc = makeXMLDoc(xml);
     * // Returns: <pig:Package xmlns:pig="https://example.org/pig#">...</pig:Package>
     * 
     * @example
     * // Provide explicit namespace mappings
     * const xml = '<pig:Item>content</pig:Item>';
     * const doc = makeXMLDoc(xml, {
     *     namespaces: { 'pig': 'https://example.org/pig#' }
     * });
     */
    makeXMLDoc(
        xml: string,
        options?: {
            rootTag?: string;                        // Custom root tag (default: 'pig:Package')
            includeXmlDeclaration?: boolean;         // Include <?xml...?> declaration (default: false)
            namespaces?: Record<string, string>;     // Explicit namespace prefix -> URI mappings
            warnOnMissing?: boolean;                 // Warn about prefixes without declarations (default: true)
        }
    ): string {
        const rootTag = options?.rootTag ?? 'pig:Package';
        const includeXmlDecl = options?.includeXmlDeclaration ?? false;
        const explicitNamespaces = options?.namespaces ?? {};
        const warnOnMissing = options?.warnOnMissing ?? true;

        // Extract all namespace declarations from the XML content
        const extractedNamespaces: Record<string, string> = {};
        const xmlnsPattern = /xmlns:(\w+)\s*=\s*["']([^"']+)["']/g;
        let match;
        while ((match = xmlnsPattern.exec(xml)) !== null) {
            extractedNamespaces[match[1]] = match[2];
        }

        // Find all namespace prefixes used in the XML
        const foundPrefixes = new Set<string>();

        // Find prefixes in element tags (opening and closing)
        const elementPattern = /<\/?(\w+):/g;
        while ((match = elementPattern.exec(xml)) !== null) {
            foundPrefixes.add(match[1]);
        }

        // Find prefixes in attribute names
        const attrPattern = /\s(\w+):\w+\s*=/g;
        while ((match = attrPattern.exec(xml)) !== null) {
            foundPrefixes.add(match[1]);
        }

        // Always include the root tag's namespace
        const rootPrefix = rootTag.includes(':') ? rootTag.split(':')[0] : '';
        if (rootPrefix) {
            foundPrefixes.add(rootPrefix);
        }

        // Build final namespace declarations
        const namespacesToInclude: Record<string, string> = {};
        const missingPrefixes: Set<string> = new Set();

        for (const prefix of foundPrefixes) {
            // Priority: explicit > extracted > missing
            if (explicitNamespaces[prefix]) {
                namespacesToInclude[prefix] = explicitNamespaces[prefix];
            } else if (extractedNamespaces[prefix]) {
                namespacesToInclude[prefix] = extractedNamespaces[prefix];
            } else {
                missingPrefixes.add(prefix);
            }
        }

        // Warn about missing namespace declarations
        if (warnOnMissing && missingPrefixes.size > 0) {
            const missingList = Array.from(missingPrefixes).join(', ');
            LOG.warn(
                `makeXMLDoc: Namespace prefixes without URI declarations found: ${missingList}. ` +
                `Provide URIs via options.namespaces or include xmlns declarations in the XML content.`
            );
        }

        // Build namespace declarations string
        const nsDeclarations = Object.entries(namespacesToInclude)
            .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
            .join('\n    ');

        // Remove existing xmlns declarations from content (will be on root element)
        const cleanedXml = xml.replace(/\s+xmlns:\w+\s*=\s*["'][^"']+["']/g, '');

        // Build the complete document
        const xmlDeclaration = includeXmlDecl ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
        const wrappedXml = `${xmlDeclaration}<${rootTag}${nsDeclarations ? ' ' + nsDeclarations : ''}>${cleanedXml}</${rootTag}>`;

        return wrappedXml;
    },

    // Format date using the specified locale
    getLocalDate(dateStr: string, lang ?: TISODateString): string {
        try {
            return new Date(dateStr).toLocaleString(lang ?? 'en-US');
        } catch {
            return dateStr;
        }
    },

    /**
     * Sanitize HTML by removing dangerous elements and attributes that could execute code
     * Preserves safe XHTML formatting (p, div, span, strong, em, etc.)
     * Preserves <object> tags ONLY for safe media types (image/*, video/*, audio/*)
     * Allows data: URLs ONLY for safe image types in <img> tags
     * Removes: <script>, <style>, <embed>, <iframe>, <link>, <meta>, <form>
     * Removes: <object> with dangerous MIME types (application/x-shockwave-flash, etc.)
     * Removes: All event handler attributes (onclick, onerror, onload, etc.)
     * Removes: javascript: protocols and unsafe data: URLs
     * 
     * @param html - HTML string to sanitize
     * @returns Sanitized HTML string safe for rendering, preserving XHTML structure and safe media
     * 
     * @example
     * const unsafe = '<p onclick="alert(1)">Text</p><script>alert(2)</script>';
     * const safe = passifyHTML(unsafe);
     * // Returns: '<p>Text</p>'
     * 
     * @example
     * const media = '<object data="image.png" type="image/png">Image</object>';
     * const safe = passifyHTML(media);
     * // Returns: '<object data="image.png" type="image/png">Image</object>'
     * 
     * @example
     * const safeDataUrl = '<img src="data:image/png;base64,iVBORw0KG...">';
     * const safe = passifyHTML(safeDataUrl);
     * // Returns: '<img src="data:image/png;base64,iVBORw0KG...">' (preserved)
     * 
     * @example
     * const unsafeDataUrl = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
     * const safe = passifyHTML(unsafeDataUrl);
     * // Returns: '<img src="#">' (blocked)
     */
    passifyHTML(html: string): string {
        if (!html || typeof html !== 'string') return '';

        let passified = html;

        // 1. Process <object> tags - keep only safe media types
        const safeMediaTypes = new Set([
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            // 'image/svg+xml', ... not considered safe due to potential script content
            'image/webp',
            'video/mp4',
            'video/webm',
            'video/ogg',
            'audio/mpeg',
            'audio/mp3',
            'audio/ogg',
            'audio/wav',
            'audio/webm'
        ]);

        // Match all <object> tags with their attributes and content
        const objectRegex = /<object([^>]*)>(.*?)<\/object>/gis;
        passified = passified.replace(objectRegex, (match, attributes, content) => {
            // Extract type attribute
            const typeMatch = attributes.match(/type\s*=\s*["']([^"']+)["']/i);
            const mimeType = typeMatch ? typeMatch[1].toLowerCase() : '';

            // Check if MIME type is safe
            if (safeMediaTypes.has(mimeType)) {
                // Keep the object tag, but sanitize attributes
                let sanitizedAttrs = attributes;

                // Remove event handlers from attributes
                sanitizedAttrs = sanitizedAttrs.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

                // Remove dangerous protocols from data attribute
                sanitizedAttrs = sanitizedAttrs.replace(/\s+data\s*=\s*["']\s*(javascript|data):[^"']*["']/gi, ' data="#"');

                return `<object${sanitizedAttrs}>${content}</object>`;
            }

            // Remove unsafe object tag
            return '';
        });

        // 2. Remove dangerous tags including their content
        const dangerousTags = [
            'script',
            'style',
            'embed',
            'iframe',
            'link',
            'meta',
            'base',
            'form'
        ];

        dangerousTags.forEach(tag => {
            // Remove tags with any attributes (case-insensitive, multiline, greedy)
            const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>`, 'gis');
            passified = passified.replace(regex, '');
            // Remove self-closing tags
            const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
            passified = passified.replace(selfClosing, '');
        });

        // 3. Remove event handler attributes (onXYZ="...")
        // Matches on followed by word characters, capturing until the closing quote
        passified = passified.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

        // 4. Handle data: URLs and other dangerous protocols
        // Safe data: URL types for images only
        const safeDataUrlTypes = new Set([
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/webp',
            'image/svg+xml'  // Safe in <img> tags only
        ]);

        // Process src and href attributes
        passified = passified.replace(/\s+(href|src)\s*=\s*["']([^"']*)["']/gi, (match, attr, url) => {
            const trimmedUrl = url.trim();

            // Block javascript: protocol
            if (trimmedUrl.toLowerCase().startsWith('javascript:')) {
                return ` ${attr}="#"`;
            }

            // Handle data: URLs
            if (trimmedUrl.toLowerCase().startsWith('data:')) {
                // Extract MIME type from data URL
                const dataUrlMatch = trimmedUrl.match(/^data:([^;,]+)/i);
                const mimeType = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : '';

                // Allow only safe image data URLs in src attributes
                if (attr.toLowerCase() === 'src' && safeDataUrlTypes.has(mimeType)) {
                    return match; // Keep safe data URL
                }

                // Block all other data URLs (including SVG which can contain scripts)
                return ` ${attr}="#"`;
            }

            // Keep safe URLs (http, https, relative paths, anchors)
            return match;
        });

        // 5. Remove dangerous attributes
        const dangerousAttrs = [
            'formaction',
            'action',
            'dynsrc',
            'lowsrc'
        ];

        dangerousAttrs.forEach(attr => {
            const regex = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
            passified = passified.replace(regex, '');
        });

        return passified;
    }
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export const LOG = {
    // Configure which log levels are enabled (default: all)
    enabledLevels: new Set<LogLevel>(['info', 'warn', 'error', 'debug']),

    /**
     * Enable or disable specific log levels
     * @param levels - Array of log levels to enable. Omit to enable all.
     */
    setLogLevels(levels?: LogLevel[]): void {
        if (!levels || levels.length === 0) {
            this.enabledLevels = new Set(['info', 'warn', 'error', 'debug']);
        } else {
            this.enabledLevels = new Set(levels);
        }
    },

    /**
     * Check if a log level is enabled
     */
    isEnabled(level: LogLevel): boolean {
        return this.enabledLevels.has(level);
    },

    /* eslint-disable no-console */
    info: (...args: unknown[]) => {
        if (LOG.isEnabled('info')) console.info(...args);
    },
    warn: (...args: unknown[]) => {
        if (LOG.isEnabled('warn')) console.warn(...args);
    },
    error: (...args: unknown[]) => {
        if (LOG.isEnabled('error')) console.error(...args);
    },
    debug: (...args: unknown[]) => {
        if (LOG.isEnabled('debug')) console.debug(...args);
    }
    /* eslint-enable no-console */
};
