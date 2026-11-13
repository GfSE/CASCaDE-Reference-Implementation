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
// 'id=distance' of the nodes in the order of their precedence:
function distances(graph: IMermaidGraph): string[] {
    return graph.nodes.map(n => `${n.id}=${n.distance}`);
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

    test('radius 1 shows the next neighbours of anEntity, where a relationship is an edge to its target', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en' });

        // the relationship 'works for' is no node; d:ACME at its other end is thus a next neighbour:
        expect(nodeIds(graph)).toEqual(['cas:Person', 'd:ACME', 'd:Alice', 'd:Root_Alice_worksFor_ACME']);
        expect(edgeTexts(graph.edges)).toEqual([
            'd:Alice -instanceOf:instanceOf-> cas:Person',
            'd:Alice -relationship:works for-> d:ACME',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:ACME',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:Alice'
        ]);
        expect(graph.radius).toBe(1);
        expect(graph.expanded).toBe(false);
        expect(graph.omitted).toBe(0);

        expect(node(graph, 'd:Alice')).toMatchObject({ key: 'n0', distance: 0, category: 'instance', shape: 'rounded', resolved: true, itemType: PigItemType.anEntity });
        expect(node(graph, 'cas:Person')).toMatchObject({ distance: 1, category: 'type', shape: 'rounded', itemType: PigItemType.Entity });
        expect(node(graph, 'd:ACME')).toMatchObject({ distance: 1, category: 'instance', shape: 'rounded' });
    });

    test('radius 1 of an expanded graph shows the relationship as node, which counts as a step', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en', expanded: true });

        // d:ACME at the other end of the relationship is two steps away and thus not shown:
        expect(nodeIds(graph)).toEqual(['cas:Person', 'd:Alice', 'd:Alice_worksFor_ACME', 'd:Root_Alice_worksFor_ACME']);
        expect(edgeTexts(graph.edges)).toEqual([
            'd:Alice -instanceOf:instanceOf-> cas:Person',
            'd:Alice_worksFor_ACME -link:employee-> d:Alice',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:Alice'
        ]);
        expect(graph.expanded).toBe(true);
        expect(node(graph, 'd:Alice_worksFor_ACME')).toMatchObject({ distance: 1, category: 'instance', shape: 'hexagon', itemType: PigItemType.aRelationship });
    });

    test('nodes carry title, class, description and the configurable properties for a popup', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en' });

        expect(node(graph, 'd:Alice')).toMatchObject({
            title: 'Alice',
            classTitle: 'Person',
            properties: [{ title: 'family name', value: 'Carpenter' }, { title: 'given name', value: 'Alice' }]
        });
        expect(node(graph, 'd:Root_Alice_worksFor_ACME').description).toBe('... anchoring all outlines of this graph (package)');
        // a type has no properties; its definition is shown when there is no description:
        expect(node(graph, 'cas:Person')).toMatchObject({ title: 'Person', description: 'A person (alive, dead, undead, or fictional).', properties: [] });
        expect(node(graph, 'cas:Person').classTitle).toBeUndefined();
        // a reified relationship without a title of its own is named by its class:
        const expanded = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en', expanded: true });
        expect(node(expanded, 'd:Alice_worksFor_ACME')).toMatchObject({ title: 'works for', classTitle: 'works for' });
    });

    test('the definition draws shapes, colours and line styles as required', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en' });
        const key = (id: string) => node(graph, id).key;
        const text = lines(graph);

        // the types at the left and the instances at the right, so that all edges point to the left:
        expect(text[0]).toBe('flowchart RL');
        // Entity and anEntity as rectangle with rounded corners:
        expect(text).toContain(`${key('d:Alice')}("Alice")`);
        expect(text).toContain(`${key('cas:Person')}("Person")`);
        // aRelationship as arrow with double line from its source to its target, which is the thick link of Mermaid:
        expect(text).toContain(`${key('d:Alice')} ==>|"works for"| ${key('d:ACME')}`);
        // aLink as arrow with solid line, instanceOf as arrow with a line which is not solid:
        expect(text).toContain(`${key('d:Root_Alice_worksFor_ACME')} -->|"lists"| ${key('d:Alice')}`);
        expect(text).toContain(`${key('d:Alice')} -.->|"instanceOf"| ${key('cas:Person')}`);
        // types in light orange RGB [255,205,153], instances in light yellow RGB [255,255,153]:
        expect(text).toContain('classDef casType fill:#ffcd99,stroke:#b36b00,color:#000000');
        expect(text).toContain('classDef casInstance fill:#ffff99,stroke:#999900,color:#000000');
        expect(text).toContain(`class ${key('cas:Person')} casType`);
        const instances = text.find(line => line.startsWith('class ') && line.endsWith(' casInstance')) ?? '';
        expect(instances.split(' ')[1].split(',').sort()).toEqual(
            ['d:Alice', 'd:Root_Alice_worksFor_ACME', 'd:ACME'].map(key).sort());
        // the selected item is marked:
        expect(text).toContain(`class ${key('d:Alice')} casSelected`);
        // the dash pattern of the instanceOf edge is addressed by its position among the edges; no other edge has one:
        const position = graph.edges.findIndex(e => e.kind === 'instanceOf');
        expect(text.filter(line => line.startsWith('linkStyle '))).toEqual([`linkStyle ${position} stroke-dasharray:8 5`]);
    });

    test('the definition of an expanded graph draws aRelationship as hexagonal node with its links', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { items: cache, lang: 'en', expanded: true });
        const key = (id: string) => node(graph, id).key;
        const text = lines(graph);

        expect(text[0]).toBe('flowchart RL');
        expect(text).toContain(`${key('d:Alice')}("Alice")`);
        expect(text).toContain(`${key('d:Alice_worksFor_ACME')}{{"works for"}}`);
        expect(text).toContain(`${key('d:Alice_worksFor_ACME')} -->|"employee"| ${key('d:Alice')}`);
        // no relationship is drawn as edge:
        expect(text.filter(line => line.includes('==>'))).toEqual([]);
        const instances = text.find(line => line.startsWith('class ') && line.endsWith(' casInstance')) ?? '';
        expect(instances.split(' ')[1].split(',').sort()).toEqual(
            ['d:Alice', 'd:Alice_worksFor_ACME', 'd:Root_Alice_worksFor_ACME'].map(key).sort());
    });

    test('radius 2 adds the neighbours of the neighbours, including a class which is not available', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 2, { items: cache, lang: 'en' });

        expect(nodeIds(graph)).toEqual([
            'cas:Organization', 'cas:Person', 'cas:Root', 'd:ACME', 'd:Alice', 'd:Root_Alice_worksFor_ACME', 'schema:Person'
        ]);
        expect(edgeTexts(graph.edges)).toEqual([
            'cas:Person -specializes:specializes-> schema:Person',
            'd:ACME -instanceOf:instanceOf-> cas:Organization',
            'd:Alice -instanceOf:instanceOf-> cas:Person',
            'd:Alice -relationship:works for-> d:ACME',
            'd:Root_Alice_worksFor_ACME -instanceOf:instanceOf-> cas:Root',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:ACME',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:Alice'
        ]);
        // 'schema:Person' is referenced but not part of the package:
        expect(node(graph, 'schema:Person')).toMatchObject({ resolved: false, title: 'schema:Person', category: 'type', shape: 'rounded', distance: 2 });
        expect(node(graph, 'schema:Person').itemType).toBeUndefined();
        expect(node(graph, 'cas:Organization').distance).toBe(2);

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

    test('radius 2 of an expanded graph reaches the other end of a relationship and its class', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 2, { items: cache, lang: 'en', expanded: true });

        // 'cas:Organization' is three steps away, by the relationship as well as by its class:
        expect(nodeIds(graph)).toEqual([
            'cas:Person', 'cas:Root', 'cas:WorksFor', 'd:ACME', 'd:Alice', 'd:Alice_worksFor_ACME', 'd:Root_Alice_worksFor_ACME', 'schema:Person'
        ]);
        expect(edgeTexts(graph.edges)).toEqual([
            'cas:Person -specializes:specializes-> schema:Person',
            'cas:WorksFor -link:employee-> cas:Person',
            'd:Alice -instanceOf:instanceOf-> cas:Person',
            'd:Alice_worksFor_ACME -instanceOf:instanceOf-> cas:WorksFor',
            'd:Alice_worksFor_ACME -link:employee-> d:Alice',
            'd:Alice_worksFor_ACME -link:employer-> d:ACME',
            'd:Root_Alice_worksFor_ACME -instanceOf:instanceOf-> cas:Root',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:ACME',
            'd:Root_Alice_worksFor_ACME -link:lists-> d:Alice'
        ]);
        expect(node(graph, 'd:ACME').distance).toBe(2);
        expect(node(graph, 'cas:WorksFor')).toMatchObject({ category: 'type', shape: 'hexagon', title: 'works for', distance: 2 });
    });

    test('a Relationship (type) is shown in an expanded graph with the Entities enumerated by its Link classes', () => {
        const graph = getMermaidGraph(itemById(cache, 'cas:WorksFor'), 1, { items: cache, lang: 'en', expanded: true });

        expect(node(graph, 'cas:WorksFor')).toMatchObject({ distance: 0, category: 'type', shape: 'hexagon' });
        expect(edgeTexts(graph.edges)).toEqual([
            'cas:WorksFor -link:employee-> cas:Person',
            'cas:WorksFor -link:employer-> cas:Organization',
            'cas:WorksFor -specializes:specializes-> schema:WorksFor',
            'd:Alice_worksFor_ACME -instanceOf:instanceOf-> cas:WorksFor'
        ]);
        // the specialized Relationship is not available and assumed to be a Relationship as well:
        expect(node(graph, 'schema:WorksFor')).toMatchObject({ resolved: false, category: 'type', shape: 'hexagon' });
    });

    test('a relationship is a node in an expanded graph only', () => {
        // neither a Relationship nor aRelationship can be selected otherwise:
        for (const id of ['cas:WorksFor', 'd:Alice_worksFor_ACME']) {
            const graph = getMermaidGraph(itemById(cache, id), 1, { items: cache, lang: 'en' });
            expect(graph.nodes).toEqual([]);
            expect(graph.edges).toEqual([]);
            expect(lines(graph)).toEqual(['flowchart RL', '%% a relationship is a node in an expanded graph only']);
            expect(getMermaidGraph(itemById(cache, id), 1, { items: cache, lang: 'en', expanded: true }).nodes[0].id).toBe(id);
        }
        // ... and none is shown, however large the radius:
        const graph = getMermaidGraph(itemById(cache, 'd:Alice'), 5, { items: cache, lang: 'en' });
        expect(graph.nodes.filter(n => n.shape !== 'rounded')).toEqual([]);
        const entities = new Set<string>([PigItemType.Entity, PigItemType.anEntity, PigItemType.aPackage]);
        for (const n of graph.nodes.filter(n => n.resolved)) {
            expect(entities.has(n.itemType as string)).toBe(true);
        }
        // 'cas:Root' enumerates links to the metaclasses of all entities and of all relationships, which are
        // no items of the package: the first is shown as it is referenced, the latter in an expanded graph only
        expect(nodeIds(graph)).toContain('cas:Entity');
        expect(nodeIds(graph)).not.toContain('cas:Relationship');
        const expanded = getMermaidGraph(itemById(cache, 'd:Alice'), 5, { items: cache, lang: 'en', expanded: true });
        expect(node(expanded, 'cas:Relationship')).toMatchObject({ resolved: false, category: 'type', shape: 'hexagon' });
    });

    test('aPackage is shown as instance of its class', () => {
        const graph = getMermaidGraph(itemById(cache, 'd:Alice_works_for_ACME'), 1, { items: cache, lang: 'en' });

        expect(node(graph, 'd:Alice_works_for_ACME')).toMatchObject({ distance: 0, category: 'instance', shape: 'rounded', title: 'Alice works for ACME' });
        expect(edgeTexts(graph.edges)).toEqual(['d:Alice_works_for_ACME -instanceOf:instanceOf-> cas:Package']);
    });

    test('the types Enumeration, Link and Property are neither selectable nor shown as node', () => {
        for (const id of ['o:Employee', 'cas:familyName']) {
            for (const expanded of [false, true]) {
                const graph = getMermaidGraph(itemById(cache, id), 1, { items: cache, lang: 'en', expanded });
                expect(graph.nodes).toEqual([]);
                expect(graph.edges).toEqual([]);
                expect(lines(graph)).toEqual(['flowchart RL', '%% there is no graph for an item of this type']);
            }
        }
        const graph = getMermaidGraph(itemById(cache, 'cas:WorksFor'), 2, { items: cache, lang: 'en', expanded: true });
        const shown = new Set<string>([PigItemType.Entity, PigItemType.Relationship, PigItemType.anEntity, PigItemType.aRelationship, PigItemType.aPackage]);
        for (const n of graph.nodes.filter(n => n.resolved)) {
            expect(shown.has(n.itemType as string)).toBe(true);
        }
    });

    test('getMermaid() returns just the definition of getMermaidGraph()', () => {
        const alice = itemById(cache, 'd:Alice');
        for (const expanded of [false, true]) {
            expect(getMermaid(alice, 2, { items: cache, lang: 'en', expanded }))
                .toBe(getMermaidGraph(alice, 2, { items: cache, lang: 'en', expanded }).definition);
        }
        // the radius defaults to 1 and the graph is not expanded by default:
        expect(getMermaid(alice, undefined, { items: cache, lang: 'en' }))
            .toBe(getMermaid(alice, 1, { items: cache, lang: 'en', expanded: false }));
        expect(getMermaid(alice, 1, { items: cache, lang: 'en' }))
            .not.toBe(getMermaid(alice, 1, { items: cache, lang: 'en', expanded: true }));
    });

    test('without the items to search, only the references of the item itself are shown as unresolved nodes', () => {
        const alice = getMermaidGraph(itemById(cache, 'd:Alice'), 1, { lang: 'en' });
        expect(edgeTexts(alice.edges)).toEqual(['d:Alice -instanceOf:instanceOf-> cas:Person']);
        expect(node(alice, 'cas:Person')).toMatchObject({ resolved: false, category: 'type', shape: 'rounded' });

        const graph = getMermaidGraph(itemById(cache, 'd:Alice_worksFor_ACME'), 1, { lang: 'en', expanded: true });
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
        for (const expanded of [false, true]) {
            const graph = getMermaidGraph(itemById(cache, 'd:Req-35100bca2b005ba'), 2, { items: cache, lang: 'en', expanded });

            expect(nodeIds(graph)).not.toContain('SpecIF:priorityRatherHigh');
            expect(nodeIds(graph)).not.toContain('SpecIF:Priority-Value');
            expect(node(graph, 'd:Req-35100bca2b005ba').properties).toContainEqual({ title: 'Priority', value: 'rather high' });
        }
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
    // An entity without a class, so that the entities are not neighbours by their class:
    const plain = (id: string, title: string) => ({ id, itemType: PigItemType.anEntity, title: en(title) });
    const relationshipType = { id: 'o:dependsOn', itemType: PigItemType.Relationship, title: en('depends on') };
    const relate = (id: string, sources: string[], targets: string[], title?: string) => ({
        id,
        itemType: PigItemType.aRelationship,
        instanceOf: 'o:dependsOn',
        title: title ? en(title) : undefined,
        hasSourceLink: sources.map(idRef => ({ itemType: PigItemType.aSourceLink, instanceOf: 'o:dependent', idRef })),
        hasTargetLink: targets.map(idRef => ({ itemType: PigItemType.aTargetLink, instanceOf: 'o:dependency', idRef }))
    });

    test('an aRelationship is drawn as edge from its source to its target and counts as one step', () => {
        const cache = items(relationshipType, plain('d:a', 'A'), plain('d:b', 'B'), plain('d:c', 'C'),
            relate('d:r1', ['d:a'], ['d:b']), relate('d:r2', ['d:b'], ['d:c'], 'blocks'));

        const graph = getMermaidGraph(cache[1], 1, { items: cache });
        expect(distances(graph)).toEqual(['d:a=0', 'd:b=1']);
        // the relationship is named by its class, unless it has a title of its own:
        expect(edgeTexts(graph.edges)).toEqual(['d:a -relationship:depends on-> d:b']);
        expect(lines(graph)).toContain('n0 ==>|"depends on"| n1');

        const wider = getMermaidGraph(cache[1], 2, { items: cache });
        expect(distances(wider)).toEqual(['d:a=0', 'd:b=1', 'd:c=2']);
        expect(edgeTexts(wider.edges)).toEqual(['d:a -relationship:depends on-> d:b', 'd:b -relationship:blocks-> d:c']);
        // an incoming relationship is followed as well as an outgoing one:
        expect(distances(getMermaidGraph(cache[3], 1, { items: cache }))).toEqual(['d:c=0', 'd:b=1']);
    });

    test('in an expanded graph, every node counts as a step, a reified relationship included', () => {
        const cache = items(relationshipType, plain('d:a', 'A'), plain('d:b', 'B'), plain('d:c', 'C'),
            relate('d:r1', ['d:a'], ['d:b']), relate('d:r2', ['d:b'], ['d:c'], 'blocks'));
        const graph = (radius: number) => getMermaidGraph(cache[1], radius, { items: cache, expanded: true });

        // a relationship at the rim is shown without its other end:
        expect(distances(graph(1))).toEqual(['d:a=0', 'd:r1=1']);
        expect(edgeTexts(graph(1).edges)).toEqual(['d:r1 -link:o:dependent-> d:a']);
        // ... which is two steps away, just as the class of the relationship:
        expect(distances(graph(2))).toEqual(['d:a=0', 'd:r1=1', 'o:dependsOn=2', 'd:b=2']);
        expect(distances(graph(3))).toEqual(['d:a=0', 'd:r1=1', 'o:dependsOn=2', 'd:b=2', 'd:r2=3']);
        expect(distances(graph(4))).toEqual(['d:a=0', 'd:r1=1', 'o:dependsOn=2', 'd:b=2', 'd:r2=3', 'd:c=4']);
        // the expanded graph is thus smaller than the other one of the same radius, if it does not reach the classes:
        expect(nodeIds(getMermaidGraph(cache[1], 4, { items: cache }))).toEqual(['d:a', 'd:b', 'd:c']);
    });

    test('radius 0 shows the selected item alone', () => {
        const cache = items(entityType, linkType, thing('d:a', 'A', ['d:b']), thing('d:b', 'B'), relate('d:r', ['d:a'], ['d:b']));

        expect(nodeIds(getMermaidGraph(cache[2], 0, { items: cache }))).toEqual(['d:a']);
        expect(nodeIds(getMermaidGraph(cache[2], 0, { items: cache, expanded: true }))).toEqual(['d:a']);
        // a selected relationship is shown with what it relates from radius 1:
        expect(nodeIds(getMermaidGraph(cache[4], 0, { items: cache, expanded: true }))).toEqual(['d:r']);
        expect(nodeIds(getMermaidGraph(cache[4], 1, { items: cache, expanded: true }))).toEqual(['d:a', 'd:b', 'd:r', 'o:dependsOn']);
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

    test('relationships between the same two entities are drawn as one edge per direction with all titles', () => {
        const cache = items(relationshipType, linkType, plain('d:a', 'A'), { ...plain('d:b', 'B'), hasTargetLink: [{ instanceOf: 'o:refersTo', idRef: 'd:a' }] },
            relate('d:r1', ['d:a'], ['d:b']), relate('d:r2', ['d:a'], ['d:b'], 'blocks'), relate('d:r3', ['d:a'], ['d:b']), relate('d:r4', ['d:b'], ['d:a']));
        const graph = getMermaidGraph(cache[2], 1, { items: cache });

        // ... apart from a link between the two:
        expect(edgeTexts(graph.edges)).toEqual([
            'd:a -relationship:depends on, blocks-> d:b',
            'd:b -link:refers to-> d:a',
            'd:b -relationship:depends on-> d:a'
        ]);
        expect(lines(graph)).toContain('n0 ==>|"depends on, blocks"| n1');
        expect(lines(graph)).toContain('n1 ==>|"depends on"| n0');
        expect(lines(graph)).toContain('n1 -->|"refers to"| n0');
    });

    test('a relationship is drawn from each source to each target, as far as both ends are nodes', () => {
        const cache = items(relationshipType, plain('d:a', 'A'), plain('d:b', 'B'), plain('d:c', 'C'), plain('d:d', 'D'),
            // two sources and two targets:
            relate('d:many', ['d:a', 'd:b'], ['d:c', 'd:d'], 'many'),
            // an end which is not available is shown as such:
            relate('d:open', ['d:a'], ['d:gone'], 'open'),
            relate('d:from', ['d:lost'], ['d:a'], 'from'),
            // not drawn: without a source, without a target, relating a relationship or a type:
            relate('d:r1', [], ['d:a'], 'no source'),
            relate('d:r2', ['d:a'], [], 'no target'),
            relate('d:r3', ['d:a'], ['d:many'], 'to a relationship'),
            relate('d:r4', ['d:many'], ['d:a'], 'from a relationship'),
            relate('d:r5', ['d:a'], ['o:refersTo'], 'to a link class'),
            linkType);
        const graph = getMermaidGraph(cache[1], 1, { items: cache });

        expect(edgeTexts(graph.edges)).toEqual([
            'd:a -relationship:many-> d:c',
            'd:a -relationship:many-> d:d',
            'd:a -relationship:open-> d:gone',
            'd:lost -relationship:from-> d:a'
        ]);
        expect(nodeIds(graph)).toEqual(['d:a', 'd:c', 'd:d', 'd:gone', 'd:lost']);
        for (const id of ['d:gone', 'd:lost']) {
            expect(node(graph, id)).toMatchObject({ resolved: false, category: 'instance', shape: 'rounded', distance: 1 });
        }
        // the other source of 'many' is two steps away:
        expect(edgeTexts(getMermaidGraph(cache[1], 2, { items: cache }).edges)).toEqual([
            'd:a -relationship:many-> d:c',
            'd:a -relationship:many-> d:d',
            'd:a -relationship:open-> d:gone',
            'd:b -relationship:many-> d:c',
            'd:b -relationship:many-> d:d',
            'd:lost -relationship:from-> d:a'
        ]);
        // all of them are shown in an expanded graph, where a relationship may relate relationships:
        const expanded = getMermaidGraph(cache[1], 1, { items: cache, expanded: true });
        expect(nodeIds(expanded)).toEqual(['d:a', 'd:from', 'd:many', 'd:open', 'd:r1', 'd:r2', 'd:r3', 'd:r4', 'd:r5']);
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

    test('the types are at the left by default and the layout direction is configurable', () => {
        const cache = items(entityType, thing('d:a', 'A'));
        expect(MERMAID_DEFAULTS.direction).toBe('RL');
        expect(lines(getMermaidGraph(cache[1], 1, { items: cache }))[0]).toBe('flowchart RL');
        // the instance is the source of the edge to its class and thus at the right:
        expect(lines(getMermaidGraph(cache[1], 1, { items: cache }))).toContain('n0 -.->|"instanceOf"| n1');
        expect(lines(getMermaidGraph(cache[1], 1, { items: cache, direction: 'TB' }))[0]).toBe('flowchart TB');
    });

    test('a limited graph keeps every node connected to the selected item', () => {
        // d:a is related to d:b1 ... d:b6, each by a relationship of its own:
        const others = Array.from({ length: 6 }, (_, i) => thing(`d:b${i + 1}`, `B${i + 1}`));
        const relations = others.map((other, i) => relate(`d:r${i + 1}`, ['d:a'], [other.id]));
        const cache = items(entityType, linkType, thing('d:a', 'A'), ...others, ...relations);

        for (const expanded of [false, true]) {
            // within radius 2 are d:a, its class and the 6 related entities, in an expanded graph
            // the 6 relationships and their class 'o:dependsOn' in addition:
            const within = expanded ? 15 : 8;
            expect(getMermaidGraph(cache[2], 2, { items: cache, expanded }).nodes.length).toBe(within);
            for (let maxNodes = 1; maxNodes < within; maxNodes++) {
                const graph = getMermaidGraph(cache[2], 2, { items: cache, expanded, maxNodes });
                const distanceOf = new Map(graph.nodes.map(n => [n.id, n.distance]));

                expect(graph.nodes.length).toBe(maxNodes);
                expect(graph.omitted).toBe(within - maxNodes);
                expect(graph.nodes[0]).toMatchObject({ id: 'd:a', distance: 0 });
                // every other node has an edge to a node which is nearer to the selected one:
                for (const n of graph.nodes.slice(1)) {
                    const nearer = graph.edges.some(e =>
                        (e.source === n.id && distanceOf.get(e.target) === n.distance - 1)
                        || (e.target === n.id && distanceOf.get(e.source) === n.distance - 1));
                    expect(nearer).toBe(true);
                }
            }
        }
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
        // the same applies to an entity which is not available, but related by several relationships:
        const related = items(plain('d:a', 'A'), plain('d:b', 'B'), relate('d:r1', ['d:a'], ['d:gone']), relate('d:r2', ['d:b'], ['d:gone']));
        expect(nodeIds(getMermaidGraph(related[0], 3, { items: related }))).toEqual(['d:a', 'd:gone']);
    });

    test('a relationship relating a relationship is reached step by step in an expanded graph', () => {
        const cache = items(
            { id: 'd:r1', itemType: PigItemType.aRelationship, hasSourceLink: [{ idRef: 'd:a' }], hasTargetLink: [{ idRef: 'd:r2' }] },
            { id: 'd:r2', itemType: PigItemType.aRelationship, hasSourceLink: [{ idRef: 'd:b' }], hasTargetLink: [{ idRef: 'd:c' }] },
            { id: 'd:a', itemType: PigItemType.anEntity }, { id: 'd:b', itemType: PigItemType.anEntity }, { id: 'd:c', itemType: PigItemType.anEntity }
        );
        const graph = (radius: number, expanded: boolean) => getMermaidGraph(cache[2], radius, { items: cache, expanded });

        // d:a is linked by d:r1 only, whose other end is d:r2 with the ends d:b and d:c:
        expect(distances(graph(1, true))).toEqual(['d:a=0', 'd:r1=1']);
        expect(distances(graph(2, true))).toEqual(['d:a=0', 'd:r1=1', 'd:r2=2']);
        expect(distances(graph(3, true))).toEqual(['d:a=0', 'd:r1=1', 'd:r2=2', 'd:b=3', 'd:c=3']);
        // d:r1 cannot be drawn as edge, since its target is no node; d:a is thus not related to any other entity:
        expect(distances(graph(3, false))).toEqual(['d:a=0']);
        // a relationship without a title and without a class is named by its id:
        expect(edgeTexts(getMermaidGraph(cache[3], 1, { items: cache }).edges)).toEqual(['d:b -relationship:d:r2-> d:c']);
    });

    test('a title without any printable character does not yield an empty label', () => {
        const cache = items(
            { id: 'd:a', itemType: PigItemType.anEntity, title: en('\u0001\u0002'), hasTargetLink: [{ instanceOf: 'o:blank', idRef: 'd:b' }] },
            { id: 'd:b', itemType: PigItemType.anEntity, title: en('   ') },
            { id: 'o:blank', itemType: PigItemType.Link, title: en('\u0007') },
            { id: 'd:r', itemType: PigItemType.aRelationship, title: en('\u0007'), hasSourceLink: [{ idRef: 'd:b' }], hasTargetLink: [{ idRef: 'd:a' }] }
        );
        const text = lines(getMermaidGraph(cache[0], 1, { items: cache }));

        expect(text).toContain('n0("?")');
        // a title of blanks only counts as missing, so that the id is shown:
        expect(text).toContain('n1("d#58;b")');
        expect(text).toContain('n0 -->|"?"| n1');
        expect(text).toContain('n1 ==>|"?"| n0');
    });

    test('node keys are generated and never derived from the ids', () => {
        // 'end' is a reserved word of Mermaid and both ids would collide when cleaned or shortened:
        const cache = items(entityType, linkType, thing('end', 'A', ['d:x y', 'd:x_y']), thing('d:x y', 'B'), thing('d:x_y', 'C'), relate('graph', ['end'], ['d:x y']));
        for (const expanded of [false, true]) {
            const graph = getMermaidGraph(cache[2], 1, { items: cache, expanded });

            expect(graph.nodes.map(n => n.key)).toEqual(graph.nodes.map((_, i) => `n${i}`));
            expect(graph.nodes.length).toBe(expanded ? 5 : 4);
            expect(new Set(graph.nodes.map(n => n.id)).size).toBe(graph.nodes.length);
            for (const line of lines(graph).filter(l => /^n\d+[({]/.test(l))) {
                expect(line).toMatch(/^n\d+(\("[^"]+"\)|\{\{"[^"]+"\}\})$/);
            }
        }
    });

    test('a long title is shortened in the definition, but kept in full for the popup', () => {
        const long = 'This requirement has a title which is far too long to be shown in a node';
        const cache = items(entityType, thing('d:a', long), thing('d:b', '😀'.repeat(50)));

        const graph = getMermaidGraph(cache[1], 1, { items: cache });
        expect(graph.nodes[0].title).toBe(long);
        expect(lines(graph)).toContain('n0("This requirement has a title which is f…")');
        expect(lines(getMermaidGraph(cache[1], 1, { items: cache, maxLabelLength: 12 }))).toContain('n0("This requir…")');
        // counted and cut by characters, so that no emoji is cut in half:
        expect(lines(getMermaidGraph(cache[2], 1, { items: cache, maxLabelLength: 10 }))).toContain(`n0("${'😀'.repeat(9)}…")`);
        // an id used as title keeps its end, which tells it apart from other ids:
        const untitled = items({ id: 'https://example.org/a/very/long/path/to/an/ontology#Thing', itemType: PigItemType.Entity });
        expect(lines(getMermaidGraph(untitled[0], 1, { maxLabelLength: 20 }))).toContain('n0("…o/an/ontology#35;Thing")');
        // the title of a relationship drawn as edge is shortened as well:
        const related = items(plain('d:a', 'A'), plain('d:b', 'B'), relate('d:r', ['d:a'], ['d:b'], long));
        const edges = getMermaidGraph(related[0], 1, { items: related });
        expect(edges.edges[0].title).toBe(long);
        expect(lines(edges)).toContain('n0 ==>|"This requirement has a title which is f…"| n1');
    });

    test('a title cannot break or alter the definition', () => {
        const nasty = 'a "b" <img src=x onerror=alert(1)> & #9829; `c` \\n $$x^2$$ 100% %%{init: {"theme":"dark"}}%% fa:fa-ban\nnext\tline';
        const cache = items(entityType, { ...linkType, title: en(nasty) }, thing('d:a', nasty, ['d:b']), thing('d:b', 'end'), relate('d:r', ['d:b'], ['d:a'], nasty));
        const expected = 'a #quot;b#quot; #lt;img src=x onerror=alert(1)#gt; #amp; #35;9829; #96;c#96; #92;n #36;#36;x^2#36;#36; 100#37; '
            + '#37;#37;{init#58; {#quot;theme#quot;#58;#quot;dark#quot;}}#37;#37; fa#58;fa-ban next line';
        // the only places for free text are the labels, whatever the kind of node or edge:
        const safe = /^(%% [\w :,]+|n\d+(\("[^"<>&`\\$%:]+"\)|\{\{"[^"<>&`\\$%:]+"\}\})|n\d+ (-->|-\.->|==>)\|"[^"<>&`\\$%:]+"\| n\d+|classDef cas\w+ [\w:#,\- ]+|class [n\d,]+ cas\w+|linkStyle [\d,]+ stroke-dasharray:[\d ]+)$/;

        const graph = getMermaidGraph(cache[2], 1, { items: cache, maxLabelLength: 500 });
        expect(graph.nodes[0].title).toBe(nasty.replace(/\s+/g, ' '));
        expect(lines(graph)).toContain(`n0("${expected}")`);
        expect(lines(graph)).toContain(`n0 -->|"${expected}"| ${node(graph, 'd:b').key}`);
        expect(lines(graph)).toContain(`${node(graph, 'd:b').key} ==>|"${expected}"| n0`);
        for (const line of lines(graph).slice(1)) expect(line).toMatch(safe);

        const expanded = getMermaidGraph(cache[2], 1, { items: cache, maxLabelLength: 500, expanded: true });
        expect(lines(expanded)).toContain(`${node(expanded, 'd:r').key}{{"${expected}"}}`);
        for (const line of lines(expanded).slice(1)) expect(line).toMatch(safe);
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
        }, null, { itemType: PigItemType.anEntity }, { id: 'o:T2', itemType: PigItemType.Entity, enumeratedTargetLink: ['o:missingLink', 'o:Thing'] },
        { id: 'd:r', itemType: PigItemType.aRelationship, hasSourceLink: [null, { instanceOf: 'o:refersTo' }], hasTargetLink: [{ idRef: 'd:a' }] },
        { id: 'd:r2', itemType: PigItemType.aRelationship, hasSourceLink: [{ idRef: 'd:a' }] });
        const graph = getMermaidGraph(cache[2], 1, { items: cache });

        expect(nodeIds(graph)).toEqual(['d:a', 'd:gone', 'o:Thing']);
        expect(edgeTexts(graph.edges)).toEqual([
            'd:a -instanceOf:instanceOf-> o:Thing',
            'd:a -link:link-> d:gone',
            'd:a -link:o:unknownLink-> d:a'
        ]);
        expect(graph.nodes[0].properties).toEqual([{ title: 'o:size', value: '5' }]);
        expect(node(graph, 'd:gone')).toMatchObject({ resolved: false, category: 'instance', shape: 'rounded' });
        // the relationships are shown in an expanded graph, as far as they refer to a node:
        expect(nodeIds(getMermaidGraph(cache[2], 1, { items: cache, expanded: true }))).toEqual(['d:a', 'd:gone', 'd:r', 'd:r2', 'o:Thing']);
    });
});
