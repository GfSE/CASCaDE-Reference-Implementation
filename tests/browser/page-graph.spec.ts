// Real-browser test for the Graph page (/graph). Mermaid needs the layout engine of a real browser,
// so what is finally drawn (shapes, colours, line styles, labels) and the interaction with it (popup,
// navigation by click, radius) can only be validated here: against the production build, served
// with the Content-Security-Policy of the app, and with packages imported through the actual import UI.
import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

const dataDir = path.resolve(__dirname, '../../packages/common/data/JSON-LD');
const ALICE = path.join(dataDir, '11/Alice_works_for_ACME.cas.jsonld');
const VEHICLE = path.join(dataDir, '22/Small Autonomous Vehicle.cas.jsonld');

// The colours required for instances, types and (not required, but shown) items which are not available:
const LIGHT_YELLOW = 'rgb(255, 255, 153)';
const LIGHT_ORANGE = 'rgb(255, 205, 153)';
const LIGHT_GREY = 'rgb(245, 245, 245)';

interface RenderedNode {
    name: string;       // the accessible name: title and, if different, the class or metaclass in brackets
    text: string;       // the label as displayed
    shape: string;
    fill: string;
    selected: boolean;
    link: boolean;      // leads to another item when chosen
}
interface RenderedEdge {
    from: string;
    label: string;
    to: string;
    line: 'solid' | 'dashed' | 'dotted';
    arrow: boolean;
}
interface RenderedGraph {
    nodes: RenderedNode[];
    edges: RenderedEdge[];
    clipped: string[];  // the labels which do not fit the space Mermaid has reserved for them
}

async function importPackage(page: Page, file: string) {
    await page.goto('/interfaces');
    await page.getByRole('button', { name: /^CASCaRA JSON-LD/ }).click();
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await page.getByRole('button', { name: 'Import', exact: true }).click();
    // The app navigates to the Document page once the import is persisted successfully
    await page.waitForURL(/\/document$/, { timeout: 30000 });
}

async function openGraphPage(page: Page) {
    await page.getByRole('link', { name: 'Graph' }).click();
    await page.waitForURL(/\/graph$/);
    await expect(page.locator('.graph-canvas svg')).toBeVisible({ timeout: 30000 });
}

const outlineItem = (page: Page, id: string) => page.locator(`[data-outline-id="${id}"]`);
const graphNode = (page: Page, name: string) => page.locator(`.graph-canvas g.node[aria-label="${name}"]`);
const caption = (page: Page) => page.locator('.graph-caption');

// Read what is drawn from the rendered SVG, so that a test states what a user sees
// instead of the graph definition which Mermaid was given:
async function readGraph(page: Page): Promise<RenderedGraph> {
    return page.locator('.graph-canvas svg').evaluate((svg) => {
        const nameByKey = new Map<string, string>();
        const nodes = Array.from(svg.querySelectorAll('g.node')).map((g) => {
            const shape = g.querySelector('circle, polygon, rect, path');
            const points = (shape?.getAttribute('points') ?? '').trim().split(/\s+/).filter(Boolean).length;
            const name = g.getAttribute('aria-label') ?? '';
            nameByKey.set(/-flowchart-(n\d+)-\d+$/.exec(g.id)?.[1] ?? '', name);
            return {
                name,
                text: (g.textContent ?? '').trim(),
                shape: shape?.tagName === 'polygon' ? (points === 6 ? 'hexagon' : `polygon of ${points}`) : (shape?.tagName ?? 'none'),
                fill: shape ? getComputedStyle(shape).fill : '',
                selected: g.classList.contains('casSelected'),
                link: g.getAttribute('role') === 'button'
            };
        });
        const edges = Array.from(svg.querySelectorAll('path.flowchart-link')).map((line) => {
            const [, id, from, to] = /(L_(n\d+)_(n\d+)_\d+)$/.exec(line.id) ?? [];
            const dashes = getComputedStyle(line).strokeDasharray;
            const dash = parseFloat(dashes);
            return {
                from: nameByKey.get(from) ?? '?',
                label: (svg.querySelector(`g.label[data-id="${id}"]`)?.textContent ?? '').trim(),
                to: nameByKey.get(to) ?? '?',
                line: (dashes === 'none' || !(dash > 0) ? 'solid' : (dash <= 2 ? 'dotted' : 'dashed')) as 'solid' | 'dashed' | 'dotted',
                arrow: (line.getAttribute('marker-end') ?? '') !== ''
            };
        });
        // the graph may be scaled to fit the pane; compare in the coordinates of the graph:
        const scale = svg.getBoundingClientRect().width / parseFloat(svg.getAttribute('width') ?? '1');
        const clipped = Array.from(svg.querySelectorAll('foreignObject')).flatMap((box) => {
            const content = box.firstElementChild?.getBoundingClientRect();
            const width = parseFloat(box.getAttribute('width') ?? '0');
            const height = parseFloat(box.getAttribute('height') ?? '0');
            return content && (content.width / scale > width + 1 || content.height / scale > height + 1)
                ? [(box.textContent ?? '').trim()]
                : [];
        });
        return { nodes, edges, clipped };
    });
}

