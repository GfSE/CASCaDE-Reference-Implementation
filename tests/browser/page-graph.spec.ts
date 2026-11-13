// Real-browser test for the Graph page (/graph). Mermaid needs the layout engine of a real browser,
// so what is finally drawn (shapes, colours, line styles, direction, labels) and the interaction with it (popup,
// navigation by click, radius, expanded graph) can only be validated here: against the production build, served
// with the Content-Security-Policy of the app, and with packages imported through the actual import UI.
import { test, expect, Page, Locator } from '@playwright/test';
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
    line: 'solid' | 'dashed' | 'dotted' | 'double';
    arrow: boolean;
    toLeft: boolean;    // the edge ends left of where it begins, at a node which is left of the one it begins at
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
// The switch between a relationship drawn as arrow and the expanded graph with a relationship as node:
const expandedSwitch = (page: Page) => page.getByRole('checkbox', { name: 'Expanded' });
// How a text is set: size, weight and spacing of its font
const typography = (text: Locator) => text.evaluate((element) => {
    const style = getComputedStyle(element);
    return `${style.fontSize} / ${style.fontWeight} / ${style.letterSpacing}`;
});

// Read what is drawn from the rendered SVG, so that a test states what a user sees
// instead of the graph definition which Mermaid was given:
async function readGraph(page: Page): Promise<RenderedGraph> {
    return page.locator('.graph-canvas svg').evaluate((svg) => {
        const nameByKey = new Map<string, string>();
        const centreByKey = new Map<string, number>();
        const nodes = Array.from(svg.querySelectorAll('g.node')).map((g) => {
            const shape = g.querySelector('circle, polygon, rect, path');
            const points = (shape?.getAttribute('points') ?? '').trim().split(/\s+/).filter(Boolean).length;
            const name = g.getAttribute('aria-label') ?? '';
            const key = /-flowchart-(n\d+)-\d+$/.exec(g.id)?.[1] ?? '';
            const box = g.getBoundingClientRect();
            nameByKey.set(key, name);
            centreByKey.set(key, box.left + box.width / 2);
            let kind = shape?.tagName ?? 'none';
            if (kind === 'polygon') kind = points === 6 ? 'hexagon' : `polygon of ${points}`;
            if (kind === 'rect') kind = parseFloat(shape?.getAttribute('rx') ?? '0') > 0 ? 'rounded rectangle' : 'rectangle';
            return {
                name,
                text: (g.textContent ?? '').trim(),
                shape: kind,
                fill: shape ? getComputedStyle(shape).fill : '',
                selected: g.classList.contains('casSelected'),
                link: g.getAttribute('role') === 'button'
            };
        });
        const background = getComputedStyle(svg.closest('.v-card') ?? svg).backgroundColor;
        const edges = Array.from(svg.querySelectorAll<SVGPathElement>('path.flowchart-link')).map((line) => {
            const [, id, from, to] = /(L_(n\d+)_(n\d+)_\d+)$/.exec(line.id) ?? [];
            const style = getComputedStyle(line);
            const dashes = style.strokeDasharray;
            const dash = parseFloat(dashes);
            // A double line is a wide line with a gap along its middle: a line of a third of its width,
            // which follows the same path on top of it in the colour of the background
            const gap = line.nextElementSibling;
            const gapStyle = gap ? getComputedStyle(gap) : undefined;
            const isDouble = !!gap && !!gapStyle
                && gap.tagName === 'path' && !gap.classList.contains('flowchart-link')
                && gap.getAttribute('d') === line.getAttribute('d')
                && gapStyle.stroke === background && gapStyle.fill === 'none'
                && parseFloat(gapStyle.strokeWidth) * 3 === parseFloat(style.strokeWidth);
            const pattern = dashes === 'none' || !(dash > 0) ? 'solid' : (dash <= 2 ? 'dotted' : 'dashed');
            const length = line.getTotalLength();
            return {
                from: nameByKey.get(from) ?? '?',
                label: (svg.querySelector(`g.label[data-id="${id}"]`)?.textContent ?? '').trim(),
                to: nameByKey.get(to) ?? '?',
                line: (pattern === 'solid' && isDouble ? 'double' : pattern) as 'solid' | 'dashed' | 'dotted' | 'double',
                arrow: (line.getAttribute('marker-end') ?? '') !== '',
                toLeft: line.getPointAtLength(length).x < line.getPointAtLength(0).x
                    && (centreByKey.get(to) ?? 0) < (centreByKey.get(from) ?? 0)
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
// The edges which are not drawn with the line of their kind: dashed to the class, dotted to the specialized
// type (the graph labels these edges as such) and solid or double for all others, the links and relationships
const misdrawn = (graph: RenderedGraph) => graph.edges
    .filter(edge => !(edge.label === 'instanceOf' ? ['dashed'] : edge.label === 'specializes' ? ['dotted'] : ['solid', 'double']).includes(edge.line))
    .map(edgeText);

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
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 4 nodes, 4 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(4);
        await expect(expandedSwitch(page)).not.toBeChecked();
        // The labels of the two controls beside each other are set alike:
        expect(await typography(page.locator('.graph-expanded').getByText('Expanded', { exact: true })))
            .toBe(await typography(page.locator('#graph-radius-label')));

        // radius 1: the next neighbours, where the relationship 'works for' is an arrow to the entity it relates to
        let graph = await readGraph(page);
        expect(graph.nodes.sort(byName)).toEqual([
            // anEntity as rectangle with rounded corners in light yellow:
            { name: 'ACME Corp. (Organization)', text: 'ACME Corp.', shape: 'rounded rectangle', fill: LIGHT_YELLOW, selected: false, link: true },
            { name: 'Alice (Person)', text: 'Alice', shape: 'rounded rectangle', fill: LIGHT_YELLOW, selected: true, link: false },
            { name: 'Package Root', text: 'Package Root', shape: 'rounded rectangle', fill: LIGHT_YELLOW, selected: false, link: true },
            // Entity as rectangle with rounded corners in light orange:
            { name: 'Person (Entity)', text: 'Person', shape: 'rounded rectangle', fill: LIGHT_ORANGE, selected: false, link: true }
        ]);
        expect(graph.edges.map(edgeText).sort()).toEqual([
            // instanceOf as arrow with dashed line:
            'Alice (Person) --instanceOf--> Person (Entity) [dashed arrow]',
            // aRelationship as arrow with double line from its source to its target, labelled with its title:
            'Alice (Person) --works for--> ACME Corp. (Organization) [double arrow]',
            // aLink as arrow with solid line, labelled with the title of its Link class:
            'Package Root --lists--> ACME Corp. (Organization) [solid arrow]',
            'Package Root --lists--> Alice (Person) [solid arrow]'
        ]);
        // the types are at the left of their instances, so that all arrows point to the left:
        expect(graph.edges.filter(edge => !edge.toLeft).map(edgeText)).toEqual([]);
        expect(graph.clipped).toEqual([]);
        // the gap of the double line carries no arrow head of its own and ends where the arrow head begins:
        const gap = await page.locator('.graph-canvas path.graph-link-gap').evaluate((path) => ({
            marker: path.getAttribute('marker-end'),
            short: (path.previousElementSibling as SVGPathElement).getTotalLength() - parseFloat(getComputedStyle(path).strokeDasharray)
        }));
        expect(gap.marker).toBeNull();
        expect(gap.short).toBeCloseTo(4, 1);

        // radius 2: the neighbours of the neighbours as well
        await page.getByRole('button', { name: 'Radius 2' }).click();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 7 nodes, 7 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(7);

        graph = await readGraph(page);
        expect(graph.nodes.sort(byName).slice(2)).toEqual([
            { name: 'Organization (Entity)', text: 'Organization', shape: 'rounded rectangle', fill: LIGHT_ORANGE, selected: false, link: true },
            { name: 'Package Root', text: 'Package Root', shape: 'rounded rectangle', fill: LIGHT_YELLOW, selected: false, link: true },
            { name: 'Package Root (Entity)', text: 'Package Root', shape: 'rounded rectangle', fill: LIGHT_ORANGE, selected: false, link: true },
            { name: 'Person (Entity)', text: 'Person', shape: 'rounded rectangle', fill: LIGHT_ORANGE, selected: false, link: true },
            // a class which is referenced, but not part of the package; its label shows the colon of the id:
            { name: 'schema:Person', text: 'schema:Person', shape: 'rounded rectangle', fill: LIGHT_GREY, selected: false, link: false }
        ]);
        let edges = graph.edges.map(edgeText);
        // specializes as arrow with dotted line, told apart from the dashed line of instanceOf:
        expect(edges).toContain('Person (Entity) --specializes--> schema:Person [dotted arrow]');
        expect(edges).toContain('ACME Corp. (Organization) --instanceOf--> Organization (Entity) [dashed arrow]');
        expect(edges.filter(edge => edge.includes('[dashed arrow]')).length).toBe(3);
        expect(edges.filter(edge => edge.includes('[double arrow]'))).toEqual(['Alice (Person) --works for--> ACME Corp. (Organization) [double arrow]']);
        expect(graph.edges.filter(edge => !edge.toLeft).map(edgeText)).toEqual([]);
        expect(graph.clipped).toEqual([]);

        // expanded: the relationships are nodes with their links, each of which counts as a step of the radius;
        // the class of ACME Corp. is thus three steps away and no more shown
        await expandedSwitch(page).check();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 8 nodes, 9 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(8);

        graph = await readGraph(page);
        expect(graph.nodes.sort(byName).map(node => node.name)).toEqual([
            'ACME Corp. (Organization)', 'Alice (Person)', 'Package Root', 'Package Root (Entity)', 'Person (Entity)', 'schema:Person', 'works for', 'works for (Relationship)'
        ]);
        // aRelationship as hexagonal node in light yellow, named by its class:
        expect(graph.nodes.find(node => node.name === 'works for'))
            .toEqual({ name: 'works for', text: 'works for', shape: 'hexagon', fill: LIGHT_YELLOW, selected: false, link: true });
        // Relationship as hexagonal node in light orange:
        expect(graph.nodes.find(node => node.name === 'works for (Relationship)'))
            .toEqual({ name: 'works for (Relationship)', text: 'works for', shape: 'hexagon', fill: LIGHT_ORANGE, selected: false, link: true });
        edges = graph.edges.map(edgeText);
        expect(edges).toContain('works for --instanceOf--> works for (Relationship) [dashed arrow]');
        // aLink and Link as arrow with solid line:
        expect(edges).toContain('works for --employee--> Alice (Person) [solid arrow]');
        expect(edges).toContain('works for --employer--> ACME Corp. (Organization) [solid arrow]');
        expect(edges).toContain('works for (Relationship) --employee--> Person (Entity) [solid arrow]');
        // no relationship is drawn as arrow:
        expect(edges.filter(edge => edge.includes('[double arrow]'))).toEqual([]);
        await expect(page.locator('.graph-canvas path.graph-link-gap')).toHaveCount(0);
        expect(graph.edges.filter(edge => !edge.toLeft).map(edgeText)).toEqual([]);
        expect(graph.clipped).toEqual([]);

        // ... and with radius 1, the relationship is shown without the entity at its other end
        await page.getByRole('button', { name: 'Radius 1' }).click();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 4 nodes, 3 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(4);
        graph = await readGraph(page);
        expect(graph.nodes.sort(byName).map(node => node.name)).toEqual(['Alice (Person)', 'Package Root', 'Person (Entity)', 'works for']);
        expect(graph.edges.map(edgeText).sort()).toEqual([
            'Alice (Person) --instanceOf--> Person (Entity) [dashed arrow]',
            'Package Root --lists--> Alice (Person) [solid arrow]',
            'works for --employee--> Alice (Person) [solid arrow]'
        ]);

        // ... and back to the relationship as arrow
        await expandedSwitch(page).uncheck();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 4 nodes, 4 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(4);
        await expect(page.locator('.graph-canvas path.graph-link-gap')).toHaveCount(1);

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
        await expect(caption(page)).toHaveText(/^Person \(Entity\) . 3 nodes, 2 edges$/);
        await expect(outlineItem(page, 'cas:Person')).toBeFocused();
        await expect(outlineItem(page, 'cas:Person')).toBeVisible();
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(3);
        let graph = await readGraph(page);
        expect(graph.nodes.filter(node => node.selected).map(node => node.name)).toEqual(['Person (Entity)']);
        expect(graph.edges.map(edgeText).sort()).toEqual([
            'Alice (Person) --instanceOf--> Person (Entity) [dashed arrow]',
            'Person (Entity) --specializes--> schema:Person [dotted arrow]'
        ]);
        // an item which is not available cannot be navigated to:
        expect(graph.nodes.find(node => node.name === 'schema:Person')).toMatchObject({ link: false, fill: LIGHT_GREY });
        await graphNode(page, 'schema:Person').click();
        await expect(caption(page)).toContainText('Person (Entity)');

        // By keyboard: back to Alice with the Enter key
        await graphNode(page, 'Alice (Person)').focus();
        await page.keyboard.press('Enter');
        await expect(caption(page)).toContainText('Alice (Person)');
        await expect(outlineItem(page, 'd:Alice')).toBeFocused();

        // A relationship is a node of the expanded graph only and not listed in the outline; when selected,
        // it is shown with the elements it relates and with its class
        await expect(graphNode(page, 'works for')).toHaveCount(0);
        await expandedSwitch(page).check();
        await graphNode(page, 'works for').click();
        await expect(caption(page)).toHaveText(/^works for . 4 nodes, 3 edges$/);
        await expect(page.locator('.graph-canvas g.node.casSelected[aria-label="works for"]')).toHaveCount(1);
        graph = await readGraph(page);
        expect(graph.nodes.sort(byName).map(node => `${node.name}${node.selected ? ' [selected]' : ''}`)).toEqual([
            'ACME Corp. (Organization)', 'Alice (Person)', 'works for [selected]', 'works for (Relationship)'
        ]);
        expect(graph.edges.map(edgeText).sort()).toEqual([
            'works for --employee--> Alice (Person) [solid arrow]',
            'works for --employer--> ACME Corp. (Organization) [solid arrow]',
            'works for --instanceOf--> works for (Relationship) [dashed arrow]'
        ]);
        // There is no graph for it, once the switch is turned off, which is told to the user:
        await expandedSwitch(page).uncheck();
        await expect(page.locator('.graph-hint')).toHaveText('A relationship is shown as a node in the expanded graph only. Switch on "Expanded" to see it.');
        await expect(page.locator('.graph-canvas svg')).toHaveCount(0);
        // ... and the item which is still selected in the outline leads back when clicked:
        await outlineItem(page, 'd:Alice').click();
        await expect(caption(page)).toHaveText(/^Alice \(Person\) . 4 nodes, 4 edges$/);

        // The same applies to a Relationship selected in the outline:
        await outlineItem(page, 'folder:cas:Relationship').click();
        await outlineItem(page, 'cas:WorksFor').click();
        await expect(page.locator('.graph-hint')).toContainText('Switch on "Expanded" to see it.');
        await expandedSwitch(page).check();
        await expect(caption(page)).toHaveText(/^works for \(Relationship\) . 5 nodes, 4 edges$/);
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(5);
        graph = await readGraph(page);
        expect(graph.edges.map(edgeText).sort()).toEqual([
            'works for (Relationship) --employee--> Person (Entity) [solid arrow]',
            'works for (Relationship) --employer--> Organization (Entity) [solid arrow]',
            'works for (Relationship) --specializes--> schema:WorksFor [dotted arrow]',
            'works for --instanceOf--> works for (Relationship) [dashed arrow]'
        ]);
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
        const notice = page.locator('.graph-pane .v-alert');
        await expect(notice).toHaveText(/60 of \d+ nodes within the radius are shown/, { timeout: 30000 });
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(60);
        const within = async () => Number(/60 of (\d+) nodes/.exec(await notice.innerText())?.[1]);
        const withinRadius = await within();
        expect(withinRadius).toBeGreaterThan(60);
        let graph = await readGraph(page);
        expect(graph.nodes.filter(node => node.selected).map(node => node.name)).toEqual(['Actor (Entity)']);
        // the many relationships between the instances are arrows with double line:
        expect(graph.nodes.filter(node => node.shape !== 'rounded rectangle')).toEqual([]);
        expect(graph.edges.filter(edge => edge.line === 'double').length).toBeGreaterThan(10);
        // ... and each of the many edges to a class or to a specialized type keeps its dashed or dotted line:
        expect(graph.edges.filter(edge => edge.label === 'instanceOf').length).toBeGreaterThan(10);
        expect(graph.edges.filter(edge => edge.label === 'specializes').length).toBeGreaterThan(0);
        expect(misdrawn(graph)).toEqual([]);
        expect(graph.clipped).toEqual([]);

        // In the expanded graph, the relationships are nodes of their own and count as steps, so that
        // more nodes are within the same radius; the limit applies all the same:
        await expandedSwitch(page).check();
        await expect(page.locator('.graph-canvas g.node polygon').first()).toBeVisible({ timeout: 30000 });
        await expect(page.locator('.graph-canvas g.node')).toHaveCount(60);
        expect(await within()).toBeGreaterThan(withinRadius);
        graph = await readGraph(page);
        expect(graph.nodes.filter(node => node.selected).map(node => node.name)).toEqual(['Actor (Entity)']);
        expect(graph.nodes.filter(node => node.shape === 'hexagon').length).toBeGreaterThan(0);
        expect(graph.edges.filter(edge => edge.line === 'double')).toEqual([]);
        expect(misdrawn(graph)).toEqual([]);
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
