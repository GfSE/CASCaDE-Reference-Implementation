/** Product Information Graph (PIG) - helper routines
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - 
*/

// An xhr-like object to return the result of the import;
// use it as follows (according to GitHub Copilot):
// - XML Document:
//   const xhrDoc: IXhr<Document> = { status: 200, statusText: 'OK', response: doc, responseType: 'document' };
// - or JSON payload:
//   type PigPackage = { /* ... */ };
//   const xhrJson: IXhr<PigPackage> = { status: 200, statusText: 'OK', response: pigPackage, responseType: 'json' };
// - or dynamically:
//   if (xhr.responseType === 'document') {
//      const doc = xhr.response as Document;
//   };
export interface IXhr<T = unknown> {
    status: number;
    statusText?: string;
    response?: T; // z.B. Document, string, object, ...
    responseType?: XMLHttpRequestResponseType; // '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text'
    headers?: Record<string, string>;
    ok?: boolean; // convenience: status in 200-299
}
export const xhrOk: IXhr = { status: 0, ok: true };

/**
 * JSON helper types
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export type JsonArray = Array<JsonValue>
function isLeaf(node: JsonValue): boolean {
    return (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean');
}
/**
 * Iteriert ein JSON-Wert rekursiv und ruft `cb` für jedes Primitive (value) auf.
 * - objects: durchläuft keys
 * - arrays: durchläuft indices
 *
 * Path ist ein Array mit Schlüsseln (string für Objekt, number für Array) vom Root bis zum aktuellen Wert.
 *
 * Diese Funktion mutiert nichts und gibt nichts zurück.
 */
export function iterateJson(
    node: JsonValue,
    cb: (value: JsonPrimitive, path: Array<string | number>, parent?: JsonObject | JsonArray, key?: string | number) => void,
    path: Array<string | number> = []
): void {
    if (node === null)
        return;
    if (isLeaf(node)) {
        cb(node as JsonPrimitive, path);
        return;
    }
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            const item = node[i];
            if (isLeaf(item)) {
                cb(item as JsonPrimitive, [...path, i], node, i);
            } else {
                iterateJson(item, cb, [...path, i]);
            }
        }
        return;
    }
    // object
    for (const key of Object.keys(node)) {
        const child = (node as JsonObject)[key];
        if (isLeaf(child)) {
            cb(child as JsonPrimitive, [...path, key], node as JsonObject, key);
        } else {
            iterateJson(child, cb, [...path, key]);
        }
    }
}

/**
 * Mappt alle JSON-Primitives mit der Callback-Funktion.
 * - Wenn `mutate === true`, werden Werte im Originalobjekt ersetzt (in-place).
 * - Default: immutable, es wird ein neues JSON-Objekt zurückgegeben.
 *
 * Callback erhält (value, path) und muss einen neuen JsonPrimitive-Wert zurückgeben.
 */
export function mapJson(
    node: JsonValue,
    cb: (value: JsonPrimitive, path: Array<string | number>) => JsonPrimitive,
    options?: { mutate?: boolean },
    path: Array<string | number> = []
): JsonValue {
    const mutate = !!(options && options.mutate);

    if (node === null)
        return node;

    if (isLeaf(node)) {
        return cb(node as JsonPrimitive, path);
    }

    if (Array.isArray(node)) {
        if (mutate) {
            for (let i = 0; i < node.length; i++) {
                const item = node[i];
                if (isLeaf(item)) {
                    node[i] = cb(item as JsonPrimitive, [...path, i]);
                } else {
                    node[i] = mapJson(item, cb, options, [...path, i]);
                }
            }
            return node;
        }
        const out: JsonArray = [];
        for (let i = 0; i < node.length; i++) {
            const item = node[i];
            out[i] = (isLeaf(item))
                ? cb(item as JsonPrimitive, [...path, i])
                : mapJson(item, cb, options, [...path, i]);
        }
        return out;
    }

    // object
    if (mutate) {
        const obj = node as JsonObject;
        for (const key of Object.keys(obj)) {
            const child = obj[key];
            if (isLeaf(child)) {
                obj[key] = cb(child as JsonPrimitive, [...path, key]);
            } else {
                obj[key] = mapJson(child, cb, options, [...path, key]);
            }
        }
        return obj;
    }

    const outObj: JsonObject = {};
    for (const key of Object.keys(node as JsonObject)) {
        const child = (node as JsonObject)[key];
        outObj[key] = (child === null || typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean')
            ? cb(child as JsonPrimitive, [...path, key])
            : mapJson(child, cb, options, [...path, key]);
    }
    return outObj;
}

// Rename JSON object keys (tags) according to a mapping.
// - mapping may be a Record<string,string> or Array<[string, string]>
// - options.mutate: if true, mutate the original object in-place; default false (returns a new object)
// - Only object keys are renamed; array elements and primitive values are preserved (but nested objects are processed)
export const
    toJSONLD: Array<[string, string]> = [
            ['id', '@id'],
            ['value', '@value'],
            ['hasClass', '@type']
        ],
    fromJSONLD: Array<[string, string]> = toJSONLD.map(([a, b]) => [b, a]);
export function renameJsonTags(
    node: JsonValue,
    mapping: Record<string, string> | Array<[string, string]>,
    options?: { mutate?: boolean }
): JsonValue {
    const mutate = !!(options && options.mutate);
    // normalize mapping to a simple lookup object
    const mapObj: Record<string, string> = Array.isArray(mapping)
        ? mapping.reduce((acc, pair) => {
              if (Array.isArray(pair) && pair.length >= 2) acc[pair[0]] = pair[1];
              return acc;
          }, {} as Record<string, string>)
        : { ...mapping };

    if (node === null || isLeaf(node)) {
        return node;
    }

    if (Array.isArray(node)) {
        if (mutate) {
            for (let i = 0; i < node.length; i++) {
                const item = node[i];
                node[i] = renameJsonTags(item, mapObj, options);
            }
            return node;
        }
        const out: JsonArray = [];
        for (let i = 0; i < node.length; i++) {
            out[i] = renameJsonTags(node[i], mapObj, options);
        }
        return out;
    }

    // object case
    const src = node as JsonObject;
    if (mutate) {
        for (const key of Object.keys(src)) {
            // unsafe: const mappedKey = mapObj.hasOwnProperty(key) ? mapObj[key] : key;
            // es2022 safe: const mappedKey = Object.hasOwn(mapObj, key) ? mapObj[key] : key;
            const mappedKey = Object.prototype.hasOwnProperty.call(mapObj, key) ? mapObj[key] : key;
            const child = src[key];
            const newValue = renameJsonTags(child, mapObj, options);
            if (mappedKey !== key) {
                // if target key already exists we overwrite — intentional but warn in console
                if (Object.prototype.hasOwnProperty.call(src, mappedKey)) {
                    // eslint-disable-next-line no-console
                    console.warn(`renameJsonTags: overwriting key '${mappedKey}' while renaming '${key}'`);
                }
                src[mappedKey] = newValue;
                delete src[key];
            } else {
                src[key] = newValue;
            }
        }
        return src;
    }

    const out: JsonObject = {};
    for (const key of Object.keys(src)) {
        // unsafe: const mappedKey = mapObj.hasOwnProperty(key) ? mapObj[key] : key;
        // es2022 safe: const mappedKey = Object.hasOwn(mapObj, key) ? mapObj[key] : key;
        const mappedKey = Object.prototype.hasOwnProperty.call(mapObj, key) ? mapObj[key] : key;
        out[mappedKey] = renameJsonTags(src[key], mapObj, options);
    }
    return out;
}
