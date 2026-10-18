<!--
    PageOntology shows the ontology (types) as an Outline pane (left) plus a Content pane (right),
    following the same layout as PageDocument.vue.
    The Outline pane has one top-level folder per CASCaRA Type (Enumeration, Property, Link,
    Entity, Relationship), listing the types found in the ItemCache for each.
--><template>
    <v-container fluid class="page-ontology-container">
        <v-row class="fill-height">
            <!-- LEFT PANE -->
            <v-col cols="3" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Outline</v-card-title>
                    <v-divider />
                    <div class="pane-scroll pa-0">
                        <v-list density="compact" v-model:opened="openedIds" @keydown.capture="handleArrowKeys" @focusin="handleFocusIn">
                            <outline-tree-item v-for="node in outlineTree"
                                                :key="node.id"
                                                :node="node"
                                                :selected-id="selectedId"
                                                @select="selectItem" />
                        </v-list>
                    </div>
                </v-card>
            </v-col>

            <!-- RIGHT PANE -->
            <v-col cols="9" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Content</v-card-title>
                    <v-divider />
                    <v-card-text class="pane-scroll">
                        <div v-if="resolvedHtml" v-html="resolvedHtml"></div>
                        <div v-else>Select an item from the left</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
    import { Vue, Options } from 'vue-class-component'
    import { ItemCache } from '@/stores/item-cache'
    import { LIB } from '@/common/lib/helpers'
    import { getHTML, resolveAssetImagesInHtml, stringHTML } from '@/common/export/html/getHTML'
    import { PigItemType, TPigClass } from '@/common/schema/pig/ts/pig-metaclasses'
    import OutlineTreeItem from './OutlineTreeItem.vue'
    // OutlineNode is declared and exported from OutlineTreeItem.vue; since the '*.vue'
    // module shim only exposes a default export to TypeScript, derive the type from the
    // component's own 'node' prop instead of importing it as a named type:
    type OutlineNode = InstanceType<typeof OutlineTreeItem>['node']

    // The CASCaRA Types, in the order they shall appear as top-level folders:
    const CASCARA_TYPES: { itemType: string, title: string }[] = [
        { itemType: PigItemType.Enumeration, title: 'Enumeration' },
        { itemType: PigItemType.Property, title: 'Property' },
        { itemType: PigItemType.Link, title: 'Link' },
        { itemType: PigItemType.Entity, title: 'Entity' },
        { itemType: PigItemType.Relationship, title: 'Relationship' }
    ]

    @Options({
        name: 'PageOntology',
        components: {
            OutlineTreeItem
        },
        data() {
            return {
                selectedId: null as string | null,
                // Ids of outline nodes whose children are currently expanded (Vuetify v-list 'opened' model):
                openedIds: [] as string[],
                // Fully resolved HTML (images inlined) of the currently selected outline
                // node; see PageDocument.vue for the rationale behind this explicit data
                // property (rather than a computed, since resolving is asynchronous):
                resolvedHtml: null as stringHTML | null
            }
        },
        watch: {
            selectedHtml: {
                immediate: true,
                async handler(html: stringHTML | null) {
                    this.resolvedHtml = html === null ? null : await resolveAssetImagesInHtml(html)
                }
            }
        },
        computed: {
            selectedHtml(): stringHTML | null {
                if (this.selectedId === null) return null
                return this.nodeById.get(this.selectedId)?.html ?? null
            },
            flatOutline(): OutlineNode[] {
                const flatten = (nodes: OutlineNode[]): OutlineNode[] => nodes.flatMap(n => [n, ...flatten(n.children)])
                return flatten(this.outlineTree)
            },
            // Pre-order traversal of only the *visible* part of the tree, i.e. a node's
            // children are only included while the node itself is expanded; used by the
            // up/down arrow keys, which only walk the currently visible tree:
            visibleFlatOutline(): OutlineNode[] {
                const result: OutlineNode[] = []
                const visit = (nodes: OutlineNode[]) => {
                    for (const node of nodes) {
                        result.push(node)
                        if (node.children.length > 0 && this.openedIds.includes(node.id)) {
                            visit(node.children)
                        }
                    }
                }
                visit(this.outlineTree)
                return result
            },
            // Maps a node id to its own OutlineNode instance, for quick lookup by id:
            nodeById(): Map<string, OutlineNode> {
                const map = new Map<string, OutlineNode>()
                for (const node of this.flatOutline as OutlineNode[]) map.set(node.id, node)
                return map
            },
            // Maps a node id to its parent's id (or undefined for top-level nodes):
            parentMap(): Map<string, string> {
                const map = new Map<string, string>()
                const visit = (nodes: OutlineNode[], parentId: string | null) => {
                    for (const node of nodes) {
                        if (parentId !== null) map.set(node.id, parentId)
                        if (node.children.length > 0) visit(node.children, node.id)
                    }
                }
                visit(this.outlineTree, null)
                return map
            },
            outlineTree(): OutlineNode[] {
                const cache = ItemCache()
                const packages = cache.packages

                if (!packages || packages.length === 0) {
                    return []
                }

                // One top-level folder per CASCaRA Type, listing the matching items found
                // across all loaded packages, in the fixed order given by CASCARA_TYPES:
                return CASCARA_TYPES.map(({ itemType, title }) => {
                    const children: OutlineNode[] = []
                    for (const pkg of packages) {
                        for (const item of pkg.graph) {
                            if (item.itemType !== itemType) continue
                            const typedItem = item as TPigClass
                            const itemTitle = LIB.getLocalText(typedItem.title) || typedItem.id || '(untitled)'
                            const itemHtml = getHTML(typedItem, {})[0]
                            children.push({ id: typedItem.id ?? itemTitle, title: itemTitle, html: itemHtml, children: [] })
                        }
                    }
                    // Prefix the folder id to avoid collisions with item ids: an item with
                    // the same id as its own itemType (e.g. the base 'Link' metaclass itself,
                    // with id 'cas:Link') would otherwise clash with the 'Link' folder node,
                    // breaking flatOutline/nodeById lookups and thus arrow-key navigation:
                    return { id: `folder:${itemType}`, title, html: '', children }
                })
            }
        },
        methods: {
            selectItem(id: string) {
                this.selectedId = id
                this.focusItem(id)
            },

            // Native DOM focus is the single source of truth for the 'selected' item;
            // this keeps selectedId in sync whenever focus moves for any reason
            // (mouse click, Tab key, or our own programmatic focusItem calls):
            handleFocusIn(event: FocusEvent) {
                const target = event.target as HTMLElement | null
                const item = target?.closest('[data-outline-id]') as HTMLElement | null
                const id = item?.dataset.outlineId
                if (id && id !== this.selectedId) this.selectedId = id
            },

            // Moves native focus to the outline item with the given id, so that the
            // browser's own focus/active styling always matches our selection state:
            focusItem(id: string | null) {
                if (!id) return
                this.$nextTick(() => {
                    const el = document.getElementById(`outline-item-${id}`)
                    el?.focus()
                })
            },

            // Returns the list of ancestor ids of a node, ordered from the root down
            // to (but excluding) the node itself:
            ancestorChain(id: string): string[] {
                const chain: string[] = []
                let current: string | undefined = this.parentMap.get(id)
                while (current) {
                    chain.unshift(current)
                    current = this.parentMap.get(current)
                }
                return chain
            },

            handleArrowKeys(event: KeyboardEvent) {
                if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                // Vuetify's v-list-item has its own built-in roving-tabindex keyboard
                // navigation bound directly to the focused item; that listener runs during
                // the bubble phase before the event would reach our listener on v-list, so
                // we intercept during the capture phase (@keydown.capture) instead and stop
                // the event here, before it can reach the item and trigger a second move:
                event.stopPropagation()
                event.preventDefault()

                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    // Up/down: walk the visible tree only.
                    const visible = this.visibleFlatOutline as OutlineNode[]
                    if (visible.length === 0) return
                    const currentIndex = visible.findIndex(n => n.id === this.selectedId)
                    if (event.key === 'ArrowDown') {
                        if (currentIndex === -1) {
                            this.selectedId = visible[0].id
                        } else if (currentIndex < visible.length - 1) {
                            this.selectedId = visible[currentIndex + 1].id
                        }
                    } else {
                        if (currentIndex === -1) {
                            this.selectedId = visible[0].id
                        } else if (currentIndex > 0) {
                            this.selectedId = visible[currentIndex - 1].id
                        }
                    }
                    this.focusItem(this.selectedId)
                    return
                }

                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return

                // Left/right: walk the whole tree, opening/closing folders as needed.
                const full = this.flatOutline as OutlineNode[]
                if (full.length === 0 || this.selectedId === null) return
                const node = this.nodeById.get(this.selectedId)
                if (!node) return

                if (event.key === 'ArrowRight') {
                    if (node.children.length > 0 && !this.openedIds.includes(node.id)) {
                        // Closed collapsible folder: open it in place.
                        this.openedIds.push(node.id)
                        return
                    }
                    // Open folder or leaf: move down to the next node in the whole tree.
                    const currentIndex = full.findIndex(n => n.id === node.id)
                    if (currentIndex === -1 || currentIndex >= full.length - 1) return
                    const nextNode = full[currentIndex + 1]
                    // Close any folders we're stepping out of (i.e. ancestors of the
                    // current node that are not ancestors of the next node):
                    const nextAncestors = this.ancestorChain(nextNode.id)
                    const exited = this.ancestorChain(node.id).filter((a: string) => !nextAncestors.includes(a))
                    if (exited.length > 0) {
                        this.openedIds = this.openedIds.filter((id: string) => !exited.includes(id))
                    }
                    this.selectedId = nextNode.id
                    this.focusItem(this.selectedId)
                } else {
                    if (node.children.length > 0 && this.openedIds.includes(node.id)) {
                        // Open collapsible folder: close it in place.
                        this.openedIds = this.openedIds.filter((id: string) => id !== node.id)
                        return
                    }
                    // Closed folder or leaf: move up to the previous node in the whole tree.
                    const currentIndex = full.findIndex(n => n.id === node.id)
                    if (currentIndex <= 0) return
                    const prevNode = full[currentIndex - 1]
                    // Open any folders we're stepping back into (i.e. ancestors of the
                    // previous node that are not ancestors of the current node):
                    const currentAncestors = this.ancestorChain(node.id)
                    const entered = this.ancestorChain(prevNode.id).filter((a: string) => !currentAncestors.includes(a))
                    for (const id of entered) {
                        if (!this.openedIds.includes(id)) this.openedIds.push(id)
                    }
                    this.selectedId = prevNode.id
                    this.focusItem(this.selectedId)
                }
            }
        },
        mounted() {
            // Select the first item when opening the view; the 'selectedHtml' watcher
            // above (immediate: true) takes care of resolving its image placeholders:
            if (this.flatOutline.length > 0) {
                this.selectedId = this.flatOutline[0].id
                this.focusItem(this.selectedId)
            }
        }
    })
    export default class PageOntology extends Vue { }
</script>

<style scoped>
    .page-ontology-container {
        height: 100%;
        padding: 0;
    }

    .pane-scroll ::v-deep(.v-list-item) {
        min-height: 24px !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
    }
</style>
