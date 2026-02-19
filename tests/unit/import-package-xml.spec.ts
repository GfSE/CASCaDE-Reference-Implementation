/*!
 * Unit tests for XML package import
 * Dynamically discovers and tests all .xml files in tests/data/XML/
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import * as fs from 'fs';
import * as path from 'path';
import { importXML } from '../../src/utils/import/xml/import-package-xml';
import { TPigItem } from '../../src/utils/schemas/pig/ts/pig-metaclasses';

/**
 * Recursively find all *.xml files in a directory and its subdirectories
 * @param dir - Directory to search
 * @param fileList - Accumulated list of files (for recursion)
 * @returns Array of absolute file paths
 */
function findXmlFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Recursively search subdirectories
            findXmlFiles(filePath, fileList);
        } else if (file.endsWith('.xml')) {
            // Add XML files to the list
            fileList.push(filePath);
        }
    });

    return fileList;
}

describe('importXML (file system)', () => {
    // Automatically discover all *.xml files in tests/data/XML and subdirectories
    const testFilesDir = path.resolve(__dirname, '../data/XML');
    const xmlFiles: string[] = findXmlFiles(testFilesDir);

    let processedCount = 0;

    // Log discovered files for debugging
    beforeAll(() => {
        let str = `${xmlFiles.length} XML test files:`;
        xmlFiles.forEach(f => str += `\n  - ${path.relative(testFilesDir, f)}`);
        console.log(str);
    });
    // Ensure console flush before test ends
    afterEach(async () => {
        await new Promise(resolve => setImmediate(resolve));
    });

    // Create a separate Jest test for each filename
    xmlFiles.forEach((testFile) => {
        const relativePath = path.relative(testFilesDir, testFile);
        const testName = relativePath;

        test(`imports ${testName} and instantiates PIG classes`, async () => {
            // import and test
            const rsp = await importXML(testFile);
            if (!rsp.ok)
                console.warn(`importXML ${testName}:`, rsp.status, rsp.statusText);

            // expect status 0 (success) or 691 (partial success with warnings)
            expect(rsp.status === 0 || rsp.status === 691).toBe(true);
            expect(rsp.response).toBeDefined();
            processedCount++;

            const instances = rsp.response as TPigItem[];

            // basic expectations
            expect(Array.isArray(instances)).toBe(true);
            expect(instances.length).toBeGreaterThan(0);

            // validate each instantiated item
            instances.forEach((itm, index) => {
                expect(itm.status().ok).toBe(true);
                // Log any warnings for debugging
                if (itm.status().status !== 0) {
                    console.warn(`  Item ${index} (${itm.get()?.id}): ${itm.status().statusText}`);
                }
            });

            console.log(`  ✓ ${testName}: ${instances.length} items`);
        });
    });

    // Verify that all discovered files were processed
    test('Check the number of files processed', () => {
        expect(processedCount).toBe(xmlFiles.length);
    });
});
