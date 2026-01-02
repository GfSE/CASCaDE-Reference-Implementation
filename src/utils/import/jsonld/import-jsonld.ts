import { IRsp, rspOK, Msg } from "../../lib/messages";
import { LIB, logger } from "../../lib/helpers";
//import { JsonObject, JsonValue } from '../../lib/helpers';
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
export async function importJSONLD(source: string | File | Blob): Promise<IRsp> {
    const rsp = await LIB.readFileAsText(source);
    if (!rsp.ok)
        return rsp;

    const text = rsp.response as string;
    logger.info('importJSONLD: loaded text length ' + text.length);
//    logger.debug('importJSONLD: loaded text', text);
    let doc: any;
    try {
        doc = JSON.parse(text);
    } catch (err: any) {
        return Msg.create(690, err?.message ?? err);
    }
//    logger.debug('importJSONLD: parsed ', doc);
    return instantiateFromDoc(doc);
}

/* --- helpers --- */

// Instantiate objects from parsed JSON-LD document
function instantiateFromDoc(doc: any): IRsp {
    const created: TPigItem[] = [];
    const graph: any[] = Array.isArray(doc['@graph']) ? doc['@graph'] : (Array.isArray(doc.graph) ? doc.graph : []);
    // logger.debug('importJSONLD: @graph', graph);
    for (const elem of graph) {
    /*    // convert JSON-LD keys to internal keys (immutable)
        let obj = LIB.renameJsonTags(elem as JsonValue, LIB.fromJSONLD, { mutate: false }) as JsonObject;
        obj = LIB.replaceIdObjects(obj) as JsonObject; */

        if (!elem['pig:itemType'] || !elem['pig:itemType']['@id']) {
            logger.warn('importJSONLD: @graph element missing pig:itemType, skipping '+ elem.id);
            continue;
        }   

        // determine itemType
        const itype: any = elem['pig:itemType']['@id'] as any;

        // temporary filter to allow development step by step per itemType:
        if (![/*PigItemType.Property, PigItemType.Reference, PigItemType.Entity, PigItemType.Relationship,
            PigItemType.anEntity,*/ PigItemType.aRelationship ].includes(itype))
            continue;
     //   logger.debug('importJSONLD: @graph renamed', elem, itype);

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
                (instance as any).setJSONLD(elem, created);
                created.push(instance);
            } catch (err) {
                // do not abort: keep partially populated instance for inspection
                // eslint-disable-next-line no-console
                logger.warn(`Warning: failed to populate instance with itemType '${itype}': ${err}`);
            }
    /*    } else {
            // fallback: push converted plain object
            created.push(obj); */
        }
    }
    let res: IRsp;
    if (created.length === graph.length) 
        res = rspOK;
    else
        res = Msg.create(691, created.length, graph.length);

    res.response = created;
    res.responseType = 'json';
    return res as IRsp<TPigItem[]>;
}
