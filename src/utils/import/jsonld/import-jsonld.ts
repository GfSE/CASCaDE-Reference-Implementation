import { LIB, IXhr, xhrOk } from "../../lib/helpers";
import { JsonObject, JsonValue } from '../../lib/helpers';
import { Property, Reference, Entity, Relationship,
    AProperty, AReference, AnEntity, ARelationship, PigItemType,
    TPigItem } from '../../schemas/pig/pig-metaclasses';

/**
 * Cross-environment JSON-LD importer.
 * - Accepts a Node file path, an http(s) URL string or a browser File/Blob.
 * - Extracts elements from '@graph' (or 'graph'), converts JSON-LD keys to internal keys
 *   and instantiates matching PIG class instances where possible.
 *
 * Usage:
 * - Node:   await importJsonLd('C:/path/to/file.jsonld')
 * - URL:    await importJsonLd('https://example/.../doc.jsonld')
 * - Browser: await importJsonLd(fileInput.files[0])
 */
export async function importJSONLD(source: string | File | Blob): Promise<IXhr> {
    const text = await loadSourceText(source);
    console.debug('importJSONLD: loaded text length', text.length);
//    console.debug('importJSONLD: loaded text', text);
    let doc: any;
    try {
        doc = JSON.parse(text);
    } catch (err: any) {
        throw new Error(`Failed to parse JSON-LD: ${err?.message ?? err}`);
    }
//    console.debug('importJSONLD: parsed ', doc);
    return instantiateFromDoc(doc);
}

/* --- helpers --- */

// Load text from Node file path, HTTP(S) URL or browser File/Blob
async function loadSourceText(source: string | File | Blob): Promise<string> {
    if (typeof source === 'string') {
        // string can be a URL or a Node filesystem path
        if (isHttpUrl(source)) {
            // browser or Node fetch
            const resp = await fetch(source);
            if (!resp.ok) throw new Error(`Failed to fetch URL ${source}: ${resp.status} ${resp.statusText}`);
            return await resp.text();
        }
        // assume Node path: dynamic import to avoid bundling 'fs' into browser build
        if (isNode()) {
            try {
                const { readFile } = await import('fs/promises');
                const data = await readFile(source, { encoding: 'utf8' }) as string;
                return data;
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                throw new Error(`Failed to read file '${source}' (Node): ${msg}`);
            }
        }
    /*    if (isNode()) {
            const { readFile } = await import('fs/promises');
            return await readFile(source, { encoding: 'utf8' });
        } */
        throw new Error('String source provided but not an http(s) URL and not running in Node.');
    }

    // File or Blob (browser)
    if (typeof (source as Blob).text === 'function') {
        return await (source as Blob).text();
    }

    throw new Error('Unsupported source type for function loadSourceText');
}

function isHttpUrl(s: string): boolean {
    return /^https?:\/\//i.test(s);
}

function isNode(): boolean {
    const p = (globalThis as any).process;
    return typeof p !== 'undefined' && !!(p.versions && p.versions.node);
}
/* function isNode(): boolean {
    return (typeof process !== 'undefined') && !!(process.versions && process.versions.node);
} */

// Instantiate objects from parsed JSON-LD document
function instantiateFromDoc(doc: any): IXhr {
    const created: TPigItem[] = [];
    const graph: any[] = Array.isArray(doc['@graph']) ? doc['@graph'] : (Array.isArray(doc.graph) ? doc.graph : []);
    // console.debug('importJSONLD: @graph', graph);
    for (const elem of graph) {
    /*    // convert JSON-LD keys to internal keys (immutable)
        let obj = LIB.renameJsonTags(elem as JsonValue, LIB.fromJSONLD, { mutate: false }) as JsonObject;
        obj = LIB.replaceIdObjects(obj) as JsonObject; */

        if (!elem['pig:itemType'] || !elem['pig:itemType']['@id']) {
            console.warn('importJSONLD: @graph element missing pig:itemType, skipping', elem);
            continue;
        }   

        // determine itemType
        const itype: any = elem['pig:itemType']['@id'] as any;

        // temporary filter to allow development step by step per itemType:
        if (![PigItemType.Property].includes(itype))
            continue;
        console.debug('importJSONLD: @graph renamed', elem, itype);

        let instance: any = null;
        try {
            switch (itype) {
                case PigItemType.Property:
                    instance = new Property();
                    break;
                case PigItemType.Reference:
                    instance = new Reference();
                    break;
                case PigItemType.Entity:
                    instance = new Entity();
                    break;
                case PigItemType.Relationship:
                    instance = new Relationship();
                    break;
                case PigItemType.aProperty:
                    instance = new AProperty();
                    break;
                case PigItemType.aReference:
                    instance = new AReference();
                    break;
                case PigItemType.anEntity:
                    instance = new AnEntity();
                    break;
                case PigItemType.aRelationship:
                    instance = new ARelationship();
                    break;
                default:
                    instance = null;
            }
        } catch {
            instance = null;
        }

        if (instance) {
            try {
                (instance as any).setJSONLD(elem);
                created.push(instance);
            } catch (err) {
                // do not abort: keep partially populated instance for inspection
                // eslint-disable-next-line no-console
                console.warn(`Warning: failed to populate instance with itemType '${itype}': ${err}`);
            }
    /*    } else {
            // fallback: push converted plain object
            created.push(obj); */
        }
    }
    let res: IXhr;
    if (created.length === graph.length) 
        res = xhrOk;
    else
        res = LIB.createRsp(699, `Imported ${created.length} of ${graph.length} items from JSON-LD.`);

    res.response = created;
    res.responseType = 'json';
    return res as IXhr<TPigItem[]>;
}
