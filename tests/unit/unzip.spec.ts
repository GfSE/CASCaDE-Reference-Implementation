/*!
 * Unit tests for ZIP unpacking used by the various importers (ReqIF, FMI, JSON-LD, XML).
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * Test suite covering:
 * - PLI.extractFromZip() - the shared low-level ZIP extraction helper
 * - ReqifImporter, FmiImporter, JsonldImporter, XmlImporter - unpacking zipped input files
 *   (.reqifz/.reqif.zip, .fmu, .cas.jsonld.zip, .cas.xml.zip)
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { zipSync, strToU8 } from 'fflate';
import { setActivePinia, createPinia } from 'pinia';

import { PLI } from '../../src/common/lib/platform-independence';
import { ReqifImporter } from '../../src/common/import/reqif/import-reqif';
import { FmiImporter } from '../../src/common/import/fmi/import-fmi';
import { JsonldImporter } from '../../src/common/import/jsonld/import-jsonld';
import { XmlImporter } from '../../src/common/import/xml/import-xml';
import { AssetCache } from '../../src/stores/asset-cache';

describe('PLI.extractFromZip', () => {
    it('extracts the text content of a matching entry', () => {
        const zipped = zipSync({ 'folder/model.xml': strToU8('<root/>') });

        const rsp = PLI.extractFromZip(zipped, (name) => name.toLowerCase().endsWith('.xml'));

        expect(rsp.ok).toBe(true);
        expect(rsp.response).toEqual(['<root/>']);
    });

    it('returns an error response when no entry matches the predicate', () => {
        const zipped = zipSync({ 'readme.txt': strToU8('not xml') });

        const rsp = PLI.extractFromZip(zipped, (name) => name.toLowerCase().endsWith('.xml'), 'archive.zip');

        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toMatch(/does not contain a matching file/i);
    });

    it('returns an error response for a corrupted/non-ZIP byte stream', () => {
        const garbage = new Uint8Array([1, 2, 3, 4, 5]);

        const rsp = PLI.extractFromZip(garbage, () => true, 'corrupt.zip');

        expect(rsp.ok).toBe(false);
        expect(rsp.statusText).toMatch(/failed to read zip-archive/i);
    });

    it('extracts all matching entries when several are present', () => {
        const zipped = zipSync({
            'a.xml': strToU8('<a/>'),
            'b.xml': strToU8('<b/>')
        });

        const rsp = PLI.extractFromZip(zipped, (name) => name.toLowerCase().endsWith('.xml'));

        expect(rsp.ok).toBe(true);
        expect(rsp.response).toEqual(['<a/>', '<b/>']);
    });
});

describe('Importers unpack zipped input files', () => {
    let tmpDir: string;

    beforeAll(() => {
        setActivePinia(createPinia());
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cascade-unzip-test-'));
    });

    afterAll(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('ReqifImporter imports a real .reqifz archive', async () => {
        const reqifzPath = path.resolve(
            __dirname,
            '../data/ReqIF/Requirement-with-Image.reqifz'
        );
        expect(fs.existsSync(reqifzPath)).toBe(true);

        const rsp = (await ReqifImporter.import(reqifzPath))[0];

        expect(rsp.ok).toBe(true);
        expect(Array.isArray(rsp.response)).toBe(true);
        expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
    });

    it('FmiImporter imports a real .fmu (ZIP) archive', async () => {
        const fmuPath = path.resolve(__dirname, '../data/FMI/plant_Euler_0_001.fmu');
        expect(fs.existsSync(fmuPath)).toBe(true);

        const rsp = (await FmiImporter.import(fmuPath))[0];

        expect(rsp.ok).toBe(true);
        expect(Array.isArray(rsp.response)).toBe(true);
        expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
    });

    it('JsonldImporter unpacks a .cas.jsonld.zip archive', async () => {
        const sourcePath = path.resolve(
            __dirname,
            '../data/JSON-LD/11/Alice_works_for_ACME.cas.jsonld'
        );
        const jsonldContent = fs.readFileSync(sourcePath);
        const zipped = zipSync({ 'Alice_works_for_ACME.cas.jsonld': new Uint8Array(jsonldContent) });
        const zipPath = path.join(tmpDir, 'Alice_works_for_ACME.cas.jsonld.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const rsp = (await JsonldImporter.import(zipPath))[0];

        expect(rsp.ok).toBe(true);
        expect(Array.isArray(rsp.response)).toBe(true);
        expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
    });

    it('XmlImporter unpacks a .cas.xml.zip archive', async () => {
        const sourcePath = path.resolve(
            __dirname,
            '../data/XML/11/Alice_works_for_ACME.cas.xml'
        );
        const xmlContent = fs.readFileSync(sourcePath);
        const zipped = zipSync({ 'Alice_works_for_ACME.cas.xml': new Uint8Array(xmlContent) });
        const zipPath = path.join(tmpDir, 'Alice_works_for_ACME.cas.xml.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const rsp = (await XmlImporter.import(zipPath))[0];

        expect(rsp.status === 0 || rsp.status === 691).toBe(true);
        expect(Array.isArray(rsp.response)).toBe(true);
        expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
    });

    it('XmlImporter unpacks all entries of a ZIP archive containing several .xml files', async () => {
        const sourcePath = path.resolve(
            __dirname,
            '../data/XML/11/Alice_works_for_ACME.cas.xml'
        );
        const xmlContent = fs.readFileSync(sourcePath);
        const zipped = zipSync({
            'first/Alice_works_for_ACME.cas.xml': new Uint8Array(xmlContent),
            'second/Alice_works_for_ACME.cas.xml': new Uint8Array(xmlContent)
        });
        const zipPath = path.join(tmpDir, 'multi-Alice_works_for_ACME.cas.xml.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const results = await XmlImporter.import(zipPath);

        expect(results.length).toBe(2);
        results.forEach((rsp) => {
            expect(rsp.status === 0 || rsp.status === 691).toBe(true);
            expect(Array.isArray(rsp.response)).toBe(true);
            expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
        });
    });

    it('JsonldImporter unpacks all entries of a ZIP archive containing several .jsonld files', async () => {
        const sourcePath = path.resolve(
            __dirname,
            '../data/JSON-LD/11/Alice_works_for_ACME.cas.jsonld'
        );
        const jsonldContent = fs.readFileSync(sourcePath);
        const zipped = zipSync({
            'first/Alice_works_for_ACME.cas.jsonld': new Uint8Array(jsonldContent),
            'second/Alice_works_for_ACME.cas.jsonld': new Uint8Array(jsonldContent)
        });
        const zipPath = path.join(tmpDir, 'multi-Alice_works_for_ACME.cas.jsonld.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const results = await JsonldImporter.import(zipPath);

        expect(results.length).toBe(2);
        results.forEach((rsp) => {
            expect(rsp.ok).toBe(true);
            expect(Array.isArray(rsp.response)).toBe(true);
            expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
        });
    });

    /**
     * Relevance: A package imported from a ZIP whose entity description
     * embeds <img>/<object> references into a sibling images/ folder.
     * It verifies, end-to-end, that JsonldImporter correctly
     * (a) extracts both non-.cas.jsonld files from the archive and
     * (b) stores them into AssetCache under their relative filename,
     * so they can be retrieved later.
     *
     * Limitation: this spec file runs under Jest's 'node' testEnvironment, so
     * there is no real IndexedDB. The test therefore only exercises the
     * AssetCache's in-memory state (via PLI.setAssets()/AssetCache().update(),
     * gated behind a locally-stubbed PLI.isBrowserEnv()) and does NOT verify
     * that assets actually survive a save-to/load-from IndexedDB round-trip.
     * Whether the underlying IndexedDB persistence works correctly is
     * considered secondary here and is out of scope for this test case.
     *
     * Notice: Running this test in a npm/jest enviromnent causes twice a
     * console.error() message from AssetCache.saveToStorage() because IndexedDB 
     * is not available. This is expected and does not indicate a test failure.
     */
    it('JsonldImporter extracts a package with an entity description containing img/object tags and persists its images to AssetCache', async () => {
        // Reuse the Pinia instance created in beforeAll(); just ensure the
        // asset cache starts out empty for this test:
        await AssetCache().clear();

        const zipPath = path.resolve(
            __dirname,
            '../data/JSON-LD/other/Requirement-with-Image-Testcase.cas.jsonld.zip'
        );
        expect(fs.existsSync(zipPath)).toBe(true);

        // Sanity-check: the archive contains exactly the 3 expected files
        // (the .jsonld document plus a .png and a .svg under images/):
        const zipBytes = fs.readFileSync(zipPath);
        const rspOther = PLI.extractOtherFromZip(new Uint8Array(zipBytes), (name) => name.toLowerCase().endsWith('.cas.jsonld'));
        expect(rspOther.ok).toBe(true);
        const otherEntries = rspOther.response as { name: string; data: Uint8Array }[];
        const otherNames = otherEntries.map((e) => e.name).sort();
        expect(otherNames).toEqual(['images/circle.svg', 'images/enso-m.png']);

        // PLI.setAssets()/getAssets() only persist to/read from AssetCache when
        // PLI.isBrowserEnv() is true (i.e. 'window'/'document' are defined);
        // this spec file runs under Jest's 'node' testEnvironment, so stub
        // minimal globals - scoped to this test only - to exercise the
        // AssetCache persistence path below. 'indexedDB' remains undefined, so
        // AssetCache's IndexedDB-backed saveToStorage() call will fail and log
        // an error - that's fine, since AssetCache.update() still keeps the
        // assets in memory regardless of whether persistence succeeded.
        const globals = globalThis as Record<string, unknown>;
        globals.window = globalThis;
        globals.document = {};
        try {
            const rsp = (await JsonldImporter.import(zipPath))[0];

            expect(rsp.ok).toBe(true);
            expect(Array.isArray(rsp.response)).toBe(true);
            expect((rsp.response as unknown[]).length).toBeGreaterThan(0);

            // The two image files referenced by the entity's description should
            // now be retrievable from the asset cache, keyed by their relative
            // filename; read the in-memory state directly, since AssetCache().get()
            // would otherwise try (and fail) to reload from IndexedDB first:
            const assets = AssetCache().assets;
            expect(assets.length).toBe(2);

            const png = assets.find((a) => a.filename === 'images/enso-m.png');
            expect(png).toBeDefined();
            expect(png?.mimeType).toBe('image/png');
            expect(png?.blob.size).toBeGreaterThan(100);

            const svg = assets.find((a) => a.filename === 'images/circle.svg');
            expect(svg).toBeDefined();
            expect(svg?.mimeType).toBe('image/svg+xml');
            expect(svg?.blob.size).toBeGreaterThan(100);
        } finally {
            delete globals.window;
            delete globals.document;
        }
    });

    it('JsonldImporter reports an error for a ZIP archive without a .cas.jsonld entry', async () => {
        const zipped = zipSync({ 'notes.txt': strToU8('no jsonld here') });
        const zipPath = path.join(tmpDir, 'empty.cas.jsonld.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const rsp = (await JsonldImporter.import(zipPath))[0];

        expect(rsp.ok).toBe(false);
    });

    it('XmlImporter reports an error for a ZIP archive without a .cas.xml entry', async () => {
        const zipped = zipSync({ 'notes.txt': strToU8('no xml here') });
        const zipPath = path.join(tmpDir, 'empty.cas.xml.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const rsp = (await XmlImporter.import(zipPath))[0];

        expect(rsp.ok).toBe(false);
    });
});
