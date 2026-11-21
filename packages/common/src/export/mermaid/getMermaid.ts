/*!
 * CASCaRA Reference Implementation – Mermaid Export Helpers
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaRA Reference Implementation – Mermaid Export Helpers
 * ---------------------------------------------------------
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * This module composes the local graph in the neighbourhood of a selected item
 * as a graph definition in Mermaid text syntax (a 'flowchart', see https://mermaid.js.org).
 *
 * What is shown:
 * - Entity and anEntity as rectangle with rounded corners.
 * - Types in light orange, instances in light yellow.
 *   An aPackage is an instance of the Entity 'cas:Package' and is shown like anEntity.
 * - Link and aLink as directed edge with a solid line, from the element owning the link to its
 *   endpoint; on type level these are the endpoints enumerated by the Link classes which an Entity
 *   or Relationship enumerates as source or target link.
 * - instanceOf as directed edge with a dashed line, specializes as directed edge with a dotted line.
 * - The title of nodes and edges; the types Enumeration, Link and Property are no nodes.
 * - The types at the left and the instances at the right: all edges point to the left, from the
 *   special to the general, which is the order of creation.
 *
 * A reified relationship is shown in one of two modes:
 * - By default, an aRelationship is no node, but a directed edge with a double line (the thick link
 *   of Mermaid) from its source to its target, labelled with its title. The Relationship types are left out.
 * - In an expanded graph (options.expanded), Relationship and aRelationship are hexagonal nodes
 *   with their links as edges, a Relationship in light orange and an aRelationship in light yellow.
 *
 * Usage:
 *   import { getMermaid, getMermaidGraph } from './getMermaid';
 *   const definition = getMermaid(item, 1, { items, lang });       // just the Mermaid text
 *   const graph = getMermaidGraph(item, 2, { items, lang });       // plus the nodes and edges shown
 *   const expanded = getMermaidGraph(item, 2, { items, lang, expanded: true });
 *
 * Design Decisions:
 * - This module only composes text and has no dependency on Mermaid itself; rendering is up to the caller
 *   (see PageGraph.vue). The composition is thus testable without a browser, just as getHTML().
 * - A neighbourhood cannot be derived from the item alone: the items referring to it have to be found
 *   and the titles of the referenced classes have to be resolved. As the metaclasses reference other
 *   items by id (see pig-metaclasses.ts), the caller supplies the items to search in 'options.items',
 *   for example the content of the item cache.
 * - The identifiers of the Mermaid nodes are generated ('n0', 'n1', ...) and never derived from the data:
 *   Mermaid reserves words such as 'end', and cutting or cleaning an item id may let two ids collide.
 *   getMermaidGraph() returns the nodes with their generated key, so that a rendered node can be related
 *   to its item, for example to navigate upon a click or to show details in a popup.
 * - Titles are imported data and thus not trusted. All characters with a meaning for Mermaid are
 *   replaced by Mermaid entity codes (see escapeMermaidText()), so that a title cannot break or alter the
 *   graph definition, however it is displayed unchanged.
 * - The radius counts the edges of the graph as it is shown, from the selected item to a node. In an
 *   expanded graph, a reified relationship is a node like any other and thus a step of its own: the
 *   element at its other end is two steps away, and a relationship at the rim of the neighbourhood
 *   is shown without it. Otherwise (normal mode) the relationship is an edge and its other end one step away.
 * - An aRelationship drawn as edge needs a node at either end. It is drawn from each of its sources
 *   to each of its targets and left out, where an end is a relationship itself.
 * - A reference to an item which is not available (for example the class 'schema:Person' of an ontology
 *   which is not loaded) is shown as a node of its own style, labelled with its id, rather than dropped.
 *   Its neighbourhood is not explored, however: nothing is known about the item, and all items referring
 *   to it would become neighbours of each other. This applies in particular to the metaclasses 'cas:Entity'
 *   and 'cas:Relationship', which most types specialize without being related otherwise.
 * - A link to an enumerated value is not an edge, as an Enumeration is no node; it is listed with the
 *   properties of the element instead.
 * - The number of nodes is limited (options.maxNodes), since a type may have any number of instances and
 *   a neighbourhood of radius 2 easily comprises some hundred nodes. The nodes next to the selected item
 *   take precedence and those of equal distance take turns by the node they are reached from. The number
 *   of omitted nodes is reported.
 */