const byName = (a: { name: string }, b: { name: string }) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const edgeText = (edge: RenderedEdge) => `${edge.from} --${edge.label}--> ${edge.to} [${edge.line}${edge.arrow ? ' arrow' : ''}]`;

test.describe('Graph page (Mermaid rendering in a real browser)', () => {
    let problems: string[];

    test.beforeEach(({ page }) => {
        problems = [];
        page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
        page.on('console', (msg) => {
            // a resource refused by the Content-Security-Policy is reported as console error:
            if (msg.type() === 'error' && /Content Security Policy/i.test(msg.text())) problems.push(`console error: ${msg.text()}`);
        });
    });
    test.afterEach(() => {
        expect(problems).toEqual([]);
    });

    test('asks to select an item, as long as no package is loaded', async ({ page }) => {
        await page.goto('/graph');

        await expect(page.locator('.pane-card', { hasText: 'Outline' })).toBeVisible();
        await expect(page.locator('.pane-card', { hasText: 'Graph' })).toContainText('Select an item from the left');
        await expect(page.locator('.graph-canvas svg')).toHaveCount(0);
    });

    test('draws the neighbourhood of the item selected in the outline as required', async ({ page }) => {
        await importPackage(page, ALICE);
        await openGraphPage(page);

        // The outline lists the document of the package and the types which a graph can be shown for:
        await expect(outlineItem(page, 'd:Alice_works_for_ACME')).toHaveText('Alice works for ACME');
        await expect(outlineItem(page, 'folder:cas:Entity')).toHaveText('Entity');
        await expect(outlineItem(page, 'folder:cas:Relationship')).toHaveText('Relationship');

        // Select 'Alice' within the package:
        await outlineItem(page, 'd:Alice_works_for_ACME').click();
        await outlineItem(page, 'd:Alice').click();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 5 nodes, 5 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(5);

        // radius 1: the next neighbours, where the relationship 'works for' is shown with both of its ends
        let graph = await readGraph(page);
        expect(graph.nodes.sort(byName)).toEqual([
            // anEntity as round node in light yellow:
            { name: 'ACME Corp. (Organization)', text: 'ACME Corp.', shape: 'circle', fill: LIGHT_YELLOW, selected: false, link: true },
            { name: 'Alice (Person)', text: 'Alice', shape: 'circle', fill: LIGHT_YELLOW, selected: true, link: false },
            { name: 'Package Root', text: 'Package Root', shape: 'circle', fill: LIGHT_YELLOW, selected: false, link: true },
            // Entity as round node in light orange:
            { name: 'Person (Entity)', text: 'Person', shape: 'circle', fill: LIGHT_ORANGE, selected: false, link: true },
            // aRelationship as hexagonal node in light yellow, named by its class:
            { name: 'works for', text: 'works for', shape: 'hexagon', fill: LIGHT_YELLOW, selected: false, link: true }
        ]);
        expect(graph.edges.map(edgeText).sort()).toEqual([
            // instanceOf as arrow with dashed line:
            'Alice (Person) --instanceOf--> Person (Entity) [dashed arrow]',
            // aLink as arrow with solid line, labelled with the title of its Link class:
            'Package Root --lists--> ACME Corp. (Organization) [solid arrow]',
            'Package Root --lists--> Alice (Person) [solid arrow]',
            'works for --employee--> Alice (Person) [solid arrow]',
            'works for --employer--> ACME Corp. (Organization) [solid arrow]'
        ]);
        expect(graph.clipped).toEqual([]);

        // radius 2: the neighbours of the neighbours as well
        await page.getByRole('button', { name: 'Radius 2' }).click();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 9 nodes, 11 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(9);

        graph = await readGraph(page);
        expect(graph.nodes.sort(byName).slice(3)).toEqual([
            { name: 'Package Root', text: 'Package Root', shape: 'circle', fill: LIGHT_YELLOW, selected: false, link: true },
            { name: 'Package Root (Entity)', text: 'Package Root', shape: 'circle', fill: LIGHT_ORANGE, selected: false, link: true },
            { name: 'Person (Entity)', text: 'Person', shape: 'circle', fill: LIGHT_ORANGE, selected: false, link: true },
            // a class which is referenced, but not part of the package; its label shows the colon of the id:
            { name: 'schema:Person', text: 'schema:Person', shape: 'circle', fill: LIGHT_GREY, selected: false, link: false },
            { name: 'works for', text: 'works for', shape: 'hexagon', fill: LIGHT_YELLOW, selected: false, link: true },
            // Relationship as hexagonal node in light orange:
            { name: 'works for (Relationship)', text: 'works for', shape: 'hexagon', fill: LIGHT_ORANGE, selected: false, link: true }
        ]);
        const edges = graph.edges.map(edgeText);
        // specializes as arrow with dotted line, told apart from the dashed line of instanceOf:
        expect(edges).toContain('Person (Entity) --specializes--> schema:Person [dotted arrow]');
        expect(edges).toContain('works for --instanceOf--> works for (Relationship) [dashed arrow]');
        // Link as arrow with solid line:
        expect(edges).toContain('works for (Relationship) --employee--> Person (Entity) [solid arrow]');
        expect(edges).toContain('works for (Relationship) --employer--> Organization (Entity) [solid arrow]');
        expect(edges.filter(edge => edge.includes('[dashed arrow]')).length).toBe(4);
        expect(graph.clipped).toEqual([]);

        // ... and back to radius 1
        await page.getByRole('button', { name: 'Radius 1' }).click();
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(5);

        // Nothing of Mermaid is left over in the document and the graph carries no script:
        expect(await page.locator('.graph-measure').evaluate(element => element.childElementCount)).toBe(0);
        expect(await page.locator('.graph-canvas').locator('script, a, [onclick], [onerror]').count()).toBe(0);
    });

    test('shows a popup with title, description and properties while hovering a node', async ({ page }) => {
        await importPackage(page, ALICE);
        await openGraphPage(page);
        await outlineItem(page, 'd:Alice_works_for_ACME').click();
        await outlineItem(page, 'd:Alice').click();
        await expect(graphNode(page, 'Alice (Person)')).toBeVisible();
        const popup = page.locator('.graph-popup');
        await expect(popup).toHaveCount(0);

        // an instance with configurable properties:
        await graphNode(page, 'Alice (Person)').hover();
        await expect(popup).toBeVisible();
        await expect(popup.locator('.graph-popup-title')).toHaveText('Alice');
        await expect(popup.locator('.graph-popup-kind')).toHaveText('Person');
        await expect(popup.locator('dt')).toHaveText(['family name', 'given name']);
        await expect(popup.locator('dd')).toHaveText(['Carpenter', 'Alice']);

        // an instance with a description, but without properties:
        await graphNode(page, 'Package Root').hover();
        await expect(popup.locator('.graph-popup-title')).toHaveText('Package Root');
        await expect(popup.locator('.graph-popup-text')).toHaveText('... anchoring all outlines of this graph (package)');
        await expect(popup.locator('dt')).toHaveCount(0);

        // a type with its definition:
        await graphNode(page, 'Person (Entity)').hover();
        await expect(popup.locator('.graph-popup-title')).toHaveText('Person');
        await expect(popup.locator('.graph-popup-kind')).toHaveText('Entity');
        await expect(popup.locator('.graph-popup-text')).toHaveText('A person (alive, dead, undead, or fictional).');

        // the popup disappears with the mouse pointer leaving the node:
        await page.locator('.graph-caption').hover();
        await expect(popup).toHaveCount(0);

        // ... and it is shown for the node which the keyboard focus is moved to as well:
        await page.locator('.graph-canvas g.node').first().focus();
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
        expect(focused).not.toBe('');
        await expect(popup.locator('.graph-popup-title')).toHaveText(focused.replace(/ \(.*\)$/, ''));
        // the popup follows the focus and disappears with it:
        await page.getByRole('button', { name: 'Radius 1' }).focus();
        await expect(popup).toHaveCount(0);
    });

    test('navigates to a node by click or keyboard, where the outline follows', async ({ page }) => {
        await importPackage(page, ALICE);
        await openGraphPage(page);
        await outlineItem(page, 'd:Alice_works_for_ACME').click();
        await outlineItem(page, 'd:Alice').click();
        await expect(caption(page)).toContainText('Alice (Person)');

        // Click the class of Alice: it becomes the selected item, in the graph as well as in the outline
        await graphNode(page, 'Person (Entity)').click();
        await expect(caption(page)).toHaveText(/^Person \(Entity\) . 5 nodes, 4 edges$/);
        await expect(outlineItem(page, 'cas:Person')).toBeFocused();
        await expect(outlineItem(page, 'cas:Person')).toBeVisible();
        let graph = await readGraph(page);
        expect(graph.nodes.filter(node => node.selected).map(node => node.name)).toEqual(['Person (Entity)']);
        expect(graph.edges.map(edgeText)).toContain('Alice (Person) --instanceOf--> Person (Entity) [dashed arrow]');
        expect(graph.edges.map(edgeText)).toContain('works for (Relationship) --employee--> Person (Entity) [solid arrow]');
        // an item which is not available cannot be navigated to:
        expect(graph.nodes.find(node => node.name === 'schema:Person')).toMatchObject({ link: false, fill: LIGHT_GREY });
        await graphNode(page, 'schema:Person').click();
        await expect(caption(page)).toContainText('Person (Entity)');

        // By keyboard: back to Alice with the Enter key
        await graphNode(page, 'Alice (Person)').focus();
        await page.keyboard.press('Enter');
        await expect(caption(page)).toContainText('Alice (Person)');
        await expect(outlineItem(page, 'd:Alice')).toBeFocused();

        // A relationship is not listed in the outline; it is shown with the elements it relates and with
        // its class, which in turn is shown with the classes it relates
        await graphNode(page, 'works for').click();
        await expect(caption(page)).toHaveText(/^works for . 6 nodes, 7 edges$/);
        graph = await readGraph(page);
        expect(graph.nodes.sort(byName).map(node => `${node.name}${node.selected ? ' [selected]' : ''}`)).toEqual([
            'ACME Corp. (Organization)', 'Alice (Person)', 'Organization (Entity)', 'Person (Entity)', 'works for [selected]', 'works for (Relationship)'
        ]);
        // ... and the item which is still selected in the outline leads back when clicked:
        await outlineItem(page, 'd:Alice').click();
        await expect(caption(page)).toContainText('Alice (Person)');
    });

    test('limits a large graph and fits it to the pane', async ({ page }) => {
        test.setTimeout(90000);
        await importPackage(page, VEHICLE);
        await openGraphPage(page);

        // A type with many instances, selected in the folder of its metaclass:
        await outlineItem(page, 'folder:cas:Entity').click();
        await outlineItem(page, 'FMC:Actor').click();
        await expect(caption(page)).toContainText('Actor (Entity)');
        await page.getByRole('button', { name: 'Radius 2' }).click();

        // Not all of the nodes within the radius are shown, which is told to the user:
        await expect(page.locator('.graph-pane .v-alert')).toHaveText(/60 of \d{3} nodes within the radius are shown/, { timeout: 30000 });
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(60);
        const graph = await readGraph(page);
        expect(graph.nodes.filter(node => node.selected).map(node => node.name)).toEqual(['Actor (Entity)']);
        expect(graph.clipped).toEqual([]);

        // The graph is scaled down to the width of the pane ...
        const widths = () => page.locator('.graph-pane').evaluate((pane) => ({
            pane: pane.clientWidth,
            scroll: pane.scrollWidth,
            graph: Math.round(pane.querySelector('.graph-canvas svg')?.getBoundingClientRect().width ?? 0),
            original: Math.round(parseFloat(pane.querySelector('.graph-canvas svg')?.getAttribute('width') ?? '0'))
        }));
        const fitted = await widths();
        expect(fitted.original).toBeGreaterThan(fitted.pane);
        expect(fitted.graph).toBeLessThanOrEqual(fitted.pane);
        expect(fitted.scroll).toBe(fitted.pane);

        // ... or shown in its original size, to be scrolled
        await page.getByRole('button', { name: 'Fit the graph to the pane' }).click();
        const original = await widths();
        expect(original.graph).toBe(original.original);
        expect(original.scroll).toBeGreaterThan(original.pane);
    });
});
