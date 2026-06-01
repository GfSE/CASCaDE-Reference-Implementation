/*!
 * Unit tests for XML package import
 * Dynamically discovers and tests all .xml files in tests/data/XML/
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import * as fs from 'fs';
import * as path from 'path';
import { XmlImporter } from '../../src/common/import/xml/import-xml';
import { TPigItem, APackage, PigItemType } from '../../src/common/schema/pig/ts/pig-metaclasses';
import { DEF } from '../../src/common/lib/definitions';

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
        } else if (file.endsWith('.cas.xml')) {
            // Add XML files to the list
            fileList.push(filePath);
        }
    });

    return fileList;
}

describe('import XML (file system)', () => {
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

        it(`imports ${testName} and instantiates PIG classes`, async () => {
            // import and test
            const rsp = await XmlImporter.import(testFile);
            if (!rsp.ok)
                console.warn(`import XML ${testName}:`, rsp.status, rsp.statusText);

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
                const st = itm.status();
                // Log any warnings for debugging
                if (!st.ok) {
                    console.warn(`  Item ${index} (${itm.get()?.id}): ${st.statusText}`);
                }
                expect(st.ok).toBe(true);
            });

            // console.log(`  ✓ ${testName}: ${instances.length} items`);
        });
    });

    // Verify that all discovered files were processed
    it('Check the number of files processed', () => {
        expect(processedCount).toBe(xmlFiles.length);
    });
});

describe('import XML - ID normalization', () => {
    it('should normalize all IDs without namespace prefix', () => {
        // XML with IDs without namespace prefixes
        const xmlInput = `<?xml version="1.0" encoding="UTF-8"?>
            <${DEF.pfxNsMeta}aPackage xmlns:cas="${DEF.pigPath}${DEF.pigVersion}/metamodel#"
                          xmlns:dcterms="http://purl.org/dc/terms/"
                          xmlns:skos="http://www.w3.org/2004/02/skos/core#"
                          xmlns:owl="http://www.w3.org/2002/07/owl#"
                          xmlns:o="https://example.org/ontology#"
                          xmlns:d="https://example.org/data#"
                          id="TestPackage">
                <${DEF.pfxNsMeta}hasClass>${DEF.pfxNsMeta}Package</${DEF.pfxNsMeta}hasClass>
                <dcterms:modified>2026-01-01T12:00:00Z</dcterms:modified>
                <dcterms:title xml:lang="en">Test Package for ID Normalization</dcterms:title>
                <graph>
                    <!-- 1. Enumeration without namespace -->
                    <${DEF.pfxNsMeta}Enumeration id="Priority-Values">
                        <${DEF.pfxNsMeta}hasClass>owl:Class</${DEF.pfxNsMeta}hasClass>
                        <dcterms:title xml:lang="en">Priority</dcterms:title>
                        <skos:definition xml:lang="en">Enumerated values for priority.</skos:definition>
                        <datatype>xs:string</datatype>
                        <${DEF.pfxNsMeta}enumeratedValue id="priorityHigh">
                            <dcterms:title xml:lang="en">High</dcterms:title>
                        </${DEF.pfxNsMeta}enumeratedValue>
                        <${DEF.pfxNsMeta}enumeratedValue id="priorityLow">
                            <dcterms:title xml:lang="en">Low</dcterms:title>
                        </${DEF.pfxNsMeta}enumeratedValue>
                    </${DEF.pfxNsMeta}Enumeration>

                    <!-- 2. Entity class with enumeratedTargetLink -->
                    <${DEF.pfxNsMeta}Entity id="Requirement">
                        <${DEF.pfxNsMeta}hasClass>owl:Class</${DEF.pfxNsMeta}hasClass>
                        <dcterms:title xml:lang="en">Requirement</dcterms:title>
                        <${DEF.pfxNsMeta}enumeratedTargetLink>hasPriority</${DEF.pfxNsMeta}enumeratedTargetLink>
                    </${DEF.pfxNsMeta}Entity>

                    <!-- 3. Link class -->
                    <${DEF.pfxNsMeta}Link id="hasPriority">
                        <${DEF.pfxNsMeta}hasClass>owl:ObjectProperty</${DEF.pfxNsMeta}hasClass>
                        <dcterms:title xml:lang="en">has Priority</dcterms:title>
                        <${DEF.pfxNsMeta}enumeratedEndpoint>Priority-Values</${DEF.pfxNsMeta}enumeratedEndpoint>
                    </${DEF.pfxNsMeta}Link>

                    <!-- 4. Relationship class -->
                    <${DEF.pfxNsMeta}Relationship id="dependsOn">
                        <${DEF.pfxNsMeta}hasClass>owl:Class</${DEF.pfxNsMeta}hasClass>
                        <dcterms:title xml:lang="en">depends on</dcterms:title>
                        <${DEF.pfxNsMeta}enumeratedSourceLink>Requirement</${DEF.pfxNsMeta}enumeratedSourceLink>
                        <${DEF.pfxNsMeta}enumeratedTargetLink>Requirement</${DEF.pfxNsMeta}enumeratedTargetLink>
                    </${DEF.pfxNsMeta}Relationship>

                    <!-- 5. First anEntity instance -->
                    <${DEF.pfxNsMeta}anEntity id="Req-001">
                        <${DEF.pfxNsMeta}hasClass>Requirement</${DEF.pfxNsMeta}hasClass>
                        <dcterms:title xml:lang="en">System shall authenticate users</dcterms:title>
                        <dcterms:modified>2026-01-01T12:00:00Z</dcterms:modified>
                        <${DEF.pfxNsMeta}aTargetLink>
                            <${DEF.pfxNsMeta}hasClass>hasPriority</${DEF.pfxNsMeta}hasClass>
                            <idRef>priorityHigh</idRef>
                        </${DEF.pfxNsMeta}aTargetLink>
                    </${DEF.pfxNsMeta}anEntity>

                    <!-- 6. Second anEntity instance -->
                    <${DEF.pfxNsMeta}anEntity id="Req-002">
                        <${DEF.pfxNsMeta}hasClass>Requirement</${DEF.pfxNsMeta}hasClass>
                        <dcterms:title xml:lang="en">System shall log activities</dcterms:title>
                        <dcterms:modified>2026-01-01T12:00:00Z</dcterms:modified>
                        <${DEF.pfxNsMeta}aTargetLink>
                            <${DEF.pfxNsMeta}hasClass>hasPriority</${DEF.pfxNsMeta}hasClass>
                            <idRef>priorityLow</idRef>
                        </${DEF.pfxNsMeta}aTargetLink>
                    </${DEF.pfxNsMeta}anEntity>

                    <!-- 7. aRelationship instance -->
                    <${DEF.pfxNsMeta}aRelationship id="Dep-001">
                        <${DEF.pfxNsMeta}hasClass>dependsOn</${DEF.pfxNsMeta}hasClass>
                        <dcterms:modified>2026-01-01T12:00:00Z</dcterms:modified>
                        <${DEF.pfxNsMeta}aSourceLink>
                            <${DEF.pfxNsMeta}hasClass>dependsOn</${DEF.pfxNsMeta}hasClass>
                            <idRef>Req-001</idRef>
                        </${DEF.pfxNsMeta}aSourceLink>
                        <${DEF.pfxNsMeta}aTargetLink>
                            <${DEF.pfxNsMeta}hasClass>dependsOn</${DEF.pfxNsMeta}hasClass>
                            <idRef>Req-002</idRef>
                        </${DEF.pfxNsMeta}aTargetLink>
                    </${DEF.pfxNsMeta}aRelationship>
                </graph>
            </${DEF.pfxNsMeta}aPackage>`;

        // Import the package WITHOUT constraint checking to focus on ID normalization
        const pkg = new APackage().setXML(xmlInput, { checkConstraints: [] });

        // Check import status
        const status = pkg.status();
        if (!status.ok) {
            console.error('Import failed:', status.statusText);
        }
        expect(status.ok).toBe(true);

        // Get the package data
        const pkgData = pkg.get();
        expect(pkgData).toBeDefined();
        expect(pkgData.graph).toBeDefined();
        expect(Array.isArray(pkgData.graph)).toBe(true);

        // Find items in graph
        const enumeration = pkgData.graph?.find((item: any) => item.itemType === PigItemType.Enumeration);
        const entityClass = pkgData.graph?.find((item: any) => item.itemType === PigItemType.Entity);
        const linkClass = pkgData.graph?.find((item: any) => item.itemType === PigItemType.Link);
        const relationshipClass = pkgData.graph?.find((item: any) => item.itemType === PigItemType.Relationship);
        const entity1 = pkgData.graph?.find((item: any) => item.itemType === PigItemType.anEntity && item.id === 'd:Req-001');
        const entity2 = pkgData.graph?.find((item: any) => item.itemType === PigItemType.anEntity && item.id === 'd:Req-002');
        const relationship = pkgData.graph?.find((item: any) => item.itemType === PigItemType.aRelationship);

        // 1. Check Enumeration ID normalization
        expect(enumeration).toBeDefined();
        expect(enumeration?.id).toBe('o:Priority-Values');  // Classes get 'o:' prefix

        // Check enumeratedValue IDs
        expect((enumeration as any)?.enumeratedValue).toBeDefined();
        expect(Array.isArray((enumeration as any)?.enumeratedValue)).toBe(true);
        expect((enumeration as any)?.enumeratedValue?.length).toBe(2);
        expect((enumeration as any)?.enumeratedValue?.[0]?.id).toBe('o:priorityHigh');  // enumeratedValue IDs get 'o:' prefix
        expect((enumeration as any)?.enumeratedValue?.[1]?.id).toBe('o:priorityLow');

        // 2. Check Entity class ID and enumeratedTargetLink
        expect(entityClass).toBeDefined();
        expect(entityClass?.id).toBe('o:Requirement');  // Classes get 'o:' prefix
        expect((entityClass as any)?.enumeratedTargetLink).toBeDefined();
        expect(Array.isArray((entityClass as any)?.enumeratedTargetLink)).toBe(true);
        expect((entityClass as any)?.enumeratedTargetLink?.[0]).toBe('o:hasPriority');  // Reference to class gets 'o:' prefix

        // 3. Check Link class ID and enumeratedEndpoint
        expect(linkClass).toBeDefined();
        expect(linkClass?.id).toBe('o:hasPriority');  // Classes get 'o:' prefix
        expect((linkClass as any)?.enumeratedEndpoint).toBeDefined();
        expect(Array.isArray((linkClass as any)?.enumeratedEndpoint)).toBe(true);
        expect((linkClass as any)?.enumeratedEndpoint?.[0]).toBe('o:Priority-Values');  // Reference to class gets 'o:' prefix

        // 4. Check Relationship class ID and enumerated links
        expect(relationshipClass).toBeDefined();
        expect(relationshipClass?.id).toBe('o:dependsOn');  // Classes get 'o:' prefix
        expect((relationshipClass as any)?.enumeratedSourceLink).toBeDefined();
        expect(Array.isArray((relationshipClass as any)?.enumeratedSourceLink)).toBe(true);
        expect((relationshipClass as any)?.enumeratedSourceLink?.[0]).toBe('o:Requirement');  // Reference to class gets 'o:' prefix
        expect((relationshipClass as any)?.enumeratedTargetLink).toBeDefined();
        expect(Array.isArray((relationshipClass as any)?.enumeratedTargetLink)).toBe(true);
        expect((relationshipClass as any)?.enumeratedTargetLink?.[0]).toBe('o:Requirement');  // Reference to class gets 'o:' prefix

        // 5. Check first anEntity instance
        expect(entity1).toBeDefined();
        expect(entity1?.id).toBe('d:Req-001');  // Instances get 'd:' prefix
        expect((entity1 as any)?.hasClass).toBe('o:Requirement');  // Reference to class gets 'o:' prefix
        expect((entity1 as any)?.hasTargetLink).toBeDefined();
        expect(Array.isArray((entity1 as any)?.hasTargetLink)).toBe(true);
        expect((entity1 as any)?.hasTargetLink?.length).toBe(1);
        expect((entity1 as any)?.hasTargetLink?.[0]?.hasClass).toBe('o:hasPriority');  // Reference to class gets 'o:' prefix
        expect((entity1 as any)?.hasTargetLink?.[0]?.idRef).toBe('o:priorityHigh');  // Reference to enumerated value gets 'o:' prefix (resolved via link class)

        // 6. Check second anEntity instance
        expect(entity2).toBeDefined();
        expect(entity2?.id).toBe('d:Req-002');  // Instances get 'd:' prefix
        expect((entity2 as any)?.hasClass).toBe('o:Requirement');  // Reference to class gets 'o:' prefix
        expect((entity2 as any)?.hasTargetLink).toBeDefined();
        expect(Array.isArray((entity2 as any)?.hasTargetLink)).toBe(true);
        expect((entity2 as any)?.hasTargetLink?.length).toBe(1);
        expect((entity2 as any)?.hasTargetLink?.[0]?.hasClass).toBe('o:hasPriority');  // Reference to class gets 'o:' prefix
        expect((entity2 as any)?.hasTargetLink?.[0]?.idRef).toBe('o:priorityLow');  // Reference to enumerated value gets 'o:' prefix (resolved via link class)

        // 7. Check aRelationship instance
        expect(relationship).toBeDefined();
        expect(relationship?.id).toBe('d:Dep-001');  // Instances get 'd:' prefix
        expect(relationship?.hasClass).toBe('o:dependsOn');  // Reference to class gets 'o:' prefix
        expect((relationship as any)?.hasSourceLink).toBeDefined();
        expect(Array.isArray((relationship as any)?.hasSourceLink)).toBe(true);
        expect((relationship as any)?.hasSourceLink?.length).toBe(1);
        expect((relationship as any)?.hasSourceLink?.[0]?.hasClass).toBe('o:dependsOn');  // Reference to class gets 'o:' prefix
        expect((relationship as any)?.hasSourceLink?.[0]?.idRef).toBe('d:Req-001');  // Reference to instance gets 'd:' prefix
        expect((relationship as any)?.hasTargetLink).toBeDefined();
        expect(Array.isArray((relationship as any)?.hasTargetLink)).toBe(true);
        expect((relationship as any)?.hasTargetLink?.length).toBe(1);
        expect((relationship as any)?.hasTargetLink?.[0]?.hasClass).toBe('o:dependsOn');  // Reference to class gets 'o:' prefix
        expect((relationship as any)?.hasTargetLink?.[0]?.idRef).toBe('d:Req-002');  // Reference to instance gets 'd:' prefix
    });
});
