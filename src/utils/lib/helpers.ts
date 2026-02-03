/*!
 * Product Information Graph (PIG) - helper routines
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/** Product Information Graph (PIG) - helper routines
 *  Dependencies: none
 *  Authors: oskar.dungern@gfse.org, ..
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 *  Design Decisions:
 *  -
 */

import { IRsp, Rsp, Msg } from './messages';

/**
 * JSON helper types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export type JsonArray = Array<JsonValue>


/**
 * Standard XML Namespaces used in PIG XML documents
 * Collected from tests/data/XML files
 */
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
 */
export const XML_NAMESPACES = Object.entries(NAMESPACE_MAP)
    .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
    .join('\n    ');

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
     * Rename JSON object keys (tags) according to a mapping.
     * - mapping may be a Record<string,string> or Array<[string, string]>
     * - options.mutate: if true, mutate the original object in-place; default false (returns a new object)
     * - Only object keys are renamed; array elements and primitive values are preserved (but nested objects are processed)
     * Usage: renameJsonTags(node, LIB.fromJSONLD)
     */
//     toJSONLD: TO_JSONLD, // see above
//     fromJSONLD: FROM_JSONLD,
    renameJsonTags(
        node: JsonValue,
        mapping: Record<string, string> | Array<[string, string]>,
        options ?: { mutate?: boolean }
    ): JsonValue {
        const mutate = !!(options && options.mutate);

        // normalize mapping to a simple lookup object:
        const mapObj: Record<string, string> = Array.isArray(mapping)
            ? mapping.reduce((acc, pair) => {
                if (Array.isArray(pair) && pair.length >= 2) acc[pair[0]] = pair[1];
                return acc;
            }, {} as Record<string, string>)
            : { ...mapping };

        // 1. handle leaf and null
        if (node === undefined || node === null || this.isLeaf(node)) {
            return node;
        }

        // 2. handle array
        if (Array.isArray(node)) {
            if (mutate) {
                for (let i = 0; i < node.length; i++) {
                    const item = node[i];
                    node[i] = LIB.renameJsonTags(item, mapObj, options);
                }
                return node;
            }
            const out: JsonArray = [];
            for (let i = 0; i < node.length; i++) {
                out[i] = LIB.renameJsonTags(node[i], mapObj, options);
            }
            return out;
        }

        // 3. handle object
        const src = node as JsonObject;
        if (mutate) {
            for (const key of Object.keys(src)) {
                // unsafe: const mappedKey = mapObj.hasOwnProperty(key) ? mapObj[key] : key;
                // es2022 safe: const mappedKey = Object.hasOwn(mapObj, key) ? mapObj[key] : key;
                const mappedKey = Object.prototype.hasOwnProperty.call(mapObj, key) ? mapObj[key] : key;
                const child = src[key];
                const newValue = LIB.renameJsonTags(child, mapObj, options);
                if (mappedKey !== key) {
                    // if target key already exists we overwrite — intentional but warn in console
                    if (Object.prototype.hasOwnProperty.call(src, mappedKey)) {
                        // eslint-disable-next-line no-console
                        logger.warn(`renameJsonTags: overwriting key '${mappedKey}' while renaming '${key}'`);
                    }
                    src[mappedKey] = newValue;
                    delete src[key];
                } else {
                    src[key] = newValue;
                }
            }
            return src;
        }

        // logger.debug('src',src);
        const out: JsonObject = {};
        for (const key of Object.keys(src)) {
            // unsafe: const mappedKey = mapObj.hasOwnProperty(key) ? mapObj[key] : key;
            // es2022 safe: const mappedKey = Object.hasOwn(mapObj, key) ? mapObj[key] : key;
            const mappedKey = Object.prototype.hasOwnProperty.call(mapObj, key) ? mapObj[key] : key;
            out[mappedKey] = LIB.renameJsonTags(src[key], mapObj, options);
        }
        return out;
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
     * @param xml - XML fragment (without root wrapper)
     * @param options - Optional configuration
     * @returns Complete XML document with namespace declarations
     */
    makeXMLDoc(
        xml: string,
        options?: {
            rootTag?: string;           // Custom root tag (default: 'pig:Package')
            includeXmlDeclaration?: boolean;  // Include <?xml...?> declaration (default: false)
            detectNamespaces?: boolean; // Only include namespaces actually used (default: true)
        }
    ): string {
        const rootTag = options?.rootTag ?? 'pig:Package';
        const includeXmlDecl = options?.includeXmlDeclaration ?? false;
        const detectNs = options?.detectNamespaces ?? true;

        // Detect which namespace prefixes are actually used in the XML
        let namespacesToInclude: Record<string, string>;
        const unknownPrefixes: Set<string> = new Set();

        if (detectNs) {
            namespacesToInclude = {};
            const foundPrefixes = new Set<string>();

            // Find namespace prefixes in element tags (opening and closing)
            // Match: <prefix:localName or </prefix:localName
            const elementPattern = /<\/?(\w+):/g;
            let match;
            while ((match = elementPattern.exec(xml)) !== null) {
                foundPrefixes.add(match[1]);
            }

            // Find namespace prefixes in attribute names
            // Match: prefix:attrName= (but not in attribute values)
            const attrPattern = /\s(\w+):\w+\s*=/g;
            while ((match = attrPattern.exec(xml)) !== null) {
                foundPrefixes.add(match[1]);
            }

            // Always include the root tag's namespace
            const rootPrefix = rootTag.includes(':') ? rootTag.split(':')[0] : '';
            if (rootPrefix) {
                foundPrefixes.add(rootPrefix);
            }

            // Check each found prefix against NAMESPACE_MAP
            for (const prefix of foundPrefixes) {
                if (NAMESPACE_MAP[prefix]) {
                    namespacesToInclude[prefix] = NAMESPACE_MAP[prefix];
                } else {
                    unknownPrefixes.add(prefix);
                }
            }

            // Log errors for unknown namespaces
            if (unknownPrefixes.size > 0) {
                const unknownList = Array.from(unknownPrefixes).join(', ');
                logger.error(
                    `makeXMLDoc: Unknown namespace prefixes found: ${unknownList}. ` +
                    `These prefixes are not defined in NAMESPACE_MAP and will not be declared in the XML document. ` +
                    `Please add them to NAMESPACE_MAP in helpers.ts.`
                );
            }
        } else {
            // Include all namespaces
            namespacesToInclude = { ...NAMESPACE_MAP };
        }

        // Build namespace declarations string
        const nsDeclarations = Object.entries(namespacesToInclude)
            .map(([prefix, uri]) => `xmlns:${prefix}="${uri}"`)
            .join('\n    ');

        // Build the complete document
        const xmlDeclaration = includeXmlDecl ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '';
        const wrappedXml = `${xmlDeclaration}<${rootTag} ${nsDeclarations}>${xml}</${rootTag}>`;

        return wrappedXml;
    },
    // Load text from Node file path, HTTP(S) URL or browser File/Blob
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
                    const data = await readFile(source, { encoding: 'utf8' }) as string;
                    return Rsp.create(0, data, 'text');
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : String(e);
                    return Msg.create(694, source, msg);
                }
            }
            return Msg.create(695);  // not an http(s) URL and not running in Node
        }

        // File or Blob (browser)
        if (typeof (source as Blob).text === 'function') {
            try {
                const text = await (source as Blob).text();
                return Rsp.create(0, text, 'text');
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                return Msg.create(694, null, msg);
            }
        }
        return Msg.create(696); // unsupported source type
    },
    isHttpUrl(s: string): boolean {
            return /^https?:\/\//i.test(s);
    },
    isNodeEnv(): boolean {
        const p = (globalThis as any).process;
        return typeof p !== 'undefined' && !!(p.versions && p.versions.node);
    }
};

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export const logger = {
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

    info: (...args: any[]) => {
        if (logger.isEnabled('info')) console.info(...args);
    },
    warn: (...args: any[]) => {
        if (logger.isEnabled('warn')) console.warn(...args);
    },
    error: (...args: any[]) => {
        if (logger.isEnabled('error')) console.error(...args);
    },
    debug: (...args: any[]) => {
        if (logger.isEnabled('debug')) console.debug(...args);
    }
};
