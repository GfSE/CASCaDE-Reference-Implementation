/*!
 * JEST Test Suite for CASCaRA (PIG) getMermaid() function
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * getMermaid() composes the graph in the neighbourhood of an item as Mermaid text; it does not
 * depend on Mermaid itself, so that the composition is tested here without a browser. Rendering
 * the composed text with Mermaid is covered by the Playwright suite tests/browser/page-graph.spec.ts.
 */

import * as path from 'path';
import { JsonldImporter } from '../src/import/jsonld/import-jsonld';
import { PigItemType, TPigItem } from '../src/schema/pig/ts/pig-metaclasses';
import {
    getMermaid, getMermaidGraph, escapeMermaidText, IGraphEdge, IMermaidGraph, MERMAID_DEFAULTS
} from '../src/export/mermaid/getMermaid';

const dataDir = path.resolve(__dirname, '../data/JSON-LD');

async function importItems(file: string): Promise<TPigItem[]> {
    const rsp = (await JsonldImporter.import(path.join(dataDir, file)))[0];
    expect(rsp.ok).toBe(true);
    return rsp.response as TPigItem[];
}
function itemById(items: TPigItem[], id: string): TPigItem {
    const item = items.find(itm => itm.id === id);
    if (!item) throw new Error(`Test fixture has no item with id '${id}'`);
    return item;
}
// 'source -kind:title-> target', so that edges are compared regardless of their order:
function edgeTexts(edges: IGraphEdge[]): string[] {
    return edges.map(e => `${e.source} -${e.kind}:${e.title}-> ${e.target}`).sort();
}
function nodeIds(graph: IMermaidGraph): string[] {
    return graph.nodes.map(n => n.id).sort();
}
function node(graph: IMermaidGraph, id: string) {
    const found = graph.nodes.find(n => n.id === id);
    if (!found) throw new Error(`Graph has no node with id '${id}'`);
    return found;
}
function lines(graph: IMermaidGraph): string[] {
    return graph.definition.split('\n').map(line => line.trim());
}
// Plain data in the shape of the metaclasses, for cases which the test packages do not contain:
function items(...data: (object | null)[]): TPigItem[] {
    return data as unknown as TPigItem[];
}
const en = (value: string) => [{ value, lang: 'en' }];

