/**
 * Browser-based XSLT transformation tests using Playwright Test
 * Tests ReqIF to PIG transformation using native browser XSLT
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Global console listener
// can only handle strings ...
test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.error(`BROWSER ERROR: ${text}`);
        } else if (type === 'warning') {
            console.warn(`BROWSER WARNING: ${text}`);
        } else {
            console.log(`BROWSER ${type.toUpperCase()}: ${text}`);
        }
    });

    // Auch Browser-Fehler abfangen
    page.on('pageerror', error => {
        console.error('BROWSER EXCEPTION:', error.message);
    });
});

/**
 * Helper: Load test file content
 */
function loadTestFile(relativePath: string): string {
    const fullPath = path.resolve(__dirname, relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
}

test.describe('ReqIF XSLT Transformation', () => {
    /**
     * Test 1: Basic XSLT transformation
     */
    test('should transform ReqIF to PIG using browser XSLT', async ({ page }) => {
        // Load test data
        const reqifContent = loadTestFile('../data/ReqIF/Related-Terms.reqif');
        const xslContent = loadTestFile('../../src/utils/schemas/ReqIF/ReqIF-to-PIG.xsl');

        // Execute transformation in browser
        const result = await page.evaluate(({ xml, xsl }) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            const xslDoc = parser.parseFromString(xsl, 'text/xml');

            // Check for parse errors
            const xmlError = xmlDoc.querySelector('parsererror');
            const xslError = xslDoc.querySelector('parsererror');

            if (xmlError) {
                throw new Error('XML parse error: ' + xmlError.textContent);
            }
            if (xslError) {
                throw new Error('XSL parse error: ' + xslError.textContent);
            }

            // Transform
            const xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(xslDoc);
            const resultDoc = xsltProcessor.transformToDocument(xmlDoc);

            // Serialize result
            const serializer = new XMLSerializer();
            const resultString = serializer.serializeToString(resultDoc);

            return {
                success: true,
                result: resultString,
                rootElement: resultDoc.documentElement?.tagName || null,
                namespaceURI: resultDoc.documentElement?.namespaceURI || null
            };
        }, { xml: reqifContent, xsl: xslContent });

        // Verify transformation
        expect(result.success).toBe(true);
        expect(result.result).toBeTruthy();
        expect(result.result.length).toBeGreaterThan(100);

        // Check for expected PIG/RDF structure
        expect(result.result).toContain('rdf:RDF');
        expect(result.rootElement).toBe('rdf:RDF');

        // Check for transformed entities
        expect(result.result).toContain('pig:anEntity');
        expect(result.result).toContain('dcterms:title');
    });

    /**
     * Test 2: Verify specific ReqIF elements are transformed
     */
    test('should transform ReqIF SpecObjects to PIG entities', async ({ page }) => {
        const reqifContent = loadTestFile('../data/ReqIF/Related-Terms.reqif');
        const xslContent = loadTestFile('../../src/utils/schemas/ReqIF/ReqIF-to-PIG.xsl');

        const result = await page.evaluate(({ xml, xsl }) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            const xslDoc = parser.parseFromString(xsl, 'text/xml');

            const xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(xslDoc);
            const resultDoc = xsltProcessor.transformToDocument(xmlDoc);

            // Count entities in result
            const entities = resultDoc.querySelectorAll('[rdf\\:type*="Entity"], [*|type*="Entity"]');

            // Serialize for logging (DOM objects can't be transferred to Node console)
            const serializer = new XMLSerializer();
            const resultString = serializer.serializeToString(resultDoc);
            console.log(`XSLT transformation result: ${entities.length} entities found`);
            console.log(`Result XML preview: ${resultString}`);

            return {
                entityCount: entities.length,
                hasEntities: entities.length > 0
            };
        }, { xml: reqifContent, xsl: xslContent });

        expect(result.hasEntities).toBe(true);
        expect(result.entityCount).toBeGreaterThan(0);
    });

    /**
     * Test 3: Verify namespace declarations
     */
    test('should include correct namespace declarations', async ({ page }) => {
        const reqifContent = loadTestFile('../data/ReqIF/Related-Terms.reqif');
        const xslContent = loadTestFile('../../src/utils/schemas/ReqIF/ReqIF-to-PIG.xsl');

        const namespaces = await page.evaluate(({ xml, xsl }) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            const xslDoc = parser.parseFromString(xsl, 'text/xml');

            const xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(xslDoc);
            const resultDoc = xsltProcessor.transformToDocument(xmlDoc);

            const serializer = new XMLSerializer();
            const resultString = serializer.serializeToString(resultDoc);

            // Extract namespace declarations
            const nsPattern = /xmlns:(\w+)="([^"]+)"/g;
            const found: Record<string, string> = {};
            let match;

            while ((match = nsPattern.exec(resultString)) !== null) {
                found[match[1]] = match[2];
            }

            return found;
        }, { xml: reqifContent, xsl: xslContent });

        // Verify expected namespaces
        expect(namespaces['rdf']).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
        expect(namespaces['pig']).toBe('https://product-information-graph.org/v0.2/metamodel#');
        expect(namespaces['dcterms']).toBe('http://purl.org/dc/terms/');
    });

    /**
     * Test 4: Performance check
     */
    test('should transform large ReqIF in reasonable time', async ({ page }) => {
        const reqifContent = loadTestFile('../data/ReqIF/Related-Terms.reqif');
        const xslContent = loadTestFile('../../src/utils/schemas/ReqIF/ReqIF-to-PIG.xsl');

        const startTime = Date.now();

        await page.evaluate(({ xml, xsl }) => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            const xslDoc = parser.parseFromString(xsl, 'text/xml');

            const xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(xslDoc);
            xsltProcessor.transformToDocument(xmlDoc);
        }, { xml: reqifContent, xsl: xslContent });

        const duration = Date.now() - startTime;

        // Should complete in under 5 seconds
        expect(duration).toBeLessThan(5000);
    });
});
