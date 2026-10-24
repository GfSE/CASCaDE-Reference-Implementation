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
 *  @ToDo:
 *  - Resolve circular dependency between helpers.ts and pig-metaclasses.ts (IIdentifiable)
 */

import type { IIdentifiable } from '../schema/pig/ts/pig-metaclasses';
import { DEF, RE } from './definitions';
import { LOG, IRsp, rspOK, Msg } from './messages';

/**
 * JSON helper types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export type JsonArray = Array<JsonValue>

export type tagIETF = string; // contains IETF language tag
export type TISODateString = string;

export interface INamespace {
    tag: string; // e.g. a namespace tag, e.g. "cas:"
    uri: string; // e.g. a namespace value, e.g. "https://product-information-graph.org/"
}
export interface IText {
    value: string;
}
export interface ILanguageText extends IText {
    lang?: tagIETF;
}

/**
 * Wraps an array of ILanguageText (a multi-language text, as found e.g. on
 * title/description/definition of CASCaRA metaclasses) and provides
 * language-aware getters/setters with a well-defined fallback behavior.
 *
 * Fallback behavior of get() when the requested language is not available:
 * 1. an exact match of the requested language tag (e.g. 'de-DE')
 * 2. a dialect of the requested language's primary subtag (e.g. 'de-AT' for 'de')
 * 3. a dialect of 'en' (e.g. 'en-US', 'en-GB', or just 'en')
 * 4. the first entry in the array, regardless of its language
 */
export class MultiLanguageText {
    private texts: ILanguageText[];

    constructor(texts?: ILanguageText[]) {
        this.texts = texts ? [...texts] : [];
    }

    /**
     * All language texts, e.g. to iterate over every available language.
     * @example
     * const mlt = new MultiLanguageText(entity.title)
     * for (const t of mlt.all) { console.log(t.lang, t.value) }
     */
    get all(): ILanguageText[] {
        return this.texts;
    }

    /**
     * The number of language texts available.
     * @example
     * const mlt = new MultiLanguageText(entity.title)
     * if (mlt.length === 0) return ''
     */
    get length(): number {
        return this.texts.length;
    }

    /** The primary language subtag of an IETF language tag, e.g. 'en' for 'en-US'. */
    private static primarySubtag(lang: tagIETF): string {
        return lang.split('-')[0].toLowerCase();
    }

    private findByPrimarySubtag(primarySubtag: string): ILanguageText | undefined {
        return this.texts.find(t => t.lang && MultiLanguageText.primarySubtag(t.lang) === primarySubtag);
    }

    /**
     * Returns the text value for the given preferred language, following the
     * fallback behavior described above; returns '' if no text is available at all.
     */
    get(preferredLang?: tagIETF): string {
        if (this.texts.length === 0) return '';

        if (preferredLang) {
            // 1. exact match:
            const exact = this.texts.find(t => t.lang === preferredLang);
            if (exact) return exact.value;

            // 2. same primary subtag (e.g. 'de' matches 'de-AT'):
            const primarySubtag = MultiLanguageText.primarySubtag(preferredLang);
            const dialectMatch = this.findByPrimarySubtag(primarySubtag);
            if (dialectMatch) return dialectMatch.value;
        }

        // 3. fall back to any English dialect:
        const english = this.findByPrimarySubtag('en');
        if (english) return english.value;

        // 4. fall back to the first available text, regardless of language:
        return this.texts[0].value;
    }

    /** Sets (or adds, if not yet present) the text value for the given language. */
    set(lang: tagIETF, value: string): void {
        const existing = this.texts.find(t => t.lang === lang);
        if (existing) {
            existing.value = value;
        } else {
            this.texts.push({ lang, value });
        }
    }

