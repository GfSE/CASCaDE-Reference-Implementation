/*!
 * Rendering of Mermaid graph definitions in the browser
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * All Mermaid rendering of the app goes through renderMermaid(), so that
 * - Mermaid is loaded on demand: it is a large library and only needed by the graph page,
 * - Mermaid is configured in one place and before its first use,
 * - a failure (library not loaded, definition not accepted) is returned as a message and never thrown,
 *   so that the calling page keeps working and can tell the user what happened.
 *
 * Design Decisions:
 * - securityLevel 'strict': Mermaid encodes HTML in labels and ignores 'click' statements of a definition.
 *   Clicks and hovering are handled by the page itself with listeners on the rendered nodes (see
 *   PageGraph.vue), which needs no script to be carried by the definition.
 * - look 'classic': the dash patterns telling 'instanceOf' from 'specializes' are set by 'linkStyle'
 *   statements (see getMermaid.ts). The look 'neo', which is the default of Mermaid 12, draws edges
 *   with a dash pattern of its own and thus does not show them reliably.
 * - htmlLabels true: labels carry Mermaid entity codes (e.g. '#58;' for a colon, see escapeMermaidText()),
 *   which are shown as the characters they stand for in HTML labels only.
 * - layout 'elk': routes the edges around the nodes at right angles, which keeps a node with many
 *   edges readable. It is the default of Mermaid 12 and set here, like the look, so that the graphs
 *   do not change their appearance unnoticed when Mermaid is updated.
 * - suppressErrorRendering: otherwise Mermaid adds a 'Syntax error' graphic of its own to the document.
 * - Mermaid sizes a node by measuring its label in a temporary element, by default at the end of the
 *   document. Where the graph is shown, other inherited styles may apply (Vuetify for example sets a
 *   letter-spacing for the text of a card), so that a label gets wider than measured and is cut off.
 *   Therefore the caller passes an element next to the place where the graph is shown, to measure in.
 */

import type { MermaidConfig } from 'mermaid';

// The part of Mermaid which is used here; allows to test the rendering logic without Mermaid:
export interface IMermaidLike {
    initialize(config: MermaidConfig): void;
    render(id: string, text: string, container?: Element): Promise<{ svg: string }>;
}

export interface IMermaidRendering {
    svg?: string;       // the rendered graph, if successful
    error?: string;     // the reason, if not
}

export const MERMAID_CONFIG: MermaidConfig = {
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    look: 'classic',
    layout: 'elk',
    theme: 'neutral',
    htmlLabels: true,
    // as defined for the app in main.css:
    fontFamily: "'Roboto', Arial, sans-serif",
    flowchart: {
        // the graph is rendered in its natural size and scaled by the page:
        useMaxWidth: false,
        nodeSpacing: 30,
        rankSpacing: 60
    },
    themeCSS: '.flowchart-link { stroke-width: 1.5px; } .edgeLabel { font-size: 12px; }'
};

let mermaidLoading: Promise<IMermaidLike> | undefined;
let renderCount = 0;

/**
 * Load and configure Mermaid upon first use; later calls return the same instance.
 * A failed attempt is not kept, so that the next call tries again.
 */
export function loadMermaid(): Promise<IMermaidLike> {
    if (!mermaidLoading) {
        mermaidLoading = import('mermaid')
            .then(module => {
                const mermaid = module.default as IMermaidLike;
                mermaid.initialize(MERMAID_CONFIG);
                return mermaid;
            })
            .catch(error => {
                mermaidLoading = undefined;
                throw error;
            });
    }
    return mermaidLoading;
}

/**
 * Render a graph definition in Mermaid text syntax as SVG.
 * @param definition - The graph definition, e.g. as composed by getMermaid()
 * @param container - An element with the styles of the place where the graph is shown, for Mermaid to
 *   measure the labels in; it must be part of the layout (thus not 'display: none') and its content is replaced
 * @param load - Supplies Mermaid; to be replaced in tests only
 * @returns The SVG markup or the reason why there is none; never throws
 */
export async function renderMermaid(definition: string, container?: Element, load: () => Promise<IMermaidLike> = loadMermaid): Promise<IMermaidRendering> {
    if (!definition || !definition.trim()) {
        return { error: 'The graph definition is empty.' };
    }
    let mermaid: IMermaidLike;
    try {
        mermaid = await load();
    } catch (error) {
        return { error: `Mermaid could not be loaded: ${messageOf(error)}` };
    }
    try {
        // Mermaid takes the id for the SVG element, so that it must be unique in the document:
        const { svg } = await mermaid.render(`cascara-graph-${++renderCount}`, definition, container);
        if (typeof svg !== 'string' || !svg.includes('<svg')) {
            return { error: 'Mermaid did not return a graphic.' };
        }
        return { svg };
    } catch (error) {
        return { error: `Mermaid could not render the graph: ${messageOf(error)}` };
    }
}

/**
 * Get the key of the graph node (e.g. 'n3') which an element of a rendered graph belongs to.
 * Mermaid names the element of a node '<id of the SVG>-flowchart-<key of the node>-<number>'.
 * @param element - An element within the rendered graph, e.g. the target of a mouse event
 * @returns The key as used in the graph definition, or undefined if the element is not part of a node
 */
export function graphNodeKey(element: Element | null | undefined): string | undefined {
    const node = element?.closest?.('g.node');
    return node ? /(?:^|-)flowchart-(n\d+)-\d+$/.exec(node.id)?.[1] : undefined;
}

function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
