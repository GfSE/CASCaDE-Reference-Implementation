/*!
 * ReqIF Import Tests
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */

// import { IRsp } from '../../src/utils/lib/messages';
import { PIN } from '../../src/utils/lib/platform-independence';
import { importReqif } from '../../src/utils/import/ReqIF/import-reqif';
import * as path from 'path';
import * as fs from 'fs';

describe('ReqIF Import', () => {
    // List all ReqIF test files
    const testDataDir = path.resolve(__dirname, '../data/ReqIF');
    const reqifFiles = fs.readdirSync(testDataDir)
        .filter(file => file.endsWith('.reqif'))
        .map(file => ({
            name: file,
            path: path.join(testDataDir, file)
        }));

    beforeAll(() => {
        console.log(`Found ${reqifFiles.length} ReqIF test files:`);
        reqifFiles.forEach(f => console.log(`  - ${f.name}`));
    });

    describe('importReqif() - Basic functionality', () => {
        it('should transform ReqIF XML to PIG format', async () => {
            const testFile = reqifFiles[0];
            const fileContent = await PIN.readFileAsText(testFile.path);
            if (!fileContent.ok)
                console.error('response from readFileAsText:', fileContent);

            expect(fileContent.status).toBe(0);

            const rsp = await importReqif(fileContent.response as string, testFile.name);
            if (!rsp.ok)
                console.error('response from importReqif:', rsp);

            expect(rsp.status).toBe(0);
            expect(rsp.response).toBeTruthy();
            expect(Array.isArray(rsp.response)).toBe(true);

            const items = rsp.response as any[];
            expect(items.length).toBeGreaterThan(0);

            console.log(`✓ Imported package with ${items.length-1} items from ${testFile.name}`);
        });

        it('should validate file extension', async () => {
            const result = await importReqif('<xml/>', 'invalid.txt');

            expect(result.ok).toBe(false);
        //    expect(result.status).not.toBe(0);
            expect(result.statusText).toContain('expected .reqif file extension');
        });

        it('should handle invalid XML gracefully', async () => {
            const invalidXml = '<invalid>xml without closing tag';

            const result = await importReqif(invalidXml, 'invalidXML.reqif');

            expect(result.ok).toBe(false);
            expect(result.statusText).toBeTruthy();
        });

        it('should validate ReqIF document structure', async () => {
            const notReqIF = `<?xml version="1.0" encoding="UTF-8"?>
                <root xmlns="http://example.com">
                    <data>Not a ReqIF document</data>
                </root>`;

            const result = await importReqif(notReqIF, 'notReqIF.reqif');

            expect(result.status).not.toBe(0);
            expect(result.statusText).toContain('missing required ReqIF namespace or root element');
        });

        it('should handle empty content', async () => {
            const result = await importReqif('', 'test.reqif');

            expect(result.status).not.toBe(0);
        });

        it('should handle malformed XML', async () => {
            const malformedXml = '<?xml version="1.0"?><REQ-IF><SPEC-OBJECTS>';

            const result = await importReqif(malformedXml, 'test.reqif');

            expect(result.status).not.toBe(0);
        });
    });

    describe('All ReqIF test files', () => {
        reqifFiles.forEach(testFile => {
            it(`should successfully import ${testFile.name}`, async () => {
                const fileContent = await PIN.readFileAsText(testFile.path);

                expect(fileContent.status).toBe(0);

                const result = await importReqif(fileContent.response as string, testFile.name);

                expect(result.status).toBe(0);
                expect(result.response).toBeTruthy();
                expect(Array.isArray(result.response)).toBe(true);

                const items = result.response as any[];
                expect(items.length).toBeGreaterThan(0);

                // Log statistics
                const itemCount = items.length - 1; // Exclude package itself
                console.log(`  ✓ ${testFile.name}: ${itemCount} items`);
            }, 15000); // 15 second timeout for larger files
        });
    });

    describe('Transformation validation', () => {
        it('should create valid PIG package with items', async () => {
            const testFile = reqifFiles.find(f => f.name === 'Related-Terms.reqif');
            if (!testFile) {
                console.warn('Related-Terms.reqif not found, skipping package creation test');
                return;
            }
            const fileContent = await PIN.readFileAsText(testFile.path);

            expect(fileContent.status).toBe(0);

            const result = await importReqif(fileContent.response as string, testFile.name);

            expect(result.status).toBe(0);
            expect(result.responseType).toBe('json');

            const items = result.response as any[];

            // First item should be the package itself
            expect(items[0]).toBeTruthy();
            expect(items[0].itemType).toBe('pig:aPackage');

            // Should have additional graph items
            expect(items.length).toBe(3);
            expect(items[2].itemType).toBe('pig:anEntity');

            console.log(`Package structure validated: ${items.length - 1} graph items`);
        });

        it('should transform SpecObjects to PIG entities', async () => {
            const testFile = reqifFiles.find(f => f.name === 'Related-Terms.reqif');
            if (!testFile) {
                console.warn('Related-Terms.reqif not found, skipping entity transformation test');
                return;
            }   
            const fileContent = await PIN.readFileAsText(testFile.path);

            expect(fileContent.status).toBe(0);

            const result = await importReqif(fileContent.response as string, testFile.name);

            expect(result.status).toBe(0);

            const items = result.response as any[];
            const entities = items.filter((item: any) =>
                item?.itemType === 'pig:anEntity'
            );

            expect(entities.length).toBe(2);

            console.log(`Found ${entities.length} entities in transformation`);
        });

        it('should preserve metadata in transformation', async () => {
            const testFile = reqifFiles[0];
            if (!testFile) {
                console.warn(`${reqifFiles[0].name} not found, skipping metadata preservation test`);
                return;
            }
            const fileContent = await PIN.readFileAsText(testFile.path);

            expect(fileContent.status).toBe(0);

            const result = await importReqif(fileContent.response as string, testFile.name);

            expect(result.status).toBe(0);

            const items = result.response as any[];
            const itemsWithTitle = items.filter((item: any) => item?.title);

            expect(itemsWithTitle.length).toBeGreaterThan(0);

            console.log(`${itemsWithTitle.length} items have titles`);
        });
    });

    describe('Performance', () => {
        it('should import ReqIF in reasonable time', async () => {
            const testFile = reqifFiles[0];
            if (!testFile) {
                console.warn(`${reqifFiles[0].name} not found, skipping performance test`);
                return;
            }
            const fileContent = await PIN.readFileAsText(testFile.path);

            expect(fileContent.status).toBe(0);

            const startTime = Date.now();
            const result = await importReqif(fileContent.response as string, testFile.name);
            const duration = Date.now() - startTime;

            expect(result.status).toBe(0);
            expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds

            const items = result.response as any[];
            const itemCount = items.length - 1;
            const throughput = Math.round(itemCount / (duration / 1000));

            console.log(`Import performance: ${duration}ms for ${itemCount} items (${throughput} items/sec)`);
        });

        if (reqifFiles.length > 1) {
            it('should handle multiple files efficiently', async () => {
                const startTime = Date.now();

                for (const testFile of reqifFiles.slice(0, 3)) { // Test first 3 files
                    const fileContent = await PIN.readFileAsText(testFile.path);
                    expect(fileContent.status).toBe(0);

                    const result = await importReqif(fileContent.response as string, testFile.name);
                    expect(result.status).toBe(0);
                }

                const duration = Date.now() - startTime;
                const avgTime = duration / Math.min(3, reqifFiles.length);

                console.log(`Average import time: ${Math.round(avgTime)}ms per file`);
            }, 30000);
        }
    });

    describe('Error handling', () => {
        it('should provide meaningful xml error messages', async () => {
            const testCases = [
                { xml: '', filename: 'empty-file.reqif', expectedError: 'invalid XML structure' },
                { xml: '<invalid>', filename: 'invalid.reqif', expectedError: 'missing required ReqIF namespace or root element' },
                { xml: '<valid/>', filename: 'wrong-extension.xml', expectedError: 'expected .reqif file extension' }
            ];

            for (const testCase of testCases) {
                const result = await importReqif(testCase.xml, testCase.filename);
                // console.debug(`Error message for ${testCase.filename}: ${result.statusText}`);

                expect(result.status).not.toBe(0);
                expect(result.statusText?.toLowerCase()).toContain(testCase.expectedError.toLowerCase());
            }
        });
    });
});