    /**
     * Type guard: checks whether a value is a usable multi-language text,
     * i.e. a non-empty array of ILanguageText, validated by validate().
     *
     * Multi-language fields found in schemata:
     * - Enumeration: title, description, definition, enumeratedValue.title
     * - Property: title, description, definition
     * - Link: title, description, definition
     * - Entity: title, description, definition
     * - Relationship: title, description, definition
     * - AnEntity: title, description
     * - ARelationship: title, description
     *
     * @ToDo: multiLanguageText also occurs in instances aProperty of configurable Property with datatype = 'string'
     */
    static isValid(value: unknown): value is ILanguageText[] {
        return MultiLanguageText.validate(value).ok === true;
    }

    /* Validate that a value is an array of ILanguageText with the rule:
       - if array length < 1 -> OK
       - if array length === 1 -> 'lang' may be missing
       - if array length > 1 -> each entry must have a string 'lang' and string 'value'
       Returns IRsp (rspOK on success, error IRsp on failure)
    */
    static validate(arr: any, fieldName?: string): IRsp {
        //    LOG.debug('MultiLanguageText.validate',arr,fieldName);
        fieldName = fieldName ?? '';
        if (!Array.isArray(arr)) {
            return Msg.create(640, fieldName);
        }
        if (arr.length < 1)
            return rspOK;
        if (arr.length === 1) {
            const e = arr[0];
            if (!e || typeof e !== 'object' || typeof (e as any).value !== 'string') {
                return Msg.create(641, fieldName);
            }
            // single entry: lang optional
            if ((e as any).lang !== undefined && typeof (e as any).lang !== 'string') {
                return Msg.create(642, fieldName);
            }
            return rspOK;
        }
        // length > 1: every entry must have value:string and lang:string
        for (let i = 0; i < arr.length; i++) {
            const e = arr[i];
            if (!e || typeof e !== 'object') {
                return Msg.create(643, fieldName, i);
            }
            if (typeof (e as any).value !== 'string') {
                return Msg.create(644, fieldName, i);
            }
            if (typeof (e as any).lang !== 'string' || (e as any).lang.trim() === '') {
                return Msg.create(645, fieldName, i);
            }
        }
        return rspOK;
    }

    /**
     * Normalize a single language text entry, e.g. from import data of unknown shape
     * (a string, an ILanguageText-like object, or anything else convertible to string),
     * optionally stripping control characters around/within HTML and/or stripping HTML tags.
     */
    private static normalizeSingle(src: any, options?: { stripHTML?: boolean; stripCtrlFromHTML?: boolean }): ILanguageText {
        //    LOG.debug('MultiLanguageText.normalizeSingle', src);
        if (!src)
            return { value: '' };

        let value: string;
        let lang: tagIETF | undefined;

        if (typeof src === 'object') {
            // Extract value from ILanguageText object
            value = (src.value ?? '') as string;
            lang = src.lang as tagIETF | undefined;
        } else if (typeof src === 'string') {
            // Use string directly as value
            value = src;
        } else {
            // Convert other types to string
            value = String(src);
        }

        // Strip control characters from HTML-formatted content if requested
        // This must happen BEFORE stripHTML
        if (options?.stripCtrlFromHTML && value) {
            // Check if value contains HTML: either paired tags <tag>...</tag> or self-closing tags <tag />
            if (RE.hasHTML.test(value)) {
                // Process control characters based on context:
                // - REMOVE if at beginning/end or between tags (e.g., \n<div>, </p>\n<div>, </p>\n)
                // - REPLACE with space if within text or between text and tag

                // Step 1: Remove control chars at the beginning before first tag
                // eslint-disable-next-line no-control-regex
                value = value.replace(/^[\x00-\x20\x7F]+(?=<)/, '');

                // Step 2: Remove control chars at the end after last tag
                // eslint-disable-next-line no-control-regex
                value = value.replace(/(?<=>)[\x00-\x20\x7F]+$/, '');

                // Step 3: Remove control chars between tags (only whitespace between tags)
                // Pattern: > followed by only whitespace/control chars followed by <
                // eslint-disable-next-line no-control-regex
                value = value.replace(/>[\x00-\x20\x7F]+</g, '><');

                // Step 4: Replace remaining control chars with space
                // These are within text content or between text and tags
                // eslint-disable-next-line no-control-regex
                value = value.replace(/[\x00-\x1F\x7F]/g, ' ');

                // Step 5: Normalize multiple consecutive spaces to single space
                value = value.replace(/ {2,}/g, ' ');
            }
        }

        // Strip HTML from the value if requested (applies to both strings and ILanguageText.value)
        if (options?.stripHTML && value) {
            value = LIB.stripHTML(value);
        }

        return {
            value: value,
            lang: lang
        };
    }

