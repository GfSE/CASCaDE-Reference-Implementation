import * as fs from 'fs';
import * as path from 'path';
import { importJSONLD } from '../../src/utils/import/jsonld/import-jsonld';
import { TPigItem } from '../../src/utils/schemas/pig/pig-metaclasses';

describe('importJSONLD (file system)', () => {
    // List of relative filenames (relative to this test file). Add more entries as needed.
    const filenames = [
        "../data/JSON-LD/01/Project 'Very Simple Model (FMC) with Requirements'.pig.jsonld",
        "../data/JSON-LD/02/Small Autonomous Vehicle.pig.jsonld"
        // add more test files here, e.g.
        // "../data/JSON-LD/another-sample.pig.jsonld"
    ];
    let processedCount = 0;

    // Create a separate Jest test for each filename.
    // If a file is missing we use test.skip so CI/test run remains stable.
    filenames.forEach((filenameRel) => {
    //    console.debug('filenameRel', filenameRel);
        const testFile = path.resolve(__dirname, filenameRel);
        const testName = path.basename(testFile);
        const runner = fs.existsSync(testFile) ? test : test.skip;
    //    console.debug('testFile', testFile, testName, runner);

        runner(`imports ${testName} and instantiates PIG classes`, async () => {
            // import and test
            const rsp = await importJSONLD(testFile);
            if (!rsp.ok)
                console.warn('importJSONLD',rsp.status,rsp.statusText);
            //expect(rsp.ok).toBe(true);
            processedCount++;

            const instances = rsp.response as TPigItem[];
            //    console.debug('instances', instances);

            // basic expectations
            expect(Array.isArray(instances)).toBe(true);
            expect(instances.length).toBeGreaterThan(0);

            instances.forEach((itm, index) => {
                console.info(`Instance ${index}:`, itm.status(), itm.getJSONLD()['@id']);
                // each instantiated item must have a successful status
                expect(itm.status().ok).toBe(true);
                // additional per-item assertions can be added here
                //    expect(itm).toBeInstanceOf(Property);
                //    expect(inst.id).toBe('dcterms:type');
                //    expect(inst.title).toEqual({ value: 'The type or category', lang: 'en' });
                //    expect(inst.datatype).toBe('xs:string');
            });
        });
    });
    test('Check the number of files processed', () => {
        // Ensure that all files were processed:
        expect(processedCount).toBe(filenames.length);
    });

/*    test('reads JSON-LD from multiple files and instantiates PIG classes', async () => {
        let processedCount = 0;

        for (const filenameRel of filenames) {
            const testFile = path.resolve(__dirname, filenameRel);
            if (!fs.existsSync(testFile)) {
                // Skip missing test files but warn so missing data is visible in CI logs
                // eslint-disable-next-line no-console
                console.warn(`import-jsonld test: file not found, skipping: ${testFile}`);
                continue;
            }
        //    console.debug('testFile', testFile);

            // import and test
            // awaits the importer for each file in sequence
            const rsp = await importJSONLD(testFile);
            const instances = rsp.response as TPigItem[];
            console.debug('instances', instances);

            // basic expectations
            expect(Array.isArray(instances)).toBe(true);
            expect(instances.length).toBeGreaterThan(0);

            instances.forEach((itm, index) => {
                // each instantiated item must have a successful status
                expect(itm.status().ok).toBe(true);
                // further per-item assertions can be added here
                //    expect(itm).toBeInstanceOf(Property);
                //    expect(inst.id).toBe('dcterms:type');
                //    expect(inst.title).toEqual({ value: 'The type or category', lang: 'en' });
                //    expect(inst.datatype).toBe('xs:string');
                console.debug(`Instance ${index}:`, itm);
            });

            processedCount++;
        }

        // Ensure that all files were processed:
        expect(processedCount).toBe(filenames.length);
    }); */
});

