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

import { PLI } from '../../src/common/lib/platform-independence';
import { ReqifImporter } from '../../src/common/import/reqif/import-reqif';
import { FmiImporter } from '../../src/common/import/fmi/import-fmi';
import { JsonldImporter } from '../../src/common/import/jsonld/import-jsonld';
import { XmlImporter } from '../../src/common/import/xml/import-xml';

describe('PLI.extractFromZip', () => {
    it('extracts the text content of a matching entry', () => {
        const zipped = zipSync({ 'folder/model.xml': strToU8('<root/>') });

        const rsp = PLI.extractFromZip(zipped, (name) => name.toLowerCase().endsWith('.xml'));

        expect(rsp.ok).toBe(true);
        expect(rsp.response).toBe('<root/>');
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
        expect(rsp.statusText).toMatch(/failed to read archive/i);
    });

    it('picks the first matching entry when several are present', () => {
        const zipped = zipSync({
            'a.xml': strToU8('<a/>'),
            'b.xml': strToU8('<b/>')
        });

        const rsp = PLI.extractFromZip(zipped, (name) => name.toLowerCase().endsWith('.xml'));

        expect(rsp.ok).toBe(true);
        expect(rsp.response).toBe('<a/>');
    });
});

describe('Importers unpack zipped input files', () => {
    let tmpDir: string;

    beforeAll(() => {
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

        const rsp = await ReqifImporter.import(reqifzPath);

        expect(rsp.ok).toBe(true);
        expect(Array.isArray(rsp.response)).toBe(true);
        expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
    });

    it('FmiImporter imports a real .fmu (ZIP) archive', async () => {
        const fmuPath = path.resolve(__dirname, '../data/FMI/plant_Euler_0_001.fmu');
        expect(fs.existsSync(fmuPath)).toBe(true);

        const rsp = await FmiImporter.import(fmuPath);

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

        const rsp = await JsonldImporter.import(zipPath);

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

        const rsp = await XmlImporter.import(zipPath);

        expect(rsp.status === 0 || rsp.status === 691).toBe(true);
        expect(Array.isArray(rsp.response)).toBe(true);
        expect((rsp.response as unknown[]).length).toBeGreaterThan(0);
    });

    it('JsonldImporter reports an error for a ZIP archive without a .jsonld entry', async () => {
        const zipped = zipSync({ 'notes.txt': strToU8('no jsonld here') });
        const zipPath = path.join(tmpDir, 'empty.cas.jsonld.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const rsp = await JsonldImporter.import(zipPath);

        expect(rsp.ok).toBe(false);
    });

    it('XmlImporter reports an error for a ZIP archive without a .xml entry', async () => {
        const zipped = zipSync({ 'notes.txt': strToU8('no xml here') });
        const zipPath = path.join(tmpDir, 'empty.cas.xml.zip');
        fs.writeFileSync(zipPath, Buffer.from(zipped));

        const rsp = await XmlImporter.import(zipPath);

        expect(rsp.ok).toBe(false);
    });
});
