/*!
 * JEST Test Suite for the rendering of Mermaid graph definitions - renderMermaid(), loadMermaid() and graphNodeKey()
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Mermaid needs the layout engine of a real browser, which jsdom does not have. It is thus replaced
 * here to test what happens around it; rendering real graphs with the real Mermaid is covered by the
 * Playwright suite tests/browser/page-graph.spec.ts.
 */

import { renderMermaid, graphNodeKey, MERMAID_CONFIG, IMermaidLike } from '../src/lib/mermaid-render';

const definition = 'flowchart LR\n    n0(("Alice"))';
const svgOf = (id: string) => `<svg id="${id}"><g class="node" id="${id}-flowchart-n0-0"></g></svg>`;

function fakeMermaid(render?: IMermaidLike['render']): { mermaid: IMermaidLike, ids: string[] } {
    const ids: string[] = [];
    const mermaid: IMermaidLike = {
        initialize: jest.fn(),
        render: jest.fn(async (id: string, text: string, container?: Element) => {
            ids.push(id);
            return render ? render(id, text, container) : { svg: svgOf(id) };
        })
    };
    return { mermaid, ids };
}

describe('renderMermaid()', () => {
    test('returns the graphic rendered by Mermaid', async () => {
        const { mermaid, ids } = fakeMermaid();
        const rendering = await renderMermaid(definition, undefined, async () => mermaid);

        expect(rendering).toEqual({ svg: svgOf(ids[0]) });
        expect(mermaid.render).toHaveBeenCalledWith(ids[0], definition, undefined);
    });

    test('names every graphic differently, as its id must be unique in the document', async () => {
        const { mermaid, ids } = fakeMermaid();
        for (let i = 0; i < 5; i++) await renderMermaid(definition, undefined, async () => mermaid);

        expect(new Set(ids).size).toBe(5);
        for (const id of ids) expect(id).toMatch(/^cascara-graph-\d+$/);
    });

    test('hands the element to measure the labels in on to Mermaid', async () => {
        const { mermaid, ids } = fakeMermaid();
        const container = document.createElement('div');
        await renderMermaid(definition, container, async () => mermaid);

        expect(mermaid.render).toHaveBeenCalledWith(ids[0], definition, container);
    });

    test('reports a definition which Mermaid does not accept, instead of throwing', async () => {
        const { mermaid } = fakeMermaid(async () => { throw new Error('Parse error on line 2'); });
        const rendering = await renderMermaid('flowchart LR\n    n0((', undefined, async () => mermaid);

        expect(rendering.svg).toBeUndefined();
        expect(rendering.error).toBe('Mermaid could not render the graph: Parse error on line 2');
    });

    test('reports a failure which is not an Error object as well', async () => {
        const { mermaid } = fakeMermaid(() => Promise.reject('no layout'));
        const rendering = await renderMermaid(definition, undefined, async () => mermaid);

        expect(rendering).toEqual({ error: 'Mermaid could not render the graph: no layout' });
    });

    test('reports when Mermaid cannot be loaded', async () => {
        const rendering = await renderMermaid(definition, undefined, () => Promise.reject(new Error('Failed to fetch dynamically imported module')));

        expect(rendering).toEqual({ error: 'Mermaid could not be loaded: Failed to fetch dynamically imported module' });
    });

    test('reports a result of Mermaid which is no graphic', async () => {
        const { mermaid } = fakeMermaid(async () => ({ svg: '' }));
        const rendering = await renderMermaid(definition, undefined, async () => mermaid);

        expect(rendering).toEqual({ error: 'Mermaid did not return a graphic.' });
    });

    test('does not load Mermaid for an empty definition', async () => {
        const load = jest.fn();
        for (const empty of ['', '  \n ', undefined as unknown as string]) {
            expect(await renderMermaid(empty, undefined, load)).toEqual({ error: 'The graph definition is empty.' });
        }
        expect(load).not.toHaveBeenCalled();
    });
});