describe('getMermaid() with the package "Alice works for ACME"', () => {
    let cache: TPigItem[];
    beforeAll(async () => {
        cache = await importItems('11/Alice_works_for_ACME.cas.jsonld');
    });

    test('radius 1 shows the next neighbours of anEntity and completes the reified relationship', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en' });

        // d:ACME is two links away, but the relationship 'works for' has no meaning without it:
        expect(nodeIds(graph)).toEqual(['cas:Person', 'd:ACME', 'd:Alice', 'd:Alice_worksFor_ACME', 'd:Root_Alice_worksFor_ACME']);
        expect(edgeTexts(graph.edges)).toEqual([
            'd:Alice -instanceOf:instanceOf-> cas:Person',
            'd:Alice_worksFor_ACME -link:employee-> d:Alice',
            'd:Alice_worksFor_ACME -link:employer-> d:ACME',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:ACME',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:Alice'
        ]);
        expect(graph.radius).toBe(1);
        expect(graph.omitted).toBe(0);

        expect(node(graph, 'd:Alice')).toMatchObject({ key: 'n0', distance: 0, category: 'instance', shape: 'round', resolved: true, itemType: PigItemType.anEntity });
        expect(node(graph, 'cas:Person')).toMatchObject({ distance: 1, category: 'type', shape: 'round', itemType: PigItemType.Entity });
        expect(node(graph, 'd:Alice_worksFor_ACME')).toMatchObject({ distance: 1, category: 'instance', shape: 'hexagon', itemType: PigItemType.aRelationship });
        expect(node(graph, 'd:ACME')).toMatchObject({ distance: 2, category: 'instance', shape: 'round' });
    });

    test('nodes carry title, class, description and the configurable properties for a popup', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en' });

        expect(node(graph, 'd:Alice')).toMatchObject({
            title: 'Alice',
            classTitle: 'Person',
            properties: [{ title: 'family name', value: 'Carpenter' }, { title: 'given name', value: 'Alice' }]
        });
        // a reified relationship without a title of its own is named by its class:
        expect(node(graph, 'd:Alice_worksFor_ACME').title).toBe('works for');
        expect(node(graph, 'd:Root_Alice_worksFor_ACME').description).toBe('... anchoring all outlines of this graph (package)');
        // a type has no properties; its definition is shown when there is no description:
        expect(node(graph, 'cas:Person')).toMatchObject({ title: 'Person', description: 'A person (alive, dead, undead, or fictional).', properties: [] });
        expect(node(graph, 'cas:Person').classTitle).toBeUndefined();
    });

    test('the definition draws shapes, colours and line styles as required', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en' });
        const key = (id: string) => node(graph, id).key;
        const text = lines(graph);

        expect(text[0]).toBe('flowchart LR');
        // Entity and anEntity as round node, aRelationship as hexagonal node:
        expect(text).toContain(`${key('d:Alice')}(("Alice"))`);
        expect(text).toContain(`${key('cas:Person')}(("Person"))`);
        expect(text).toContain(`${key('d:Alice_worksFor_ACME')}{{"works for"}}`);
        // aLink as arrow with solid line, instanceOf as arrow with a line which is not solid:
        expect(text).toContain(`${key('d:Alice_worksFor_ACME')} -->|"employee"| ${key('d:Alice')}`);
        expect(text).toContain(`${key('d:Alice')} -.->|"instanceOf"| ${key('cas:Person')}`);
        // types in light orange RGB [255,205,153], instances in light yellow RGB [255,255,153]:
        expect(text).toContain('classDef casType fill:#ffcd99,stroke:#b36b00,color:#000000');
        expect(text).toContain('classDef casInstance fill:#ffff99,stroke:#999900,color:#000000');
        expect(text).toContain(`class ${key('cas:Person')} casType`);
        const instances = text.find(line => line.startsWith('class ') && line.endsWith(' casInstance')) ?? '';
        expect(instances.split(' ')[1].split(',').sort()).toEqual(
            ['d:Alice', 'd:Alice_worksFor_ACME', 'd:Root_Alice_worksFor_ACME', 'd:ACME'].map(key).sort());
        // the selected item is marked:
        expect(text).toContain(`class ${key('d:Alice')} casSelected`);
        // the dash pattern of the instanceOf edge is addressed by its position among the edges:
        const position = graph.edges.findIndex(e => e.kind === 'instanceOf');
        expect(text).toContain(`linkStyle ${position} stroke-dasharray:8 5`);
    });

    test('radius 2 adds the neighbours of the neighbours, including a class which is not available', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 2, { items: cache, lang: 'en' });

        expect(nodeIds(graph)).toEqual([
            'cas:Organization', 'cas:Person', 'cas:Root', 'cas:WorksFor',
            'd:ACME', 'd:Alice', 'd:Alice_worksFor_ACME', 'd:Root_Alice_worksFor_ACME', 'schema:Person'
        ]);
        // 'schema:Person' is referenced but not part of the package:
        expect(node(graph, 'schema:Person')).toMatchObject({ resolved: false, title: 'schema:Person', category: 'type', shape: 'round', distance: 2 });
        expect(node(graph, 'schema:Person').itemType).toBeUndefined();
        expect(node(graph, 'cas:WorksFor')).toMatchObject({ category: 'type', shape: 'hexagon', title: 'works for', distance: 2 });
        // the Relationship at the rim is completed by the Entity it relates:
        expect(node(graph, 'cas:Organization').distance).toBe(3);

        const edges = edgeTexts(graph.edges);
        expect(edges).toContain('cas:Person -specializes:specializes-> schema:Person');
        expect(edges).toContain('cas:WorksFor -link:employee-> cas:Person');
        expect(edges).toContain('cas:WorksFor -link:employer-> cas:Organization');
        expect(edges).toContain('d:Alice_worksFor_ACME -instanceOf:instanceOf-> cas:WorksFor');
        expect(edges).toContain('d:ACME -instanceOf:instanceOf-> cas:Organization');

        const text = lines(graph);
        const key = (id: string) => node(graph, id).key;
        // specializes as arrow with dotted line, told apart from the dashed instanceOf by its dash pattern:
        expect(text).toContain(`${key('cas:Person')} -.->|"specializes"| ${key('schema:Person')}`);
        const dotted = graph.edges.map((e, i) => e.kind === 'specializes' ? i : -1).filter(i => i >= 0);
        const dashed = graph.edges.map((e, i) => e.kind === 'instanceOf' ? i : -1).filter(i => i >= 0);
        expect(text).toContain(`linkStyle ${dotted.join(',')} stroke-dasharray:2 4`);
        expect(text).toContain(`linkStyle ${dashed.join(',')} stroke-dasharray:8 5`);
        expect(text).toContain(`class ${key('schema:Person')} casUnresolved`);
    });

    test('a Relationship (type) is shown with the Entities enumerated by its Link classes', () => {
        const graph = getMermaidGraph(itemById(cache, 'cas:WorksFor'), 1, { items: cache, lang: 'en' });

        expect(node(graph, 'cas:WorksFor')).toMatchObject({ distance: 0, category: 'type', shape: 'hexagon' });
        expect(edgeTexts(graph.edges)).toEqual([
            'cas:WorksFor -link:employee-> cas:Person',
            'cas:WorksFor -link:employer-> cas:Organization',
            'cas:WorksFor -specializes:specializes-> schema:WorksFor',
            'd:ACME -instanceOf:instanceOf-> cas:Organization',
            'd:Alice -instanceOf:instanceOf-> cas:Person',
            'd:Alice_worksFor_ACME -instanceOf:instanceOf-> cas:WorksFor',
            'd:Alice_worksFor_ACME -link:employee-> d:Alice',
            'd:Alice_worksFor_ACME -link:employer-> d:ACME'
        ]);
        // the specialized Relationship is not available and assumed to be a Relationship as well:
        expect(node(graph, 'schema:WorksFor')).toMatchObject({ resolved: false, category: 'type', shape: 'hexagon' });
    });

    test('aPackage is shown as instance of its class', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice_works_for_ACME'), 1, { items: cache, lang: 'en' });

        expect(node(graph, 'd:Alice_works_for_ACME')).toMatchObject({ distance: 0, category: 'instance', shape: 'round', title: 'Alice works for ACME' });
        expect(edgeTexts(graph.edges)).toEqual(['d:Alice_works_for_ACME -instanceOf:instanceOf-> cas:Package']);
    });

    test('the types Enumeration, Link and Property are neither selectable nor shown as node', () => {
        for (const id of ['o:Employee', 'cas:familyName']) {
            const graph = getMermaidGraph(itemById(cache, id), 1, { items: cache, lang: 'en' });
            expect(graph.nodes).toEqual([]);
            expect(graph.edges).toEqual([]);
            expect(lines(graph)[0]).toBe('flowchart LR');
        }
        const graph = getMermaidGraph(itemById(cache, 'cas:WorksFor'), 2, { items: cache, lang: 'en' });
        const shown = new Set<string>([PigItemType.Entity, PigItemType.Relationship, PigItemType.anEntity, PigItemType.aRelationship, PigItemType.aPackage]);
        for (const n of graph.nodes.filter(n => n.resolved)) {
            expect(shown.has(n.itemType as string)).toBe(true);
        }
    });

    test('getMermaid() returns just the definition of getMermaidGraph()', () => {
        const alice = itemById(cache, 'd:Alice');
        expect(getMermaid(alice, 2, { items: cache, lang: 'en' }))
            .toBe(getMermaidGraph(alice, 2, { items: cache, lang: 'en' }).definition);
        // the radius defaults to 1:
        expect(getMermaid(alice, undefined, { items: cache, lang: 'en' }))
            .toBe(getMermaid(alice, 1, { items: cache, lang: 'en' }));
    });

    test('without the items to search, only the references of the item itself are shown as unresolved nodes', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice_worksFor_ACME'), 1, { lang: 'en' });

        expect(edgeTexts(graph.edges)).toEqual([
            'd:Alice_worksFor_ACME -instanceOf:instanceOf-> cas:WorksFor',
            'd:Alice_worksFor_ACME -link:o:Employee-> d:Alice',
            'd:Alice_worksFor_ACME -link:o:Employer-> d:ACME'
        ]);
        expect(graph.nodes.filter(n => !n.resolved).map(n => n.id).sort()).toEqual(['cas:WorksFor', 'd:ACME', 'd:Alice']);
        // the title falls back to the id of the class:
        expect(node(graph, 'd:Alice_worksFor_ACME').title).toBe('cas:WorksFor');
    });
});

