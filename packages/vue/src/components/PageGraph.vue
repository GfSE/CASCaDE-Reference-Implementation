<!--
    PageGraph shows the local graph in the neighbourhood of a selected item as an Outline pane (left)
    plus a Graph pane (right), following the same layout as PageDocument.vue.

    - The Outline lists the items a graph can be shown for: per package the document outline of its
      anEntity instances (as on the Document page), followed by a folder for the Entity and one for
      the Relationship types (as on the Ontology page).
    - The Graph pane shows the selected item with its neighbours up to the chosen radius (1 or 2),
      composed by getMermaid() and rendered by Mermaid: the types at the left, the instances at the right.
    - A reified relationship is drawn as an arrow with a double line from its source to its target.
      With 'Expanded' switched on, it is shown as a node with its links instead, and so are the
      Relationship types; a relationship can then be selected as well.
    - Hovering (or focusing) a node shows a popup with its title, description and properties.
    - Clicking a node (or pressing Enter while it has the focus) makes it the selected item.
      The Outline follows, if it lists the item; an aRelationship for example is not listed there
      and is thus reached by its node in the expanded graph only.

    See NavOutline.vue for the selection and navigation behavior of the Outline pane and
    getMermaid.ts for what is shown in the graph.
-->
<template>
    <v-container fluid class="page-graph-container">
        <v-row class="fill-height">
            <!-- LEFT PANE -->
            <v-col cols="3" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Outline</v-card-title>
                    <v-divider />
                    <div class="pane-scroll pa-0" @click="onOutlineClick">
                        <nav-outline ref="outlineRef" :nodes="outlineTree" @select="onOutlineSelect" />
                    </div>
                </v-card>
            </v-col>

            <!-- RIGHT PANE -->
            <v-col cols="9" class="fill-height">
                <v-card class="pane-card">
                    <div class="d-flex align-center">
                        <v-card-title tag="h2">Graph</v-card-title>
                        <v-spacer />
                        <v-switch v-model="expanded"
                                  class="graph-expanded mr-6"
                                  color="primary"
                                  density="compact"
                                  hide-details
                                  title="Show each relationship as a node with its links, instead of an arrow from its source to its target">
                            <!-- set like the label of the radius beside it: -->
                            <template #label><span class="text-body-2">Expanded</span></template>
                        </v-switch>
                        <span id="graph-radius-label" class="text-body-2 mr-2">Radius</span>
                        <v-btn-toggle v-model="radius" mandatory divided density="compact" variant="outlined" aria-labelledby="graph-radius-label">
                            <v-btn :value="1" aria-label="Radius 1" title="Show the next neighbours">1</v-btn>
                            <v-btn :value="2" aria-label="Radius 2" title="Show the neighbours of the neighbours as well">2</v-btn>
                        </v-btn-toggle>
                        <v-btn class="ml-2"
                               icon="mdi-fit-to-page-outline"
                               size="small"
                               variant="outlined"
                               :active="fit"
                               :aria-pressed="fit"
                               aria-label="Fit the graph to the pane"
                               title="Fit the graph to the pane"
                               @click="fit = !fit" />
                    </div>
                    <v-divider />
                    <v-card-text class="pane-scroll graph-pane" ref="paneEl" @scroll.passive="updatePopup()">
                        <div v-if="!graph" class="graph-hint">{{ hint }}</div>
                        <template v-else>
                            <p class="graph-caption">
                                <strong>{{ graph.nodes[0].title }}</strong>
                                <span v-if="kindOf(graph.nodes[0])"> ({{ kindOf(graph.nodes[0]) }})</span>
                                <span> &ndash; {{ count(graph.nodes.length, 'node') }}, {{ count(graph.edges.length, 'edge') }}</span>
                            </p>
                            <v-alert v-if="graph.omitted > 0" type="info" variant="tonal" density="compact" class="mb-4">
                                {{ graph.nodes.length }} of {{ graph.nodes.length + graph.omitted }} nodes within the radius are shown.
                                Select a neighbour to see the nodes around it.
                            </v-alert>
                            <v-alert v-if="renderError" type="error" variant="tonal" class="mb-4">
                                {{ renderError }}
                                <pre class="graph-definition">{{ graph.definition }}</pre>
                            </v-alert>
                            <v-progress-linear v-if="rendering" indeterminate color="primary" />
                            <!-- The graphic is rendered by Mermaid in 'strict' mode from a definition, in which
                                 all text of the items is escaped; see getMermaid() and mermaid-render.ts -->
                            <div class="graph-canvas"
                                 :class="{ 'graph-fit': fit }"
                                 ref="canvasEl"
                                 v-html="svg"
                                 @click="onGraphClick"
                                 @keydown="onGraphKeydown"
                                 @mouseover="updatePopup(popupDelay)"
                                 @mouseout="updatePopup()"
                                 @focusin="updatePopup()"
                                 @focusout="updatePopup()"></div>
                        </template>
                        <!-- Mermaid measures the labels here, where the same styles apply as to the graph shown: -->
                        <div class="graph-measure" ref="measureEl" aria-hidden="true"></div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- The popup is attached to the document body, so that it is not clipped by the scrolling pane: -->
        <teleport to="body">
            <div v-if="popup" class="graph-popup" role="tooltip" :style="popup.style">
                <div class="graph-popup-title">{{ popup.node.title }}</div>
                <div v-if="kindOf(popup.node)" class="graph-popup-kind">{{ kindOf(popup.node) }}</div>
                <p v-if="!popup.node.resolved" class="graph-popup-text">This item is referenced, but not available in the loaded packages.</p>
                <p v-if="popup.node.description" class="graph-popup-text">{{ popup.node.description }}</p>
                <dl v-if="popup.node.properties.length > 0" class="dl-horizontal">
                    <template v-for="(property, index) in popup.node.properties.slice(0, maxPopupProperties)" :key="index">
                        <dt>{{ property.title }}</dt>
                        <dd>{{ property.value }}</dd>
                    </template>
                </dl>
                <div v-if="popup.node.properties.length > maxPopupProperties" class="graph-popup-kind">
                    &hellip; and {{ popup.node.properties.length - maxPopupProperties }} more properties
                </div>
            </div>
        </teleport>
    </v-container>