describe('loadMermaid()', () => {
    afterEach(() => {
        jest.resetModules();
        jest.dontMock('mermaid');
    });

    test('loads Mermaid once and configures it before its first use', async () => {
        const { mermaid } = fakeMermaid();
        jest.doMock('mermaid', () => ({ __esModule: true, default: mermaid }), { virtual: true });
        const { loadMermaid, MERMAID_CONFIG: config } = await import('../src/lib/mermaid-render');

        const [first, second] = await Promise.all([loadMermaid(), loadMermaid()]);
        expect(first).toBe(mermaid);
        expect(second).toBe(mermaid);
        expect(await loadMermaid()).toBe(mermaid);
        expect(mermaid.initialize).toHaveBeenCalledTimes(1);
        expect(mermaid.initialize).toHaveBeenCalledWith(config);
    });

    test('tries again after Mermaid could not be loaded', async () => {
        jest.doMock('mermaid', () => { throw new Error('chunk not available'); }, { virtual: true });
        const { loadMermaid, renderMermaid: render } = await import('../src/lib/mermaid-render');

        await expect(loadMermaid()).rejects.toThrow('chunk not available');
        expect(await render(definition)).toEqual({ error: 'Mermaid could not be loaded: chunk not available' });

        // ... and now it is available:
        const { mermaid, ids } = fakeMermaid();
        jest.doMock('mermaid', () => ({ __esModule: true, default: mermaid }), { virtual: true });
        expect(await render(definition)).toEqual({ svg: svgOf(ids[0]) });
        expect(mermaid.initialize).toHaveBeenCalledTimes(1);
    });
});

describe('MERMAID_CONFIG', () => {
    test('lets Mermaid neither run anything carried by a definition nor render on its own', () => {
        // 'loose' would allow a definition to bind functions to clicks, 'antiscript' to carry HTML:
        expect(MERMAID_CONFIG.securityLevel).toBe('strict');
        expect(MERMAID_CONFIG.startOnLoad).toBe(false);
        expect(MERMAID_CONFIG.suppressErrorRendering).toBe(true);
    });
});

describe('graphNodeKey()', () => {
    // The structure Mermaid renders for a node with a HTML label, within a graph with edge labels:
    function renderedGraph(nodeId: string): HTMLElement {
        const host = document.createElement('div');
        host.innerHTML = `<svg id="cascara-graph-7"><g class="root">`
            + `<g class="edgeLabels"><g class="edgeLabel"><g class="label"><foreignObject><div><span class="edgeLabel"><p>employee</p></span></div></foreignObject></g></g></g>`
            + `<g class="nodes"><g class="node default casInstance" id="${nodeId}"><circle class="basic label-container"></circle>`
            + `<g class="label"><foreignObject><div><span class="nodeLabel"><p>Alice</p></span></div></foreignObject></g></g></g>`
            + `</g></svg>`;
        return host;
    }

    test('finds the key of the node which an element belongs to', () => {
        const host = renderedGraph('cascara-graph-7-flowchart-n12-25');

        expect(graphNodeKey(host.querySelector('g.node'))).toBe('n12');
        expect(graphNodeKey(host.querySelector('circle'))).toBe('n12');
        expect(graphNodeKey(host.querySelector('.nodeLabel p'))).toBe('n12');
    });

    test('accepts the element names of Mermaid versions which do not prefix the id of the graphic', () => {
        expect(graphNodeKey(renderedGraph('flowchart-n0-0').querySelector('.nodeLabel'))).toBe('n0');
    });

    test('returns undefined for an element which is not part of a node', () => {
        const host = renderedGraph('cascara-graph-7-flowchart-n1-3');

        expect(graphNodeKey(host.querySelector('.edgeLabel p'))).toBeUndefined();
        expect(graphNodeKey(host.querySelector('svg'))).toBeUndefined();
        expect(graphNodeKey(host)).toBeUndefined();
        expect(graphNodeKey(null)).toBeUndefined();
        expect(graphNodeKey(undefined)).toBeUndefined();
        // the target of an event may be something else than an element, for example the document:
        expect(graphNodeKey(document as unknown as Element)).toBeUndefined();
    });

    test('returns undefined for a node which was not named by getMermaid()', () => {
        for (const id of ['cascara-graph-7-flowchart-end-0', 'cascara-graph-7-flowchart-n1', 'n1', 'cascara-graph-7-subgraph-n1-0', '']) {
            expect(graphNodeKey(renderedGraph(id).querySelector('circle'))).toBeUndefined();
        }
    });
});
