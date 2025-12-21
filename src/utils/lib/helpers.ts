/** Product Information Graph (PIG) - helper routines
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - 
*/

import { IRsp, Rsp, Msg } from './messages';

/**
 * JSON helper types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export type JsonArray = Array<JsonValue>

// Map PIG metamodel attributés to/from JSON-LD keys;
// all other keys are derived from the ontology and handled dynamically:
const TO_JSONLD: [string, string][] = [
    ['context', '@context'],
    ['id', '@id'],
    ['revision', 'pig:revision'],
    ['priorRevision', 'pig:priorRevision'], 
    ['hasClass', '@type'],
    ['specializes', 'pig:specializes'],
    ['icon', 'pig:icon'], 
    ['value', '@value'],
    ['lang', '@language'],
    ['datatype', 'sh:datatype'],
    ['minCount', 'sh:minCount'],
    ['maxCount', 'sh:maxCount'],
    ['maxLength', 'sh:maxLength'],
    ['defaultValue', 'sh:defaultValue'],
    ['pattern', 'sh:pattern'],
    ['itemType', 'pig:itemType'],
    ['eligibleProperty', 'pig:eligibleProperty'],
    ['eligibleReference', 'pig:eligibleReference'],
    ['eligibleSource', 'pig:eligibleSource'],
    ['eligibleTarget', 'pig:eligibleTarget'],
    ['eligibleValue', 'pig:eligibleValue'], 
    ['title', 'dcterms:title'],
    ['description', 'dcterms:description'],
    ['created', 'dcterms:created'],
    ['modified', 'dcterms:modified'],
    ['creator', 'dcterms:creator']
];
const FROM_JSONLD: [string, string][] = TO_JSONLD.map(([a, b]) => [b, a] as [string, string]);

// LIB object with helper methods
export const LIB = {
/*    createRsp<T = unknown>(status: number, statusText?: string, response?: T, responseType?: XMLHttpRequestResponseType): IRsp<T> {
        return {
            status: status,
            statusText: statusText,
            response: response,
            responseType: responseType,
            ok: status > 199 && status < 300 || status === 0
        };
    }, */

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
    toJSONLD: TO_JSONLD, // see above
    fromJSONLD: FROM_JSONLD,
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
/* ToDo: Suppress output in production builds --> implement log levels or filter
export const logger = {
    info: (...args: any[]) => console.info(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    debug: (...args: any[]) => console.debug(...args)
//    info: (msg: string) => console.info(msg),
//    warn: (msg: string) => console.warn(msg),
//    error: (msg: string) => console.error(msg),
//    debug: (msg: string) => console.debug(msg)
};*/