</template>

<script lang="ts">
    import { defineComponent, toRaw } from 'vue'
    import { ItemCache } from '@/stores/item-cache'
    import { renderMermaid, graphNodeKey, drawDoubleLinks } from '@/lib/mermaid-render'
    import { getMermaidGraph, IGraphNode, IMermaidGraph } from '@cascara/common/export/mermaid/getMermaid'
    import { MultiLanguageText } from '@cascara/common/lib/helpers'
    import { PLI } from '@cascara/common/lib/platform-independence'
    import { APackage, AnEntity, PigItemType, TPigItem } from '@cascara/common/schema/pig/ts/pig-metaclasses'
    import NavOutline from './NavOutline.vue'
    import NavOutlineItem from './NavOutlineItem.vue'
    // OutlineNode is declared and exported from NavOutlineItem.vue; since the '*.vue'
    // module shim only exposes a default export to TypeScript, derive the type from the
    // component's own 'node' prop instead of importing it as a named type:
    type OutlineNode = InstanceType<typeof NavOutlineItem>['node']

    interface IPopup {
        node: IGraphNode
        element: Element    // the rendered node which the popup is shown for
        style: Record<string, string>
    }

    // The types shown as node of a graph, in the order they shall appear as top-level folders:
    const GRAPH_TYPES: { itemType: string, title: string }[] = [
        { itemType: PigItemType.Entity, title: 'Entity' },
        { itemType: PigItemType.Relationship, title: 'Relationship' }
    ]
    const RECYCLE_BIN_TITLE = 'Unreferenced Items (Recycle Bin)'
    const LISTS = 'cas:lists'
    const ROOT = 'cas:Root'
    const POPUP_WIDTH = 360     // in px, as set for .graph-popup below
    const POPUP_DELAY = 300     // in ms, before the popup is shown while hovering a node

    function titleOf(item: TPigItem, lang: string): string {
        return new MultiLanguageText(item.title).get(lang) || item.id || '(untitled)'
    }

    // Build the outline listing the items a graph can be shown for; every item is listed once,
    // since the id of an item is the id of its outline node:
    function buildOutline(items: TPigItem[], lang: string): OutlineNode[] {
        const itemById = new Map<string, TPigItem>()
        for (const item of items) {
            if (item.id) itemById.set(item.id, item)
        }
        const listed = new Set<string>()
        const listedBy = (entity: AnEntity): string[] =>
            (entity.hasTargetLink ?? []).filter(link => link.instanceOf === LISTS).map(link => link.idRef)

        // An entity with the entities it lists by aTargetLink instances of class 'cas:lists', recursively:
        const entityNode = (entity: AnEntity): OutlineNode => {
            listed.add(entity.id)
            const children: OutlineNode[] = []
            for (const id of listedBy(entity)) {
                const child = itemById.get(id)
                if (child && child.itemType === PigItemType.anEntity && !listed.has(id)) {
                    children.push(entityNode(child as AnEntity))
                }
            }
            return { id: entity.id, title: titleOf(entity, lang), html: '', children }
        }

        const result: OutlineNode[] = []

        // 1. One top-level node per package with the outline of its document, as on the Document page:
        //    the outline is rooted at the anEntity instances of class 'cas:Root', whose listed entities
        //    form the first level below the package.
        for (const pkg of items.filter(item => item.itemType === PigItemType.aPackage) as APackage[]) {
            if (!pkg.id || listed.has(pkg.id)) continue
            listed.add(pkg.id)
            const entities = (pkg.graph ?? [])
                .filter(item => item.itemType === PigItemType.anEntity && item.id)
                .map(item => toRaw(item) as AnEntity)
            const children: OutlineNode[] = []
            for (const root of entities.filter(entity => entity.instanceOf === ROOT)) {
                listed.add(root.id)
                for (const id of listedBy(root)) {
                    const child = itemById.get(id)
                    if (child && child.itemType === PigItemType.anEntity && !listed.has(id)) {
                        children.push(entityNode(child as AnEntity))
                    }
                }
            }
            // The entities which are not reachable from a root are collected in a folder; those listed
            // by another unreachable entity appear below that one, the others (and finally those which
            // are only part of a cycle) directly in the folder:
            const unreferenced: OutlineNode[] = []
            const pending = entities.filter(entity => !listed.has(entity.id))
            const listedByPending = new Set(pending.flatMap(listedBy))
            for (const entity of [...pending.filter(e => !listedByPending.has(e.id)), ...pending]) {
                if (!listed.has(entity.id)) unreferenced.push(entityNode(entity))
            }
            if (unreferenced.length > 0) {
                children.push({ id: `${pkg.id}:cas:RecycleBin`, title: RECYCLE_BIN_TITLE, html: '', children: unreferenced })
            }
            result.push({ id: pkg.id, title: titleOf(pkg, lang), html: '', children })
        }

        // 2. One top-level folder per type shown in a graph, as on the Ontology page; the folder id is
        //    prefixed to avoid a collision with the id of an item:
        for (const { itemType, title } of GRAPH_TYPES) {
            const children: OutlineNode[] = []
            for (const item of items) {
                if (item.itemType !== itemType || !item.id || listed.has(item.id)) continue
                listed.add(item.id)
                children.push({ id: item.id, title: titleOf(item, lang), html: '', children: [] })
            }
            if (children.length > 0) result.push({ id: `folder:${itemType}`, title, html: '', children })
        }
        return result
    }

    export default defineComponent({
        name: 'PageGraph',
        components: {
            NavOutline
        },
        data() {
            return {
                // The id of the item the graph is shown for; set by the Outline and by clicking a node:
                selectedId: null as string | null,
                // Number of edges to traverse from the selected item:
                radius: 1,
                // Whether a reified relationship is shown as a node with its links, instead of an arrow:
                expanded: false,
                // Whether a graph wider than the pane is scaled down to fit:
                fit: true,
                // The rendered graph; kept as an explicitly-set data property (rather than a computed),
                // since rendering is asynchronous while Vue computed properties are not:
                svg: '',
                renderError: null as string | null,
                rendering: false,
                // Counts the renderings started, to tell whether a finished one is still wanted:
                renderTicket: 0,
                popup: null as IPopup | null,
                popupTimer: undefined as number | undefined,
                // in ms, before the popup is shown for a node which the mouse pointer has come to rest on:
                popupDelay: POPUP_DELAY,
                maxPopupProperties: 12
            }
        },
        computed: {
            // Use toRaw to unwrap Pinia's reactive proxy, as the graph is composed from many items:
            items(): TPigItem[] {
                return ItemCache().items.map(item => toRaw(item) as TPigItem)
            },
            itemById(): Map<string, TPigItem> {
                const map = new Map<string, TPigItem>()
                for (const item of this.items) {
                    if (item.id) map.set(item.id, item)
                }
                return map
            },
            lang(): string {
                return PLI.getBrowserLanguage()
            },
            outlineTree(): OutlineNode[] {
                return buildOutline(this.items, this.lang)
            },
            // The graph of the selected item, or null if nothing is selected which a graph can be shown for
            // (for example a folder of the Outline, or a relationship unless the graph is expanded):
            graph(): IMermaidGraph | null {
                const item = this.selectedId === null ? undefined : this.itemById.get(this.selectedId)
                if (!item) return null
                const graph = getMermaidGraph(item, this.radius, { items: this.items, lang: this.lang, expanded: this.expanded })
                return graph.nodes.length > 0 ? graph : null
            },
            // What to tell the user, as long as there is no graph:
            hint(): string {
                const itemType = this.selectedId === null ? undefined : this.itemById.get(this.selectedId)?.itemType
                const isRelationship = itemType === PigItemType.Relationship || itemType === PigItemType.aRelationship
                return isRelationship && !this.expanded
                    ? 'A relationship is shown as a node in the expanded graph only. Switch on "Expanded" to see it.'
                    : 'Select an item from the left'
            },
            definition(): string | null {
                return this.graph?.definition ?? null
            },
            nodeByKey(): Map<string, IGraphNode> {
                return new Map((this.graph?.nodes ?? []).map(node => [node.key, node]))
            }
        },
        watch: {
            definition: {
                immediate: true,
                handler(definition: string | null) {
                    void this.render(definition)
                }
            }
        },
        beforeUnmount() {
            // a rendering which is still in progress is no more wanted:
            this.renderTicket++
            this.hidePopup()
        },
        methods: {
            // Callback from NavOutline whenever its selection changes (mouse click, keyboard
            // navigation, or programmatic selectNode()):
            onOutlineSelect(node: OutlineNode | null) {
                this.selectedId = node && this.itemById.has(node.id) ? node.id : null
            },
            // NavOutline does not report a click on the item which is selected already. That item is not
            // necessarily the one shown, namely after a node was clicked which the Outline does not list;
            // the click then leads back to the item selected in the Outline:
            onOutlineClick(event: MouseEvent) {
                const target = event.target as HTMLElement | null
                const id = (target?.closest('[data-outline-id]') as HTMLElement | null)?.dataset.outlineId
                if (id && id !== this.selectedId && this.itemById.has(id)) this.selectedId = id
            },
            // Make an item the selected one after its node was chosen in the graph; the Outline follows,
            // if it lists the item:
            selectItem(id: string) {
                this.selectedId = id;
                (this.$refs.outlineRef as unknown as { selectNode(id: string): void } | undefined)?.selectNode(id)
            },

            async render(definition: string | null) {
                const ticket = ++this.renderTicket
                this.hidePopup()
                if (definition === null) {
                    this.svg = ''
                    this.renderError = null
                    this.rendering = false
                    return
                }
                this.rendering = true
                const rendering = await renderMermaid(definition, this.$refs.measureEl as Element | undefined)
                // Rendering takes a while; drop the result, if another item was selected meanwhile:
                if (ticket !== this.renderTicket) return
                this.rendering = false
                this.svg = rendering.svg ?? ''
                this.renderError = rendering.error ?? null
                await this.$nextTick()
                if (ticket === this.renderTicket) this.prepareGraph()
            },
            // Mermaid renders the nodes as plain graphics; make them accessible by keyboard and name them
            // for assistive technology, and mark those which lead to another item when chosen.
            // A relationship drawn as arrow gets its double line:
            prepareGraph() {
                const canvas = this.$refs.canvasEl as HTMLElement | undefined
                drawDoubleLinks(canvas)
                for (const element of Array.from(canvas?.querySelectorAll('g.node') ?? [])) {
                    const node = this.nodeByKey.get(graphNodeKey(element) ?? '')
                    if (!node) continue
                    const kind = this.kindOf(node)
                    element.setAttribute('tabindex', '0')
                    element.setAttribute('aria-label', kind ? `${node.title} (${kind})` : node.title)
                    if (this.isLink(node)) {
                        element.setAttribute('role', 'button')
                        element.classList.add('graph-node-link')
                    }
                }
            },
            // Whether choosing a node leads to another item:
            isLink(node: IGraphNode): boolean {
                return node.resolved && node.id !== this.selectedId
            },
            // What a node is: the class of an instance or the metaclass of a type; nothing for a node
            // which is named by its class anyway, as a relationship without a title of its own
            kindOf(node: IGraphNode): string {
                if (!node.resolved) return ''
                const kind = node.classTitle ?? (node.itemType ?? '').replace(/^cas:/, '')
                return kind === node.title ? '' : kind
            },
            count(number: number, noun: string): string {
                return `${number} ${noun}${number === 1 ? '' : 's'}`
            },
            nodeOf(target: EventTarget | null): IGraphNode | undefined {
                return this.nodeByKey.get(graphNodeKey(target as Element | null) ?? '')
            },

            onGraphClick(event: MouseEvent) {
                const node = this.nodeOf(event.target)
                if (node && this.isLink(node)) this.selectItem(node.id)
            },
            onGraphKeydown(event: KeyboardEvent) {
                if (event.key !== 'Enter' && event.key !== ' ') return
                const node = this.nodeOf(event.target)
                if (!node) return
                // the space key would scroll the pane otherwise:
                event.preventDefault()
                if (this.isLink(node)) this.selectItem(node.id)
            },
            // The rendered node to show the popup for: the one under the mouse pointer, otherwise the one
            // which has the focus by keyboard; none, if that node is scrolled out of the pane:
            popupElement(): Element | null {
                const canvas = this.$refs.canvasEl as HTMLElement | undefined
                const pane = (this.$refs.paneEl as { $el?: Element } | undefined)?.$el
                const element = canvas?.querySelector('g.node:hover') ?? canvas?.querySelector('g.node:focus-visible')
                if (!element || !pane) return null
                const box = element.getBoundingClientRect()
                const visible = pane.getBoundingClientRect()
                const inPane = box.bottom > visible.top && box.top < visible.bottom && box.right > visible.left && box.left < visible.right
                return inPane ? element : null
            },
            // Called whenever the mouse pointer or the keyboard focus has moved or the pane was scrolled:
            // show the popup for another node (after a delay, if given), move it along with its node or hide it
            updatePopup(delay = 0) {
                window.clearTimeout(this.popupTimer)
                const element = this.popupElement()
                if (element && element === this.popup?.element) {
                    this.showPopup(element)
                } else {
                    this.popup = null
                    // show the popup only, if the node is still the one pointed at when the delay is over:
                    if (element) this.popupTimer = window.setTimeout(() => { if (this.popupElement() === element) this.showPopup(element) }, delay)
                }
            },
            // Show the popup next to a node: below it, or above if the node is in the lower half of the window
            showPopup(element: Element) {
                const node = this.nodeOf(element)
                if (!node) return
                const box = element.getBoundingClientRect()
                const style: Record<string, string> = {
                    left: `${Math.max(8, Math.min(box.left, window.innerWidth - POPUP_WIDTH - 8))}px`
                }
                if (box.top + box.height / 2 > window.innerHeight / 2) {
                    style.bottom = `${window.innerHeight - box.top + 8}px`
                } else {
                    style.top = `${box.bottom + 8}px`
                }
                this.popup = { node, element, style }
            },
            hidePopup() {
                window.clearTimeout(this.popupTimer)
                this.popup = null
            }
        }
    })
