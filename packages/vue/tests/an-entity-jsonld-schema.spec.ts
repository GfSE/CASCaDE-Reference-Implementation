/**
 * @jest-environment node
 */
import * as fs from 'fs';
import * as path from 'path';
import { ajv } from '../../common/src/lib/ajv';

const schemaDir = path.resolve(__dirname, '../public/assets/jsonld');
for (const filename of [
    'Property.json', 'Link.json', 'Entity.json', 'Relationship.json',
    'Enumeration.json', 'anEntity.json', 'aRelationship.json', 'aPackage.json'
]) {
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(schemaDir, filename), 'utf8')));
}
const schemaBase = 'http://product-information-graph.org/schema/2026-11-25/jsonld/';
const validateEntity = ajv.getSchema(`${schemaBase}anEntity.json`)!;
const validateRelationship = ajv.getSchema(`${schemaBase}aRelationship.json`)!;
const validatePackage = ajv.getSchema(`${schemaBase}aPackage.json`)!;

function entity(configurables: unknown) {
    return {
        '@id': 'd:Alice',
        '@type': 'cas:Person',
        'cas:itemType': { '@id': 'cas:anEntity' },
        'dcterms:modified': '2026-01-20T09:38:26.464Z',
        'dcterms:title': [{ '@value': 'Alice', '@language': 'en' }],
        'cas:example': configurables
    };
}

function relationship(configurables: unknown) {
    return {
        '@id': 'd:worksFor',
        '@type': 'cas:WorksFor',
        'cas:itemType': { '@id': 'cas:aRelationship' },
        'dcterms:modified': '2026-01-20T09:38:26.464Z',
        'cas:example': configurables
    };
}

function packageWith(configurables: unknown, graph: unknown[] = []) {
    return {
        '@context': {},
        '@id': 'd:package',
        '@type': 'cas:Package',
        'cas:itemType': { '@id': 'cas:aPackage' },
        '@graph': graph,
        'dcterms:modified': '2026-01-20T09:38:26.464Z',
        'cas:example': configurables
    };
}

describe.each([
    ['anEntity', validateEntity, entity],
    ['aPackage', validatePackage, packageWith],
    ['aRelationship', validateRelationship, relationship]
] as const)('%s JSON-LD configurable schema', (_name, validate, makeItem) => {
    it('accepts property values and target links in the same array', () => {
        expect(validate(makeItem([
            { '@value': 'Alice' },
            { '@id': 'd:ACME', 'cas:itemType': { '@id': 'cas:aTargetLink' } }
        ]))).toBe(true);
    });

    it.each([
        ['property with itemType', { '@value': 'Alice', 'cas:itemType': { '@id': 'cas:aProperty' } }],
        ['property with a target link itemType', { '@value': 'Alice', 'cas:itemType': { '@id': 'cas:aTargetLink' } }],
        ['property with an additional field', { '@value': 'Alice', '@language': 'en' }],
        ['link without itemType', { '@id': 'd:ACME' }],
        ['link with an empty itemType', { '@id': 'd:ACME', 'cas:itemType': {} }],
        ['link with a property itemType', { '@id': 'd:ACME', 'cas:itemType': { '@id': 'cas:aProperty' } }],
        ['link with an invalid ID', { '@id': 'ACME', 'cas:itemType': { '@id': 'cas:aTargetLink' } }],
        ['link with extra itemType metadata', { '@id': 'd:ACME', 'cas:itemType': { '@id': 'cas:aTargetLink', extra: true } }],
        ['mixed property and link', { '@value': 'Alice', '@id': 'd:ACME', 'cas:itemType': { '@id': 'cas:aTargetLink' } }],
        ['empty configurable', {}]
    ])('rejects %s', (_description, configurable) => {
        expect(validate(makeItem([configurable]))).toBe(false);
    });
});

describe('source link validation', () => {
    const source = { '@id': 'd:Alice', 'cas:itemType': { '@id': 'cas:aSourceLink' } };

    it('accepts a source link on relationships but not entities or packages', () => {
        expect(validateRelationship(relationship([source]))).toBe(true);
        expect(validateEntity(entity([source]))).toBe(false);
        expect(validatePackage(packageWith([source]))).toBe(false);
    });

    it('rejects source links with extra fields or values', () => {
        expect(validateRelationship(relationship([{ ...source, extra: true }]))).toBe(false);
        expect(validateRelationship(relationship([{ ...source, '@value': 'Alice' }]))).toBe(false);
        expect(validateRelationship(relationship([
            { '@id': 'd:Alice', 'cas:itemType': { '@id': 'cas:aSourceLink', extra: true } }
        ]))).toBe(false);
    });
});

describe('aPackage JSON-LD graph validation', () => {
    it('applies the anEntity schema to graph items', () => {
        expect(validatePackage(packageWith([], [entity([{ '@value': 'Alice' }])]))).toBe(true);
        expect(validatePackage(packageWith([], [entity([
            { '@value': 'Alice', 'cas:itemType': { '@id': 'cas:aProperty' } }
        ])]))).toBe(false);
    });

    it('applies the aRelationship schema to graph items', () => {
        expect(validatePackage(packageWith([], [relationship([
            { '@value': 'active' },
            { '@id': 'd:Alice', 'cas:itemType': { '@id': 'cas:aSourceLink' } },
            { '@id': 'd:ACME', 'cas:itemType': { '@id': 'cas:aTargetLink' } }
        ])]))).toBe(true);
        expect(validatePackage(packageWith([], [relationship([
            { '@value': 'active', 'cas:itemType': { '@id': 'cas:aProperty' } }
        ])]))).toBe(false);
        expect(validatePackage(packageWith([], [relationship([{ '@id': 'd:Alice' }])]))).toBe(false);
    });
});