describe('getMermaid() with the package "Requirement with Enumerated Property"', () => {
    let cache: TPigItem[];
    beforeAll(async () => {
        cache = await importItems('05/Requirement_with_Enumerated_Property.cas.jsonld');
    });

    test('a link to an enumerated value is listed as property instead of being drawn as edge', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Req-35100bca2b005ba'), 2, { items: cache, lang: 'en' });

        expect(nodeIds(graph)).not.toContain('SpecIF:priorityRatherHigh');
        expect(nodeIds(graph)).not.toContain('SpecIF:Priority-Value');
        expect(node(graph, 'd:Req-35100bca2b005ba').properties).toContainEqual({ title: 'Priority', value: 'rather high' });
    });

    test('titles and enumerated values follow the requested language', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Req-35100bca2b005ba'), 1, { items: cache, lang: 'de' });
        expect(node(graph, 'd:Req-35100bca2b005ba').properties).toContainEqual({ title: 'Priorität', value: 'eher hoch' });
    });

    test('a description in XHTML becomes plain text', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Req-35100bca2b005ba'), 1, { items: cache, lang: 'en' });
        expect(node(graph, 'd:Req-35100bca2b005ba').description).toBe('The button size MUST not be less than 20mm in diameter.');
    });
});

describe('getMermaid() rules checked with composed data', () => {
    const entityType = { id: 'o:Thing', itemType: PigItemType.Entity, instanceOf: 'owl:Class', title: en('Thing') };
    const linkType = { id: 'o:refersTo', itemType: PigItemType.Link, title: en('refers to'), enumeratedEndpoint: ['o:Thing'] };
    const thing = (id: string, title: string, targets: string[] = [], linkClass = 'o:refersTo') => ({
        id,
        itemType: PigItemType.anEntity,
        instanceOf: 'o:Thing',
        title: en(title),
        hasTargetLink: targets.map(idRef => ({ itemType: PigItemType.aTargetLink, instanceOf: linkClass, idRef }))
    });

    test('radius 0 shows the selected item alone, a selected relationship still with its endpoints', () => {
        const cache = items(entityType, linkType, thing('d:a', 'A', ['d:b']), thing('d:b', 'B'), {
            id: 'd:r', itemType: PigItemType.aRelationship, instanceOf: 'o:Rel',
            hasSourceLink: [{ instanceOf: 'o:refersTo', idRef: 'd:a' }],
            hasTargetLink: [{ instanceOf: 'o:refersTo', idRef: 'd:b' }]
        });

        expect(nodeIds(getMermaidGraph(cache[2], 0, { items: cache }))).toEqual(['d:a']);
        expect(nodeIds(getMermaidGraph(cache[4], 0, { items: cache }))).toEqual(['d:a', 'd:b', 'd:r']);
    });

    test('an invalid radius falls back to a valid one', () => {
        const cache = items(entityType, linkType, thing('d:a', 'A', ['d:b']), thing('d:b', 'B', ['d:c']), thing('d:c', 'C'));
        const ids = (radius: number) => nodeIds(getMermaidGraph(cache[2], radius, { items: cache })).join(' ');

        expect(ids(Number.NaN)).toBe(ids(1));
        expect(ids(-3)).toBe('d:a');
        expect(ids(1.9)).toBe(ids(1));
        expect(getMermaidGraph(cache[2], 1.9, { items: cache }).radius).toBe(1);
    });

    test('incoming links are neighbours as well as outgoing ones', () => {
        const cache = items(entityType, linkType, thing('d:a', 'A', ['d:b']), thing('d:b', 'B'), thing('d:c', 'C', ['d:b']));
        const graph = getMermaidGraph(cache[3], 1, { items: cache });

        expect(nodeIds(graph)).toEqual(['d:a', 'd:b', 'd:c', 'o:Thing']);
        expect(edgeTexts(graph.edges)).toContain('d:a -link:refers to-> d:b');
        expect(edgeTexts(graph.edges)).toContain('d:c -link:refers to-> d:b');
    });

    test('links of different classes between the same two nodes are drawn as one edge with all titles', () => {
        const other = { id: 'o:dependsOn', itemType: PigItemType.Link, title: en('depends on'), enumeratedEndpoint: ['o:Thing'] };
        const a = thing('d:a', 'A', ['d:b', 'd:b']);
        a.hasTargetLink.push({ itemType: PigItemType.aTargetLink, instanceOf: 'o:dependsOn', idRef: 'd:b' });
        const cache = items(entityType, linkType, other, a, thing('d:b', 'B', ['d:a']));
        const graph = getMermaidGraph(cache[3], 1, { items: cache });

        expect(edgeTexts(graph.edges).filter(e => e.includes('-link:'))).toEqual([
            'd:a -link:refers to, depends on-> d:b',
            'd:b -link:refers to-> d:a'
        ]);
    });

    test('the number of nodes is limited, the nodes next to the selected item take precedence', () => {
        const instances = Array.from({ length: 100 }, (_, i) => thing(`d:i${i}`, `Instance ${i}`));
        const cache = items(entityType, linkType, ...instances);
        const graph = getMermaidGraph(cache[0], 1, { items: cache });

        expect(graph.nodes.length).toBe(MERMAID_DEFAULTS.maxNodes);
        expect(graph.nodes[0].id).toBe('o:Thing');
        // the type itself and its 100 instances are within the radius:
        expect(graph.omitted).toBe(101 - MERMAID_DEFAULTS.maxNodes);
        expect(lines(graph)).toContain(`%% ${graph.omitted} more nodes within the radius are not shown`);
        // every edge refers to nodes which are shown:
        const shown = new Set(graph.nodes.map(n => n.id));
        expect(graph.edges.every(e => shown.has(e.source) && shown.has(e.target))).toBe(true);

        const limited = getMermaidGraph(cache[0], 1, { items: cache, maxNodes: 5 });
        expect(limited.nodes.length).toBe(5);
        expect(limited.omitted).toBe(96);
    });

    test('the layout direction is configurable', () => {
        const cache = items(entityType, thing('d:a', 'A'));
        expect(lines(getMermaidGraph(cache[1], 1, { items: cache, direction: 'TB' }))[0]).toBe('flowchart TB');
    });

    test('a limited graph shows a relationship with all elements it relates or not at all', () => {
        const relate = (id: string, source: string, target: string) => ({
            id, itemType: PigItemType.aRelationship, instanceOf: 'o:Rel',
            hasSourceLink: [{ instanceOf: 'o:refersTo', idRef: source }],
            hasTargetLink: [{ instanceOf: 'o:refersTo', idRef: target }]
        });
        // d:a is related to d:b1 ... d:b6, each by a relationship of its own:
        const others = Array.from({ length: 6 }, (_, i) => thing(`d:b${i + 1}`, `B${i + 1}`));
        const relations = others.map((other, i) => relate(`d:r${i + 1}`, 'd:a', other.id));
        const cache = items(entityType, linkType, thing('d:a', 'A'), ...others, ...relations);

        // 14 nodes are within the radius: d:a, its class, the 6 relationships and their 6 other ends
        expect(getMermaidGraph(cache[2], 1, { items: cache }).nodes.length).toBe(14);
        for (const maxNodes of [3, 4, 5, 6, 7, 8, 9, 10, 13]) {
            const graph = getMermaidGraph(cache[2], 1, { items: cache, maxNodes });
            const shown = new Set(graph.nodes.map(n => n.id));

            expect(graph.nodes.length).toBeLessThanOrEqual(maxNodes);
            expect(graph.nodes.length + graph.omitted).toBe(14);
            for (const relation of relations.filter(r => shown.has(r.id))) {
                expect(shown.has(relation.hasSourceLink[0].idRef)).toBe(true);
                expect(shown.has(relation.hasTargetLink[0].idRef)).toBe(true);
            }
            // no node is shown without a connection to the others:
            for (const n of graph.nodes.filter(n => n.distance > 0)) {
                expect(graph.edges.some(e => e.source === n.id || e.target === n.id)).toBe(true);
            }
        }
        // a relationship and its other end take two nodes, so that the last one allowed may stay unused:
        expect(nodeIds(getMermaidGraph(cache[2], 1, { items: cache, maxNodes: 5 }))).toEqual(['d:a', 'd:b1', 'd:r1', 'o:Thing']);
        // a selected relationship takes its ends along, as far as the limit allows:
        expect(nodeIds(getMermaidGraph(cache[9], 1, { items: cache, maxNodes: 3 }))).toEqual(['d:a', 'd:b1', 'd:r1']);
        expect(nodeIds(getMermaidGraph(cache[9], 1, { items: cache, maxNodes: 1 }))).toEqual(['d:r1']);
    });

    test('in a limited graph, the nodes of equal distance take turns by the node they are reached from', () => {
        // d:a lists the folders d:f1 and d:f2, the first with 10 and the second with 3 children:
        const children1 = Array.from({ length: 10 }, (_, i) => thing(`d:x${i}`, `X${i}`));
        const children2 = Array.from({ length: 3 }, (_, i) => thing(`d:y${i}`, `Y${i}`));
        const cache = items(
            { id: 'd:a', itemType: PigItemType.anEntity, title: en('A'), hasTargetLink: [{ instanceOf: 'o:refersTo', idRef: 'd:f1' }, { instanceOf: 'o:refersTo', idRef: 'd:f2' }] },
            { id: 'd:f1', itemType: PigItemType.anEntity, title: en('F1'), hasTargetLink: children1.map(c => ({ instanceOf: 'o:refersTo', idRef: c.id })) },
            { id: 'd:f2', itemType: PigItemType.anEntity, title: en('F2'), hasTargetLink: children2.map(c => ({ instanceOf: 'o:refersTo', idRef: c.id })) },
            linkType, ...children1.map(c => ({ ...c, instanceOf: undefined })), ...children2.map(c => ({ ...c, instanceOf: undefined }))
        );

        expect(getMermaidGraph(cache[0], 2, { items: cache }).nodes.length).toBe(16);
        // the 4 nodes left for the second ring are shared by both folders, instead of all going to the first one:
        const graph = getMermaidGraph(cache[0], 2, { items: cache, maxNodes: 7 });
        expect(graph.nodes.map(n => n.id)).toEqual(['d:a', 'd:f1', 'd:f2', 'd:x0', 'd:y0', 'd:x1', 'd:y1']);
        expect(graph.omitted).toBe(9);
        // the nearer nodes precede the farther ones:
        expect(graph.nodes.map(n => n.distance)).toEqual([0, 1, 1, 2, 2, 2, 2]);
    });

    test('a diagram is not listed with the properties of a node', () => {
        const cache = items(
            { id: 'o:Thing', itemType: PigItemType.Entity, title: [{ value: 'Thing' }] },
            { id: 'o:Name', itemType: PigItemType.Property, title: [{ value: 'Name' }] },
            {
                id: 'd:a', itemType: PigItemType.anEntity, instanceOf: 'o:Thing',
                hasProperty: [
                    { itemType: PigItemType.aProperty, instanceOf: 'cas:Diagram', value: '<object data="plan.svg" type="image/svg+xml">plan.svg</object>' },
                    { itemType: PigItemType.aProperty, instanceOf: 'o:Name', value: [{ value: 'Plan' }] }
                ]
            }
        );

        const graph = getMermaidGraph(itemById(cache, 'd:a'), 1, { items: cache });
        expect(node(graph, 'd:a').properties).toEqual([{ title: 'Name', value: 'Plan' }]);
    });

    test('the neighbourhood of an item which is not available is not explored', () => {
        // all three types specialize the metaclass, which is no item of a package:
        const type = (id: string) => ({ id, itemType: PigItemType.Entity, specializes: 'cas:Entity' });
        const cache = items(type('o:A'), type('o:B'), type('o:C'), { id: 'd:b', itemType: PigItemType.anEntity, instanceOf: 'o:B' });

        for (const radius of [1, 2, 3]) {
            const graph = getMermaidGraph(cache[0], radius, { items: cache });
            // ... so that they are not neighbours of each other:
            expect(nodeIds(graph)).toEqual(['cas:Entity', 'o:A']);
            expect(edgeTexts(graph.edges)).toEqual(['o:A -specializes:specializes-> cas:Entity']);
            expect(node(graph, 'cas:Entity')).toMatchObject({ resolved: false, distance: 1 });
        }
    });

    test('a relationship relating relationships is completed down to the related entities', () => {
        const cache = items(
            { id: 'd:r1', itemType: PigItemType.aRelationship, hasSourceLink: [{ idRef: 'd:a' }], hasTargetLink: [{ idRef: 'd:r2' }] },
            { id: 'd:r2', itemType: PigItemType.aRelationship, hasSourceLink: [{ idRef: 'd:b' }], hasTargetLink: [{ idRef: 'd:c' }] },
            { id: 'd:a', itemType: PigItemType.anEntity }, { id: 'd:b', itemType: PigItemType.anEntity }, { id: 'd:c', itemType: PigItemType.anEntity }
        );
        const graph = getMermaidGraph(cache[2], 1, { items: cache });

        // d:a is linked by d:r1 only; d:r1 brings its other end d:r2, which brings its ends d:b and d:c:
        expect(graph.nodes.map(n => `${n.id}=${n.distance}`)).toEqual(['d:a=0', 'd:r1=1', 'd:r2=2', 'd:b=3', 'd:c=3']);
    });

    test('a title without any printable character does not yield an empty label', () => {
        const cache = items(
            { id: 'd:a', itemType: PigItemType.anEntity, title: en('\u0001\u0002'), hasTargetLink: [{ instanceOf: 'o:blank', idRef: 'd:b' }] },
            { id: 'd:b', itemType: PigItemType.anEntity, title: en('   ') },
            { id: 'o:blank', itemType: PigItemType.Link, title: en('\u0007') }
        );
        const text = lines(getMermaidGraph(cache[0], 1, { items: cache }));

        expect(text).toContain('n0(("?"))');
        // a title of blanks only counts as missing, so that the id is shown:
        expect(text).toContain('n1(("d#58;b"))');
        expect(text).toContain('n0 -->|"?"| n1');
    });

    test('node keys are generated and never derived from the ids', () => {
        // 'end' is a reserved word of Mermaid and both ids would collide when cleaned or shortened:
        const cache = items(entityType, linkType, thing('end', 'A', ['d:x y', 'd:x_y']), thing('d:x y', 'B'), thing('d:x_y', 'C'));
        const graph = getMermaidGraph(cache[2], 1, { items: cache });

        expect(graph.nodes.map(n => n.key)).toEqual(['n0', 'n1', 'n2', 'n3']);
        expect(new Set(graph.nodes.map(n => n.id)).size).toBe(4);
        for (const line of lines(graph).filter(l => /^n\d+[({]/.test(l))) {
            expect(line).toMatch(/^n\d+(\(\("[^"]+"\)\)|\{\{"[^"]+"\}\})$/);
        }
    });

    test('a long title is shortened in the definition, but kept in full for the popup', () => {
        const long = 'This requirement has a title which is far too long to be shown in a node';
        const cache = items(entityType, thing('d:a', long), thing('d:b', '😀'.repeat(50)));

        const graph = getMermaidGraph(cache[1], 1, { items: cache });
        expect(graph.nodes[0].title).toBe(long);
        expect(lines(graph)).toContain('n0(("This requirement has a title which is f…"))');
        expect(lines(getMermaidGraph(cache[1], 1, { items: cache, maxLabelLength: 12 }))).toContain('n0(("This requir…"))');
        // counted and cut by characters, so that no emoji is cut in half:
        expect(lines(getMermaidGraph(cache[2], 1, { items: cache, maxLabelLength: 10 }))).toContain(`n0(("${'😀'.repeat(9)}…"))`);
        // an id used as title keeps its end, which tells it apart from other ids:
        const untitled = items({ id: 'https://example.org/a/very/long/path/to/an/ontology#Thing', itemType: PigItemType.Entity });
        expect(lines(getMermaidGraph(untitled[0], 1, { maxLabelLength: 20 }))).toContain('n0(("…o/an/ontology#35;Thing"))');
    });

    test('a title cannot break or alter the definition', () => {
        const nasty = 'a "b" <img src=x onerror=alert(1)> & #9829; `c` \\n $$x^2$$ 100% %%{init: {"theme":"dark"}}%% fa:fa-ban\nnext\tline';
        const cache = items(entityType, { ...linkType, title: en(nasty) }, thing('d:a', nasty, ['d:b']), thing('d:b', 'end'));
        const graph = getMermaidGraph(cache[2], 1, { items: cache, maxLabelLength: 500 });
        const expected = 'a #quot;b#quot; #lt;img src=x onerror=alert(1)#gt; #amp; #35;9829; #96;c#96; #92;n #36;#36;x^2#36;#36; 100#37; '
            + '#37;#37;{init#58; {#quot;theme#quot;#58;#quot;dark#quot;}}#37;#37; fa#58;fa-ban next line';

        expect(graph.nodes[0].title).toBe(nasty.replace(/\s+/g, ' '));
        expect(lines(graph)).toContain(`n0(("${expected}"))`);
        expect(lines(graph)).toContain(`n0 -->|"${expected}"| ${node(graph, 'd:b').key}`);
        // no line holds more than the generated syntax: a label is the only place for free text
        for (const line of lines(graph).slice(1)) {
            expect(line).toMatch(/^(%% [\w :,]+|n\d+(\(\("[^"<>&`\\$%:]+"\)\)|\{\{"[^"<>&`\\$%:]+"\}\})|n\d+ -\.?->\|"[^"<>&`\\$%:]+"\| n\d+|classDef cas\w+ [\w:#,\- ]+|class [n\d,]+ cas\w+|linkStyle [\d,]+ stroke-dasharray:[\d ]+)$/);
        }
    });

    test('escapeMermaidText() replaces every character with a meaning for Mermaid', () => {
        expect(escapeMermaidText('plain text 123 äöü €')).toBe('plain text 123 äöü €');
        expect(escapeMermaidText('#"<>&`\\$%:')).toBe('#35;#quot;#lt;#gt;#amp;#96;#92;#36;#37;#58;');
        expect(escapeMermaidText('  two\r\nlines\u2028and\ttabs  ')).toBe('two lines and tabs');
        expect(escapeMermaidText('')).toBe('');
        expect(escapeMermaidText(undefined as unknown as string)).toBe('');
    });

    test('items with a broken reference do not break the composition', () => {
        const cache = items(entityType, linkType, {
            id: 'd:a', itemType: PigItemType.anEntity, instanceOf: 'o:Thing',
            hasProperty: [null, { instanceOf: 'o:size' }, { instanceOf: 'o:size', value: 5 }],
            hasTargetLink: [null, { instanceOf: 'o:refersTo' }, { idRef: 'd:gone' }, { instanceOf: 'o:unknownLink', idRef: 'd:a' }]
        }, null, { itemType: PigItemType.anEntity }, { id: 'o:T2', itemType: PigItemType.Entity, enumeratedTargetLink: ['o:missingLink', 'o:Thing'] });
        const graph = getMermaidGraph(cache[2], 1, { items: cache });

        expect(nodeIds(graph)).toEqual(['d:a', 'd:gone', 'o:Thing']);
        expect(edgeTexts(graph.edges)).toEqual([
            'd:a -instanceOf:instanceOf-> o:Thing',
            'd:a -link:link-> d:gone',
            'd:a -link:o:unknownLink-> d:a'
        ]);
        expect(graph.nodes[0].properties).toEqual([{ title: 'o:size', value: '5' }]);
        expect(node(graph, 'd:gone')).toMatchObject({ resolved: false, category: 'instance', shape: 'round' });
    });
});