import { tagIETF, ILanguageText, LIB, MultiLanguageText } from '../../lib/helpers';
import { PigItemType, PigItemTypeValue, TPigId, TPigItem } from '../../schema/pig/ts/pig-metaclasses';

export type stringMermaid = string;  // contains a graph definition in Mermaid text syntax
export type TGraphDirection = 'LR' | 'RL' | 'TB' | 'BT';
export type TGraphNodeCategory = 'type' | 'instance';
export type TGraphNodeShape = 'rounded' | 'hexagon';
// 'relationship' is an aRelationship drawn as edge from its source to its target:
export type TGraphEdgeKind = 'link' | 'relationship' | 'instanceOf' | 'specializes';

export interface IOptionsMermaid {
    // The items to search for neighbours and to resolve references with, e.g. the content of the item cache;
    // without it, only the outgoing references of the item itself can be shown (as unresolved nodes):
    items?: TPigItem[];
    lang?: tagIETF;
    // Whether a reified relationship is shown as node with its links; default is false, where an
    // aRelationship is drawn as edge from its source to its target and the Relationship types are left out:
    expanded?: boolean;
    // Direction of the layout, default is 'RL' (right to left). As all edges point from the special to
    // the general, the types are at the left and the instances at the right:
    direction?: TGraphDirection;
    // Maximum number of nodes, default is 60; the nodes closest to the selected item take precedence:
    maxNodes?: number;
    // Maximum number of characters of a node or edge label, default is 40; longer titles are shortened:
    maxLabelLength?: number;
}

export interface IGraphProperty {
    title: string;
    value: string;
}

export interface IGraphNode {
    key: string;                    // identifier of the node in the Mermaid definition, e.g. 'n0'
    id: TPigId;                     // identifier of the item
    itemType?: PigItemTypeValue;    // undefined, if the item is not available
    category: TGraphNodeCategory;
    shape: TGraphNodeShape;
    resolved: boolean;              // false, if the item is referenced but not available
    distance: number;               // number of edges between the selected item (distance 0) and this one
    title: string;                  // full title in the chosen language, not shortened
    classTitle?: string;            // title of the class of an instance
    description: string;            // plain text; the definition in case of a type without description
    properties: IGraphProperty[];   // the configurable properties (aProperty) of an instance, as plain text
}

export interface IGraphEdge {
    source: TPigId;
    target: TPigId;
    kind: TGraphEdgeKind;
    title: string;
}

export interface IMermaidGraph {
    definition: stringMermaid;
    nodes: IGraphNode[];
    edges: IGraphEdge[];
    radius: number;
    expanded: boolean;              // whether the reified relationships are shown as nodes
    omitted: number;                // number of nodes within the radius which are not shown due to options.maxNodes
}

export const MERMAID_DEFAULTS = {
    expanded: false,
    direction: 'RL' as TGraphDirection,
    maxNodes: 60,
    maxLabelLength: 40
};

// Titles of the edges which have no Link class to take a title from:
export const EDGE_TITLE = {
    instanceOf: 'instanceOf',
    specializes: 'specializes'
};

// The Mermaid classes assigned to the nodes; types are shown in light orange (RGB [255,205,153])
// and instances in light yellow (RGB [255,255,153]):
export const MERMAID_CLASS = {
    type: 'casType',
    instance: 'casInstance',
    unresolved: 'casUnresolved',
    selected: 'casSelected'
};
const CLASS_DEFINITIONS: [string, string][] = [
    [MERMAID_CLASS.type, 'fill:#ffcd99,stroke:#b36b00,color:#000000'],
    [MERMAID_CLASS.instance, 'fill:#ffff99,stroke:#999900,color:#000000'],
    [MERMAID_CLASS.unresolved, 'fill:#f5f5f5,stroke:#9e9e9e,color:#616161,stroke-dasharray:4 3'],
    [MERMAID_CLASS.selected, 'stroke:#1a1a1a,stroke-width:4px']
];
// Mermaid draws a solid, a dotted and a thick line; the latter stands for the double line of a relationship:
const ARROW: Record<TGraphEdgeKind, string> = {
    link: '-->',
    relationship: '==>',
    instanceOf: '-.->',
    specializes: '-.->'
};
// ... so that a dashed and a dotted line are told apart by their dash pattern:
const DASH_PATTERN: Partial<Record<TGraphEdgeKind, string>> = {
    instanceOf: '8 5',
    specializes: '2 4'
};
const MERMAID_ENTITY: Record<string, string> = {
    '#': '#35;',
    '"': '#quot;',
    '<': '#lt;',
    '>': '#gt;',
    '&': '#amp;',
    '`': '#96;',
    '\\': '#92;',
    '$': '#36;',
    '%': '#37;',
    ':': '#58;'
};
const INDENT = '    ';
// The class of a property holding a diagram, i.e. an image with its markup:
const DIAGRAM = 'cas:Diagram';

