// import { writeFile, unlink } from 'fs/promises';
// import * as os from 'os';
import * as path from 'path';
import { importJSONLD } from '../../src/utils/import/jsonld/import-jsonld';
import { TPigItem, Property } from '../../src/utils/schemas/pig/pig-metaclasses';

describe('importJSONLD (file system)', () => {
    test('reads JSON-LD from file system and instantiates PIG classes', async () => {
    /*  // 1a. create sample JSON-LD file:
        const sample = {
            "@context": {},
            "@graph": [
                {
                    "@id": "dcterms:type",
                    "itemType": "pig:Property", // ensure importer recognizes the type
                    "title": { "text": "The type or category", "lang": "en" },
                    "description": { "text": "This is a class for a property named dcterms:type", "lang": "en" },
                    "datatype": "xs:string",
                    "minCount": 0,
                    "maxCount": 1,
                    "maxLength": 20,
                    "defaultValue": "default_category"
                }
            ]
        };

        const testFile = path.join(os.tmpdir(), `test-jsonld-${Date.now()}.jsonld`);
        await writeFile(testFile, JSON.stringify(sample, null, 2), { encoding: 'utf8' }); */

        // 1b. use existing JSON-LD file:
        // Replace the following path with the actual path/filename of your existing test JSON-LD file.
        // Relative to this test file you can use __dirname:
        const filename = "../data/JSON-LD/Project 'Very Simple Model (FMC) with Requirements'.pig.jsonld",
            testFile = path.resolve(__dirname, filename);
        console.debug('testFile',testFile);

        // 2. import and test:
    //    try {
            const xhr = await importJSONLD(testFile);
          //  console.debug(`importJSONLD:`, xhr);
          //  console.debug(`importJSONLD:`, xhr.status, (xhr.response as TPigItem[]).map(i => i.get()));
          //  expect(xhr.ok).toBe(true);

            const instances = xhr.response as TPigItem[];
            console.debug('instances', instances);
            // basic expectations
            expect(Array.isArray(instances)).toBe(true);
            expect(instances.length).toBeGreaterThan(0);

            instances.forEach((itm, index) => {
                expect(itm.status().ok).toBe(true);  // valid instance)
                // class check
            //    expect(itm).toBeInstanceOf(Property);
                // content checks
            //    expect(inst.id).toBe('dcterms:type');
            //    expect(inst.title).toEqual({ value: 'The type or category', lang: 'en' });
                //    expect(inst.datatype).toBe('xs:string');
                console.debug(`Instance ${index}:`, itm);
            });
    //    } catch {
    //        console.error('Reading, importing or checking failed: '+filename);
        //only for 1a:
        //} finally {
        //    // cleanup test file
        //    await unlink(testFile).catch(() => { /* ignore cleanup errors */ });
    //    }
    });
});
