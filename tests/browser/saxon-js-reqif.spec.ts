// Real-browser smoke test for the Saxon-JS browser runtime (SaxonJS2.rt.js) used by the
// Vite-built app, validating an actual ReqIF-to-CAS transformation against the production
// SEF stylesheet served from public/assets/xslt/.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Saxon-JS browser runtime (ReqIF transformation)', () => {
    test.beforeEach(({ page }) => {
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log(`[browser console error] ${msg.text()}`);
            }
        });
        page.on('pageerror', (error) => {
            console.log(`[browser page error] ${error.message}`);
        });
    });

    test('loads the global SaxonJS runtime from /SaxonJS2.rt.js', async ({ page }) => {
        await page.goto('/');

        const info = await page.evaluate(async () => {
            const SaxonJS = (window as unknown as { SaxonJS?: { getProcessorInfo(): unknown } }).SaxonJS;
            if (!SaxonJS) return null;
            return SaxonJS.getProcessorInfo();
        });

        expect(info).not.toBeNull();
        expect(JSON.stringify(info)).toContain('SaxonJS');
    });

    test('transforms a real ReqIF document to CAS/PIG XML via the ReqIF-to-CAS.sef.json stylesheet', async ({ page }) => {
        await page.goto('/');

        const reqifXml = fs.readFileSync(
            path.resolve(__dirname, '../../packages/common/data/ReqIF/Related-Terms.reqif'),
            'utf-8'
        );

        const result = await page.evaluate(async ({ xml }) => {
            const SaxonJS = (window as unknown as {
                SaxonJS: {
                    transform(options: Record<string, unknown>, mode: string): Promise<{ principalResult: string }>;
                };
            }).SaxonJS;

            const stylesheetUrl = `${window.location.origin}/assets/xslt/ReqIF-to-CAS.sef.json`;
            const output = await SaxonJS.transform(
                {
                    stylesheetLocation: stylesheetUrl,
                    sourceText: xml,
                    destination: 'serialized',
                },
                'async'
            );
            return output.principalResult;
        }, { xml: reqifXml });

        expect(result).toBeTruthy();
        expect(result).toContain('aPackage');
    });
});