    /** Normalize a multi-language text (single entry or array of entries), see normalizeSingle(). */
    static normalize(src: any, options?: { stripHTML?: boolean; stripCtrlFromHTML?: boolean }): ILanguageText[] | undefined {
        if (!src) return undefined;
        if (Array.isArray(src)) return src.map(item => MultiLanguageText.normalizeSingle(item, options));
        return [MultiLanguageText.normalizeSingle(src, options)];
    }
}

/**
 * Standard XML Namespaces used in CASCaRA XML documents
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
    isArrayWithContent<T>(L: T[] | undefined | null): L is T[] {
        return (Array.isArray(L) && L.length > 0);
    },

    /**
     * Scan a string (typically an ILanguageText.value or an AProperty.value that may
     * contain embedded HTML/XML and/or Markdown) for references to external asset
     * files via <img src="...">, <object data="..."> tags, and Markdown-style links
     * / images ([label](link) or ![label](link)).
     *
     * Used by export routines to discover which cached assets (images etc.) must be
     * bundled into the export ZIP alongside the graph payload, so a subsequent import
     * can resolve those references again. Only *relative* references are returned,
     * since the asset cache only ever holds relative filenames (as extracted from an
     * import ZIP); fully qualified external references (e.g. 'https://...', '//...',
     * 'data:...') are not assets to be bundled and are skipped.
     *
     * @param text - text potentially containing <img>/<object> tags or Markdown links
     * @returns array of referenced relative filenames/paths (as found in the src/data
     *          attribute or the Markdown link target), possibly empty; duplicates are
     *          not removed (caller may dedupe via a Set)
     */
    extractAssetReferences(text: string | undefined | null): string[] {
        if (!text || typeof text !== 'string') return [];

        const refs: string[] = [];
        // const imgRe = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
        // const objectRe = /<object\b[^>]*\bdata\s*=\s*["']([^"']+)["']/gi;

        let m: RegExpExecArray | null;
        while ((m = RE.tagImg.exec(text)) !== null) {
            refs.push(m[2]);
        }
        while ((m = RE.tagSingleObject.exec(text)) !== null) {
            refs.push(m[2]);
        }
        // Markdown link/image: [label](link) or ![label](link); link may optionally
        // be followed by a quoted title, e.g. [label](link "title")
        while ((m = RE.markdownLink.exec(text)) !== null) {
            refs.push(m[1]);
        }
        return refs.filter(ref => LIB.isRelativeReference(ref));
    },

    /**
     * Check whether a reference (e.g. from an <img src="..."> or <object data="...">
     * attribute) is a relative path, as opposed to a fully qualified external
     * reference (absolute URL with a scheme, protocol-relative URL, or a data URI).
     *
     * @param ref - the reference/path to check
     * @returns true if the reference is relative
     */
    isRelativeReference(ref: string): boolean {
        if (!ref) return false;
        // Reject: 'scheme:...' (e.g. https:, mailto:, data:), '//...' (protocol-relative)
        return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(ref) && !ref.startsWith('//');
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
     * Recursively removes all undefined and null values from any JSON structure.
     * 
     * IMPORTANT: Empty arrays are explicitly preserved because they have semantic meaning;
     * in case of enumeratedProperty, enumeratedSourceLink and enumeratedTargetLink:
     * - undefined (property absent) = "no restriction, all properties resp. links allowed" (wildcard)
     * - [] (empty array) = "explicit restriction, no properties resp. links allowed"
     * 
     * Example in PIG:
     * - enumeratedProperty: undefined → all properties allowed
     * - enumeratedProperty: [] → no properties allowed
     * 
     * Returns the exact same type as the input value.
     */
    stripUndefinedAndNull<T extends object>(obj: T): T {
        if (obj === null || obj === undefined)
            throw new Error('LIB.stripUndefinedAndNull: input object cannot be null or undefined');
        const result: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            const value = (obj as any)[key];
            if (value !== undefined && value !== null) {
                // Empty arrays are preserved (they have semantic meaning)
                if (typeof value === 'object' && value !== null) {
                    result[key] = this.stripUndefinedAndNull(value);
                } else {
                    result[key] = value;
                }
            }
        }
        return result;
    },
    /**
     * Strip HTML tags from a string, returning only the text content.
     * Uses DOMParser to safely parse HTML without jQuery dependency.
     * Prevents XSS attacks by not using regex.
     * 
     * @param html - HTML string to strip tags from
     * @returns Plain text content without HTML tags
     * 
     * @example
     * const html = '<p>Hello <strong>World</strong></p>';
     * const text = LIB.stripHTML(html);
     * // Returns: 'Hello World'
     */
    stripHTML(html: string): string {
        if (!html || typeof html !== 'string') return '';

        // Use DOMParser to safely parse HTML
        if (typeof DOMParser !== 'undefined') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return doc.body.textContent?.trim() || '';
        }

        // Fallback for Node.js environment (if DOMParser not available)
        // Use a simple but safe approach: remove tags
        return html
            .replace(/<[^>]*>/g, '') // Remove tags
        /*    .replace(/&lt;/g, '<')    // Decode HTML entities
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'") */
            .trim();
    },