</script>

<style scoped>
    .page-graph-container {
        height: 100%;
        padding: 0;
    }

    /* A graph in its original size may be wider than the pane: */
    .graph-pane {
        overflow-x: auto;
    }

    .graph-caption {
        margin-bottom: 0.5rem;
    }

    .graph-canvas :deep(svg) {
        display: block;
    }

    /* The gap of a double line shows the background of the pane: */
    .graph-canvas :deep(path.graph-link-gap) {
        stroke: rgb(var(--v-theme-surface));
    }

    /* The switch takes the space of its label only, instead of the whole row: */
    .graph-expanded {
        flex: 0 0 auto;
    }

    /* Takes part in the layout, as needed for measuring, but is neither seen nor does it take any space
       or extend the area to scroll: */
    .graph-measure {
        position: fixed;
        top: 0;
        left: 0;
        visibility: hidden;
        pointer-events: none;
    }

    /* A graph wider than the pane is scaled down proportionally (never cropped), a smaller one
       is shown in its original size: */
    .graph-canvas.graph-fit :deep(svg) {
        max-width: 100%;
        height: auto;
    }

    .graph-canvas :deep(g.node.graph-node-link) {
        cursor: pointer;
    }

    .graph-canvas :deep(g.node:focus-visible) {
        outline: 2px solid #1976d2;
        outline-offset: 2px;
    }

    .graph-definition {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        white-space: pre-wrap;
    }

    .graph-popup {
        position: fixed;
        z-index: 2500;
        box-sizing: border-box;
        width: max-content;
        max-width: 360px;
        padding: 0.5rem 0.75rem;
        border: 1px solid #bdbdbd;
        border-radius: 4px;
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        color: #2c3e50;
        font-size: 0.875rem;
        /* the popup must not take the mouse pointer from the node it belongs to: */
        pointer-events: none;
    }

    .graph-popup-title {
        font-weight: 500;
        font-size: 1rem;
    }

    .graph-popup-kind {
        font-style: italic;
        font-size: 90%;
    }

    .graph-popup-text {
        margin: 0.25rem 0;
        /* a long description is cut after some lines: */
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 8;
        line-clamp: 8;
        overflow: hidden;
    }
</style>