// The fields of the metaclasses which are read here; an item of any type is accessed through
// this one view, instead of casting it to its concrete class at every use:
interface ILooseLink {
    instanceOf?: TPigId;
    idRef?: TPigId;
}
interface ILooseProperty {
    instanceOf?: TPigId;
    value?: string | ILanguageText[];
}
interface ILooseEnumeratedValue {
    id?: TPigId;
    title?: ILanguageText[];
    value?: string;
}
interface ILooseItem {
    id?: TPigId;
    itemType?: string;
    instanceOf?: TPigId;
    specializes?: TPigId;
    title?: ILanguageText[];
    description?: ILanguageText[];
    definition?: ILanguageText[];
    hasProperty?: ILooseProperty[];
    hasSourceLink?: ILooseLink[];
    hasTargetLink?: ILooseLink[];
    enumeratedSourceLink?: TPigId[];
    enumeratedTargetLink?: TPigId[];
    enumeratedEndpoint?: TPigId[];
    enumeratedValue?: ILooseEnumeratedValue[];
}

interface INodeStyle {
    category: TGraphNodeCategory;
    shape: TGraphNodeShape;
}
// The item types shown as node; all others (Enumeration, Property, Link) are ignored:
const ENTITY_STYLE: Record<string, INodeStyle> = {
    [PigItemType.Entity]: { category: 'type', shape: 'rounded' },
    [PigItemType.anEntity]: { category: 'instance', shape: 'rounded' },
    [PigItemType.aPackage]: { category: 'instance', shape: 'rounded' }
};
// ... plus the reified relationships in an expanded graph:
const EXPANDED_STYLE: Record<string, INodeStyle> = {
    ...ENTITY_STYLE,
    [PigItemType.Relationship]: { category: 'type', shape: 'hexagon' },
    [PigItemType.aRelationship]: { category: 'instance', shape: 'hexagon' }
};

interface IRawEdge {
    source: TPigId;
    target: TPigId;
    kind: TGraphEdgeKind;
    linkClass?: TPigId;         // the class of a link
    relationship?: TPigId;      // the aRelationship drawn as this edge
}
interface IGraphIndex {
    // the item types shown as node with their style:
    styles: Record<string, INodeStyle>;
    byId: Map<TPigId, ILooseItem>;
    enumeratedValues: Map<TPigId, ILooseEnumeratedValue>;
    // the edges by their source, each list in the order of the data:
    outgoing: Map<TPigId, IRawEdge[]>;
    // the same edges by their target, so that the neighbours of a node can be found regardless of
    // the direction of the edge (see findNeighbours() below):
    incoming: Map<TPigId, IRawEdge[]>;
    // the style of the referenced items which are not available, derived from the kind of reference;
    // 'certain' tells whether the reference determines the style or whether it is assumed:
    unresolved: Map<TPigId, { style: INodeStyle, certain: boolean }>;
}

/**
 * Compose the local graph in the neighbourhood of an item as graph definition in Mermaid text syntax.
 * @param item - The selected item: an Entity, anEntity or aPackage; in an expanded graph a Relationship or aRelationship as well
 * @param radius - Number of edges to traverse from the selected item, default is 1 (next neighbours)
 * @param options - The items to search for neighbours, whether the graph is expanded, language and layout options
 * @returns The graph definition; without any node, if there is no graph for the item (e.g. a Property)
 *
 * @example
 * import { getMermaid } from './getMermaid';
 * const definition = getMermaid(item, 1, { items, lang });
 */
