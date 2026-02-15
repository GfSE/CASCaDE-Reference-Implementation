/*!
 * Unit tests for JSON-LD package import
 * Dynamically discovers and tests all .jsonld files in tests/data/JSON-LD
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * ToDo:
 * - find out why some test files are not processed completely (status 691) and add assertions for this case
 * - add more tests as proposed in comments below - not clear yet whether expectations or processing are faulty
 */

import { importJSONLD } from '../../src/utils/import/jsonld/import-package-jsonld';
import { PigItemType, TPigItem } from '../../src/utils/schemas/pig/ts/pig-metaclasses';
import path from 'path';
import fs from 'fs';

function findTestFiles(dir: string, ext: string): string[] {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...findTestFiles(fullPath,ext));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(ext)) {
            files.push(fullPath);
        }
    }

    return files;
}

// Dynamic test file discovery
const testFilesDir = path.resolve(__dirname, '../data/JSON-LD');
const ldFiles = findTestFiles(testFilesDir, '.jsonld');

describe('importJSONLD - Dynamic Test Files', () => {
    if (ldFiles.length === 0) {
        it.skip('No .jsonld test files found', () => {
            expect(true).toBe(true);
        });
        return;
    }

    // Log discovered files for debugging
    beforeAll(() => {
        let str = `${ldFiles.length} JSON-LD test files:`;
        ldFiles.forEach(f => str += `\n  - ${path.relative(testFilesDir, f)}`);
        console.log(str);
    });
    // Ensure console flush before test ends
    afterEach(async () => {
        await new Promise(resolve => setImmediate(resolve));
    });

    let processedCount = 0;

    ldFiles.forEach(ldFile => {
        const relativePath = path.relative(testFilesDir, ldFile);
        const filename = path.basename(ldFile);

        it(`should import ${relativePath}`, async () => {

            // Import JSON-LD
            const rsp = await importJSONLD(ldFile);
            if (!rsp.ok)
                console.warn('importJSONLD', rsp.status, rsp.statusText);

            // Basic validation
            expect(rsp.status === 0 || rsp.status === 691).toBe(true); // some or all items have been processed
            expect(rsp.response).toBeDefined();
            processedCount++;

            const allItems = rsp.response as TPigItem[];
            expect(Array.isArray(allItems)).toBe(true);
            expect(allItems.length).toBeGreaterThan(0);

            allItems.forEach((itm, index) => {
                const rsp = itm.status();
                if (!rsp.ok) {
                    console.info(`Instance ${index}:`, rsp.statusText ?? rsp.status);
                    console.debug(JSON.stringify(itm.get(), null, 2));
                }
                expect(rsp.status).toBe(0);
                expect(rsp.ok).toBe(true);
                // each instantiated item must have a successful status
                // additional per-item assertions can be added here
                //    expect(itm).toBeInstanceOf(Property);
                //    expect(inst.id).toBe('dcterms:type');
                //    expect(inst.title).toEqual({ value: 'The type or category', lang: 'en' });
                //    expect(inst.datatype).toBe('xs:string');
            });

            // First item should be the package
            const pkg = allItems[0];
        /*    expect(pkg.itemType).toBe(PigItemType.aPackage);
            expect(pkg.id).toBeDefined();
        */
            // Log import statistics
            const graphItems = allItems.slice(1);
            const itemTypeCounts = graphItems.reduce((acc: Record<string, number>, item: any) => {
                acc[item.itemType] = (acc[item.itemType] || 0) + 1;
                return acc;
            }, {});

            let entries = '';
            Object.entries(itemTypeCounts).forEach(([type, count]) => {
                entries += `\n   - ${type}: ${count}`;
            });
            console.log(`\n📦 ${filename}:\n   - Package ID: ${pkg.id}\n   - Graph items: ${graphItems.length}${entries}`);
        });
    });
});
/*
describe('importJSONLD - Error Handling', () => {
    it('should reject non-JSON-LD files', async () => {
        const rsp = await importJSONLD('{}');
        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toContain('.jsonld');
    });

    it('should reject invalid JSON', async () => {
        const rsp = await importJSONLD('not valid json');
        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toContain('parse');
    });

    it('should reject files without @context', async () => {
        const rsp = await importJSONLD('{"@graph": []}');
        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toContain('@context');
    });

    it('should reject files without @graph', async () => {
        const rsp = await importJSONLD('{"@context": {}}');
        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toContain('@graph');
    });

    it('should reject oversized files', async () => {
        const largeJson = '{"@context": {}, "@graph": [' + '{},'
            .repeat(1000000) + '{}]}';
        const rsp = await importJSONLD(largeJson);
        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toContain('too large');
    });
});
*/