/*    stripUndefinedAndNull<T extends object>(obj: T): T {
        function strip(val: unknown): unknown {
            if (val === undefined) return undefined;
            if (val === null) return null;
            if (Array.isArray(val)) {
                return val
                    .map(strip)
                    .filter(v => v !== undefined && v !== null);
            }
            if (typeof val === 'object' && val !== null) {
                const out: Record<string, unknown> = {};
                for (const k of Object.keys(val)) {
                    const v = strip((val as Record<string, unknown>)[k]);
                    if (v !== undefined && v !== null) out[k] = v;
                }
                return out;
            }
            return val;
        }
        if (obj === null || obj === undefined)
            throw new Error('LIB.stripUndefinedAndNull: input object cannot be null or undefined');
        return strip(obj) as T;
    },
/*    function stripUndefined(obj: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(obj).filter(([_, v]) => v !== undefined)
        );
    } */
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
            rootTag?: string;                        // Custom root tag (default: `${DEF.pfxNsMeta}Package`)   
            includeXmlDeclaration?: boolean;         // Include <?xml...?> declaration (default: false)
            namespaces?: Record<string, string>;     // Explicit namespace prefix -> URI mappings
            warnOnMissing?: boolean;                 // Warn about prefixes without declarations (default: true)
        }
    ): string {
        const rootTag = options?.rootTag ?? `${DEF.pfxNsMeta}Package`;
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
    getLocalDate(dateStr: TISODateString, lang ?: tagIETF): string {
        try {
            return new Date(dateStr).toLocaleString(lang ?? 'en-US');
        } catch {
            return dateStr;
        }
    },
    /**
     * Helper function to get localized text from multi-language array
     * @deprecated Use `new MultiLanguageText(texts).get(lang)` instead.
     */
    getLocalText(texts ?: ILanguageText[], lang ?: tagIETF): string {
        return new MultiLanguageText(texts).get(lang);
    },
    /**
     * Check if a tag is a context ontology
     * If an ontology is neither context nor hosted, it must be included in the export.
     * @param tag - The namespace tag to check (e.g., 'dcterms:', 'schema:')
     * @returns True if the tag is a context ontology
     */
    isContext(tag: string): boolean {
        return DEF.contextOntologies.some(ont => ont.tag === tag);
    },
    /**
     * Check if an ID belongs to a context ontology
     * @param id - The ID to check (e.g., 'dcterms:title', 'schema:name', or full URI)
     * @returns True if the ID belongs to a context ontology
     */
    isContextId(id: string): boolean {
        if (!id || typeof id !== 'string') return false;

        // Extract namespace with colon from prefixed name (e.g., 'dcterms:title' -> 'dcterms:')
        const colonIndex = id.indexOf(':');
        if (colonIndex > 0 && !id.startsWith('http://') && !id.startsWith('https://')) {
            const tag = id.substring(0, colonIndex + 1); // Include the colon
            return this.isContext(tag);
        }

        // Check if it's a full URI that starts with a context ontology URI
        return DEF.contextOntologies.some(ont => id.startsWith(ont.uri));
    },
    /**
     * Check if a tag is a hosted ontology
     * If an ontology is neither context nor hosted, it must be included in the export.
     * @param tag - The namespace tag to check (e.g., 'dcterms:', 'schema:')
     * @returns True if the tag is a hosted ontology
     */
    isHostedOntology(tag: string): boolean {
        return DEF.hostedOntologies.some(ont => ont.tag === tag);
    },
    /**
     * Check if an ID belongs to a hosted ontology
     * @param id - The ID to check (e.g., 'dcterms:title', 'schema:name', or full URI)
     * @returns True if the ID belongs to a hosted ontology
     */
    isHostedOntologyId(id: string): boolean {
        if (!id || typeof id !== 'string') return false;

        // Extract namespace with colon from prefixed name (e.g., 'dcterms:title' -> 'dcterms:')
        const colonIndex = id.indexOf(':');
        if (colonIndex > 0 && !id.startsWith('http://') && !id.startsWith('https://')) {
            const tag = id.substring(0, colonIndex + 1); // Include the colon
            return this.isHostedOntology(tag);
        }

        // Check if it's a full URI that starts with a hosted ontology URI
        return DEF.hostedOntologies.some(ont => id.startsWith(ont.uri));
    },
    /**
     * Get the shape identifier for a term.
     * - If the term is from a hosted ontology, return an URI relative to the CASCaRA URI.
     * - Otherwise, return the term with a suffix.
     * @param term - The term to get the shape identifier for.
     * @returns The shape identifier for the term.
     */
    makeShapeId(term: string): string {
        // Get namespace prefix (e.g., 'dcterms:') from term:
        const colonIndex = term.indexOf(':');
        if (colonIndex > 0) {
            const tag = term.substring(0, colonIndex + 1); // Include the colon
            const ontology = DEF.hostedOntologies.find(ont => ont.tag === tag);
            if (ontology) {
                return ontology.uri + term.substring(colonIndex + 1);
            }
        }
        // Fallback to term with a suffix
        return term + DEF.suffixShape;
    },
    makeFilenameFromString(str: string): string {
        // Replace invalid filename characters with underscores
        // return str.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
        return str.replace(/[<>:"/\\|?*\s]/g, '_').trim()
    },
    makeFilename(itm: IIdentifiable): string {
        let str: string;
        if (typeof itm.title === 'string') {
            str = itm.title;
        } else if (Array.isArray(itm.title) && itm.title.length > 0) {
            str = itm.title[0].value;
        } else {
            str = itm.id;
        }

        return LIB.makeFilenameFromString(str);
    },
    encodeBase64(value: string): string {
        if (typeof btoa === 'function') {
            return btoa(value);
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(value, 'utf-8').toString('base64');
        }
        throw new Error('Base64 encoding is not available in this environment.');
    },
    blobToDataURL(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }
};