export function getMermaid(item: TPigItem, radius = 1, options?: IOptionsMermaid): stringMermaid {
    return getMermaidGraph(item, radius, options).definition;
}

/**
 * Compose the local graph in the neighbourhood of an item, like getMermaid(), but return the nodes
 * and edges shown along with the graph definition. Each node carries the key it has in the graph
 * definition, plus the title, description and properties of its item.
 * @param item - The selected item: an Entity, anEntity or aPackage; in an expanded graph a Relationship or aRelationship as well
 * @param radius - Number of edges to traverse from the selected item, default is 1 (next neighbours)
 * @param options - The items to search for neighbours, whether the graph is expanded, language and layout options
 * @returns The graph definition with its nodes and edges
 */
export function getMermaidGraph(item: TPigItem, radius = 1, options?: IOptionsMermaid): IMermaidGraph {
    const lang = options?.lang || 'en-US';
    const expanded = options?.expanded ?? MERMAID_DEFAULTS.expanded;
    const direction = options?.direction ?? MERMAID_DEFAULTS.direction;
    const maxNodes = Math.max(1, Math.floor(options?.maxNodes ?? MERMAID_DEFAULTS.maxNodes));
    const maxLabelLength = Math.max(8, Math.floor(options?.maxLabelLength ?? MERMAID_DEFAULTS.maxLabelLength));
    const steps = Number.isFinite(radius) ? Math.max(0, Math.floor(radius)) : 1;

    const selected = item as unknown as ILooseItem;
    const graph: IMermaidGraph = { definition: `flowchart ${direction}`, nodes: [], edges: [], radius: steps, expanded, omitted: 0 };
    if (!selected || !selected.id || !EXPANDED_STYLE[selected.itemType ?? '']) {
        graph.definition += `\n${INDENT}%% there is no graph for an item of this type`;
        return graph;
    }
    if (!expanded && !ENTITY_STYLE[selected.itemType ?? '']) {
        graph.definition += `\n${INDENT}%% a relationship is a node in an expanded graph only`;
        return graph;
    }

    // The selected item is listed last and thus takes precedence over a listed item with the same id:
    const listed = (options?.items ?? []) as unknown as ILooseItem[];
    const index = buildIndex([...listed, selected], expanded);

    // 1. The nodes: the selected item and its neighbours up to the given radius, as far as allowed;
    //    they are in the order of their precedence, so that every node shown is connected to the selected item
    const { shown, distances, edges: rawEdges, omitted } = collectNeighbourhood(index, selected.id, steps, maxNodes);
    graph.omitted = omitted;
    const keys = new Map<TPigId, string>();
    for (const id of shown) {
        const key = `n${graph.nodes.length}`;
        keys.set(id, key);
        graph.nodes.push(composeNode(index, id, key, distances.get(id) ?? 0, lang));
    }

    // 2. The edges between the nodes shown; edges of the same kind between the same two nodes in
    //    the same direction are drawn as a single edge listing all titles, for example the links
    //    of different classes or several relationships
    const merged = new Map<string, { edge: IGraphEdge, titles: string[] }>();
    for (const raw of rawEdges) {
        const title = edgeTitle(index, raw, lang);
        const mergeKey = [raw.source, raw.target, raw.kind].join('\u0000');
        const known = merged.get(mergeKey);
        if (!known) {
            merged.set(mergeKey, { edge: { source: raw.source, target: raw.target, kind: raw.kind, title }, titles: [title] });
        } else if (!known.titles.includes(title)) {
            known.titles.push(title);
            known.edge.title = known.titles.join(', ');
        }
    }
    graph.edges = Array.from(merged.values(), entry => entry.edge);

    // 3. The graph definition
    const lines: string[] = [
        `flowchart ${direction}`,
        `${INDENT}%% CASCaRA graph with radius ${steps}${expanded ? ', expanded' : ''}: ${graph.nodes.length} nodes, ${graph.edges.length} edges`
    ];
    if (graph.omitted > 0) {
        lines.push(`${INDENT}%% ${graph.omitted} more nodes within the radius are not shown`);
    }
    for (const node of graph.nodes) {
        // an id used as title is shortened at its beginning, where it differs least from other ids:
        const label = composeLabel(shorten(node.title, maxLabelLength, node.title === node.id ? 'end' : 'start'));
        lines.push(node.shape === 'hexagon'
            ? `${INDENT}${node.key}{{"${label}"}}`
            : `${INDENT}${node.key}("${label}")`);
    }
    const dashed = new Map<string, number[]>();
    graph.edges.forEach((edge, idx) => {
        const label = composeLabel(shorten(edge.title, maxLabelLength));
        lines.push(`${INDENT}${keys.get(edge.source)} ${ARROW[edge.kind]}|"${label}"| ${keys.get(edge.target)}`);
        const pattern = DASH_PATTERN[edge.kind];
        if (pattern) dashed.set(pattern, [...(dashed.get(pattern) ?? []), idx]);
    });
    for (const [name, style] of CLASS_DEFINITIONS) {
        const members = graph.nodes.filter(node => nodeClasses(node).includes(name)).map(node => node.key);
        if (members.length > 0) {
            lines.push(`${INDENT}classDef ${name} ${style}`);
            lines.push(`${INDENT}class ${members.join(',')} ${name}`);
        }
    }
    for (const [pattern, indices] of dashed) {
        lines.push(`${INDENT}linkStyle ${indices.join(',')} stroke-dasharray:${pattern}`);
    }
    graph.definition = lines.join('\n');
    return graph;
}

/**
 * Replace all characters which have a meaning in a Mermaid text label by Mermaid entity codes
 * ('#quot;', '#35;', ...), so that the text is displayed as it is and cannot alter the graph definition.
 * Besides the quote ending a label and the characters of HTML markup, Mermaid interprets:
 * - '#' as the begin of an entity code and '\' as the begin of an escape sequence,
 * - '%%{' as the begin of a directive setting its configuration, wherever it appears in the definition,
 * - '$$' as the begin of a mathematical expression and a backtick as the begin of Markdown,
 * - ':' as part of an icon name ('fa:fa-...') and of a style statement.
 * Control characters (such as line breaks) become a blank, as a label is a single line.
 * @param text - Plain text, e.g. the title of an item
 * @returns The text for use between double quotes in a Mermaid graph definition
 */
export function escapeMermaidText(text: string): string {
    return (text ?? '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ')
        .replace(/ {2,}/g, ' ')
        .trim()
        .replace(/[#"<>&`\\$%:]/g, (ch: string) => MERMAID_ENTITY[ch]);
}

/**
 * Compose the label of a node or an edge. Mermaid does not accept an empty label, so that
 * a text without any printable character is replaced by a question mark.
 */
function composeLabel(text: string): string {
    return escapeMermaidText(text) || '?';
}

/**
 * Index the items for the composition of a graph: the items by id, the enumerated values by id
 * and all edges between the items shown as node.
 * @param items - The items to index
 * @param expanded - Whether the reified relationships are nodes; otherwise an aRelationship is an edge
 */
function buildIndex(items: ILooseItem[], expanded: boolean): IGraphIndex {
    const index: IGraphIndex = {
        styles: expanded ? EXPANDED_STYLE : ENTITY_STYLE,
        byId: new Map(),
        enumeratedValues: new Map(),
        outgoing: new Map(),
        incoming: new Map(),
        unresolved: new Map()
    };
    for (const item of items) {
        if (!item || !item.id) continue;
        index.byId.set(item.id, item);
        if (item.itemType === PigItemType.Enumeration) {
            for (const value of item.enumeratedValue ?? []) {
                if (value?.id) index.enumeratedValues.set(value.id, value);
            }
        }
    }

    // Whether a referenced item is shown as node; 'style' is its style in case it is not available:
    const isNode = (id: TPigId, style: INodeStyle): boolean => {
        const item = index.byId.get(id);
        // the types Enumeration, Link and Property are no nodes:
        if (item) return !!index.styles[item.itemType ?? ''];
        // a link to an enumerated value is listed with the properties, see composeProperties();
        // what is assumed to be a relationship is a node in an expanded graph only:
        return !index.enumeratedValues.has(id) && (expanded || style.shape !== 'hexagon');
    };
    // 'style' is the style of the target in case it is not available and 'certain' tells,
    // whether the kind of reference determines that style:
    const addEdge = (edge: IRawEdge, style: INodeStyle, certain: boolean) => {
        if (!isNode(edge.target, style)) return;
        if (!index.byId.has(edge.target)) {
            const known = index.unresolved.get(edge.target);
            if (!known || (certain && !known.certain)) index.unresolved.set(edge.target, { style, certain });
        }
        const outgoing = index.outgoing.get(edge.source);
        if (outgoing) outgoing.push(edge);
        else index.outgoing.set(edge.source, [edge]);
        const incoming = index.incoming.get(edge.target);
        if (incoming) incoming.push(edge);
        else index.incoming.set(edge.target, [edge]);
    };

    for (const item of index.byId.values()) {
        if (!item.id) continue;
        if (!expanded && item.itemType === PigItemType.aRelationship) {
            // An aRelationship is drawn as edge from each of its sources to each of its targets, as far
            // as these are nodes; an end which is not available is taken for an entity, as is any
            // node of unknown kind (see nodeStyle()):
            const entity: INodeStyle = { category: 'instance', shape: 'rounded' };
            const ends = (links?: ILooseLink[]): TPigId[] =>
                (links ?? []).map(link => link?.idRef).filter((id): id is TPigId => !!id && isNode(id, entity));
            const targets = ends(item.hasTargetLink);
            for (const source of ends(item.hasSourceLink)) {
                for (const target of targets) {
                    addEdge({ source, target, kind: 'relationship', relationship: item.id }, entity, false);
                }
            }
            continue;
        }
        const style = index.styles[item.itemType ?? ''];
        if (!style) continue;
        const source = item.id;
        // The kind of an endpoint which is not available is unknown; it is assumed to be an entity,
        // unless it is the metaclass of all relationships:
        const endpointStyle = (id: TPigId): INodeStyle =>
            ({ category: style.category, shape: id === PigItemType.Relationship ? 'hexagon' : 'rounded' });

        if (item.specializes) {
            // 'specializes' relates items of equal type:
            addEdge({ source, target: item.specializes, kind: 'specializes' }, style, true);
        }
        if (style.category === 'instance') {
            if (item.instanceOf) {
                // the class of an instance is a type of the same shape:
                addEdge({ source, target: item.instanceOf, kind: 'instanceOf' }, { category: 'type', shape: style.shape }, true);
            }
            for (const link of [...(item.hasSourceLink ?? []), ...(item.hasTargetLink ?? [])]) {
                if (!link?.idRef) continue;
                addEdge({ source, target: link.idRef, kind: 'link', linkClass: link.instanceOf }, endpointStyle(link.idRef), false);
            }
        } else {
            // On type level, an Entity or Relationship enumerates the Link classes of its source and target links
            // and each Link class enumerates the classes of its endpoints:
            for (const linkClass of [...(item.enumeratedSourceLink ?? []), ...(item.enumeratedTargetLink ?? [])]) {
                const link = index.byId.get(linkClass);
                if (!link || link.itemType !== PigItemType.Link) continue;
                for (const endpoint of link.enumeratedEndpoint ?? []) {
                    if (endpoint) addEdge({ source, target: endpoint, kind: 'link', linkClass }, endpointStyle(endpoint), false);
                }
            }
        }
    }
    return index;
}

/**
 * The edges of a node, regardless of whether it is their source or their target. An item which
 * is not available is not explored further, so that two items referencing the same unavailable
 * item (e.g. the same class) do not become neighbours of each other:
 */
function findNeighbours(index: IGraphIndex, id: TPigId): IRawEdge[] {
    if (!index.byId.has(id)) return [];
    return [...(index.outgoing.get(id) ?? []), ...(index.incoming.get(id) ?? [])];
}

/**
 * The id at the other end of an edge, as seen from the given node.
 */
function otherEnd(edge: IRawEdge, id: TPigId): TPigId {
    return edge.source === id ? edge.target : edge.source;
}

/**
 * Collect the selected item and its neighbours up to the given radius, along with the edges
 * connecting them:
 * - radius 1: the edges of the selected item (findNeighbours()) give its neighbours.
 * - radius 2 and beyond: the same is done for each node of the previous ring, in the order they
 *   were found; an edge back to a node already collected is left out, since the shortest path to
 *   it was found already.
 * If the number of nodes must be limited (maxNodes), the nodes of each ring beyond the first are
 * trimmed by taking turns from the groups they were found from (the neighbours found from one
 * particular node of the previous ring), so that a small group is not crowded out by a large one.
 */
function collectNeighbourhood(
    index: IGraphIndex, selectedId: TPigId, radius: number, maxNodes: number
): { shown: TPigId[], distances: Map<TPigId, number>, edges: IRawEdge[], omitted: number } {
    const distances = new Map<TPigId, number>([[selectedId, 0]]);
    const order: TPigId[] = [selectedId];
    let ring = [selectedId];

    // explore the full neighbourhood up to the given radius, regardless of maxNodes, so that the
    // nodes nearest to the selected item always take precedence over farther ones:
    for (let step = 1; step <= radius && ring.length > 0; step++) {
        // the neighbours of each node of the previous ring, grouped by the node they were found from:
        const groups: TPigId[][] = [];
        for (const parent of ring) {
            const group: TPigId[] = [];
            for (const edge of findNeighbours(index, parent)) {
                const id = otherEnd(edge, parent);
                // an edge back to a node already collected is already accounted for:
                if (!distances.has(id)) {
                    distances.set(id, step);
                    group.push(id);
                }
            }
            if (group.length > 0) groups.push(group);
        }
        // the nodes of this ring take turns by the node they were found from, so that the nodes of
        // a small group are not crowded out by those of a large one if the number is limited:
        ring = takeTurns(groups, Infinity);
        order.push(...ring);
    }

    const shown = order.slice(0, Math.max(1, maxNodes));
    const shownIds = new Set(shown);
    // all edges between the nodes shown, deduplicated since an edge is found from both its ends:
    const edges = new Set<IRawEdge>();
    for (const id of shown) {
        for (const edge of index.outgoing.get(id) ?? []) {
            if (shownIds.has(edge.target)) edges.add(edge);
        }
    }
    return { shown, distances, edges: Array.from(edges), omitted: order.length - shown.length };
}

/**
 * Pick up to maxCount ids from the groups, one from each group in turn, so that the groups are
 * represented as evenly as possible instead of favouring those found first.
 */
function takeTurns(groups: TPigId[][], maxCount: number): TPigId[] {
    const result: TPigId[] = [];
    for (let round = 0; result.length < maxCount; round++) {
        let addedAny = false;
        for (const group of groups) {
            if (round < group.length && result.length < maxCount) {
                result.push(group[round]);
                addedAny = true;
            }
        }
        if (!addedAny) break;
    }
    return result;
}

function nodeStyle(index: IGraphIndex, id: TPigId): INodeStyle {
    const item = index.byId.get(id);
    return (item && index.styles[item.itemType ?? '']) || index.unresolved.get(id)?.style || { category: 'instance', shape: 'rounded' };
}

function nodeClasses(node: IGraphNode): string[] {
    const classes = [node.resolved ? MERMAID_CLASS[node.category] : MERMAID_CLASS.unresolved];
    if (node.distance === 0) classes.push(MERMAID_CLASS.selected);
    return classes;
}

function composeNode(index: IGraphIndex, id: TPigId, key: string, distance: number, lang: tagIETF): IGraphNode {
    const item = index.byId.get(id);
    const { category, shape } = nodeStyle(index, id);
    if (!item) {
        return { key, id, category, shape, resolved: false, distance, title: id, description: '', properties: [] };
    }
    const isInstance = category === 'instance';
    return {
        key,
        id,
        itemType: item.itemType as PigItemTypeValue,
        category,
        shape,
        resolved: true,
        distance,
        title: titleOfItem(index, item, lang) || id,
        classTitle: isInstance ? classTitleOf(index, item, lang) : undefined,
        description: plainText(textOf(item.description, lang)) || (isInstance ? '' : plainText(textOf(item.definition, lang))),
        properties: isInstance ? composeProperties(index, item, lang) : []
    };
}

/**
 * List the configurable properties of an instance with the title of their class and their value as
 * plain text, followed by the enumerated values the instance is linked to.
 */
function composeProperties(index: IGraphIndex, item: ILooseItem, lang: tagIETF): IGraphProperty[] {
    const properties: IGraphProperty[] = [];
    const titleOfClass = (classId?: TPigId): string =>
        (classId && titleOf(index.byId.get(classId), lang)) || classId || '';

    for (const property of item.hasProperty ?? []) {
        // a diagram is no text to list; as in getHTML() it is not shown with the properties:
        if (!property || property.instanceOf === DIAGRAM) continue;
        const raw = Array.isArray(property.value) ? textOf(property.value, lang) : property.value;
        const value = plainText(raw === undefined || raw === null ? '' : String(raw));
        if (value) properties.push({ title: titleOfClass(property.instanceOf), value });
    }
    for (const link of [...(item.hasSourceLink ?? []), ...(item.hasTargetLink ?? [])]) {
        const enumerated = link?.idRef ? index.enumeratedValues.get(link.idRef) : undefined;
        if (!enumerated) continue;
        const value = plainText(textOf(enumerated.title, lang)) || plainText(enumerated.value) || link.idRef || '';
        properties.push({ title: titleOfClass(link.instanceOf), value });
    }
    return properties;
}

function edgeTitle(index: IGraphIndex, edge: IRawEdge, lang: tagIETF): string {
    if (edge.kind === 'instanceOf' || edge.kind === 'specializes') return EDGE_TITLE[edge.kind];
    if (edge.kind === 'relationship') {
        const relationship = edge.relationship ? index.byId.get(edge.relationship) : undefined;
        return (relationship && titleOfItem(index, relationship, lang)) || edge.relationship || 'relationship';
    }
    return (edge.linkClass && titleOf(index.byId.get(edge.linkClass), lang)) || edge.linkClass || 'link';
}

/**
 * The title of the class of an instance, or the id of the class if it has no title or is not available.
 */
function classTitleOf(index: IGraphIndex, item: ILooseItem, lang: tagIETF): string | undefined {
    return item.instanceOf ? (titleOf(index.byId.get(item.instanceOf), lang) || item.instanceOf) : undefined;
}

/**
 * The title of an item as shown in the graph, or '' if there is none. A reified relationship
 * has usually no title of its own and is named by its class.
 */
function titleOfItem(index: IGraphIndex, item: ILooseItem, lang: tagIETF): string {
    return titleOf(item, lang) || (item.itemType === PigItemType.aRelationship ? classTitleOf(index, item, lang) : undefined) || '';
}

/**
 * The title of an item in the given language on a single line, or '' if it has none.
 * A title is plain text already, since HTML is stripped from it when the item is set.
 */
function titleOf(item: ILooseItem | undefined, lang: tagIETF): string {
    return textOf(item?.title, lang).replace(/\s+/g, ' ').trim();
}

function textOf(texts: ILanguageText[] | undefined, lang: tagIETF): string {
    return Array.isArray(texts) && texts.length > 0 ? (new MultiLanguageText(texts).get(lang) ?? '') : '';
}

/**
 * Reduce a text which may contain XHTML markup (as a description or the value of a property)
 * to plain text on a single line.
 */
function plainText(text: string | undefined): string {
    if (!text || typeof text !== 'string') return '';
    // keep the words of adjacent blocks apart, before the markup is removed:
    const spaced = text.replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/td|\/th|\/dt|\/dd)\b[^>]*>/gi, '$& ');
    const stripped = /[<&]/.test(spaced) ? LIB.stripHTML(spaced) : spaced;
    return stripped.replace(/\s+/g, ' ').trim();
}

/**
 * Shorten a text to a maximum number of characters, marking the omission with an ellipsis.
 * Counts and cuts by Unicode code points, so that no character (e.g. an emoji) is cut in half.
 */
function shorten(text: string, maxLength: number, keep: 'start' | 'end' = 'start'): string {
    const chars = Array.from(text);
    if (chars.length <= maxLength) return text;
    return keep === 'start'
        ? `${chars.slice(0, maxLength - 1).join('').trimEnd()}…`
        : `…${chars.slice(chars.length - maxLength + 1).join('').trimStart()}`;
}
