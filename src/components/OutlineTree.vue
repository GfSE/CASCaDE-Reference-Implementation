<!--
    OutlineTree is a self-contained, reusable tree-navigation component for the
    "Outline" pane used by PageDocument.vue and PageOntology.vue (and any future
    page with the same left-pane tree). It owns the full selection/expansion
    state and keyboard/mouse navigation behavior; it has no dependency on, and no
    knowledge of, whatever "Content pane" a caller wants to drive from it.

    The caller only supplies the tree data (:nodes) and listens to the @select
    event to update its own content pane. For programmatic control, the caller
    can obtain a component ref and call selectNode()/expandNode()/collapseNode().

    Selection/expansion behavior:
    - Mouse click: selects the clicked item (folder or leaf) and gives it native
      DOM focus; clicking a folder's activator also toggles it open/closed
      (Vuetify's own v-list-group behavior).
    - Up/Down arrow keys: move the selection one step up/down through the
      currently *visible* tree only, i.e. the children of a closed folder are
      skipped; they never open or close a folder.
    - Right arrow key: if the selected item is a closed collapsible folder, it
      is opened in place (selection stays on it); otherwise (open folder or
      leaf) the selection moves down to the next item in the *whole* tree
      (pre-order), which may step into a folder that isn't visible yet.
      When stepping out of a folder past its last descendant, that folder is
      closed again.
    - Left arrow key: the mirror image of the right arrow key: if the selected
      item is an open collapsible folder, it is closed in place (selection
      stays on it); otherwise (closed folder or leaf) the selection moves up
      to the previous item in the *whole* tree, re-opening any folder that is
      stepped back into.
    - Native DOM focus is the single source of truth for "selected": there is
      exactly one visual selection state, driven purely by :focus/:focus-visible
      styling (see OutlineTreeItem.vue), and selectedId always mirrors it,
      regardless of whether the focus change was caused by a mouse click, the
      arrow keys above, or e.g. Tab-key browser navigation.
    - On mount, the first top-level node is selected and all folders are closed;
      the caller can select a different node afterwards via selectNode().
-->
<template>
    <v-list density="compact" v-model:opened="openedIds" @keydown.capture="handleArrowKeys" @focusin="handleFocusIn">
        <outline-tree-item v-for="node in nodes"
                            :key="node.id"
                            :node="node"
                            :selected-id="selectedId"
                            @select="selectItem" />
    </v-list>
</template>

<script lang="ts">
    import { Vue, Options } from 'vue-class-component'
    import type { PropType } from 'vue'
    import OutlineTreeItem from './OutlineTreeItem.vue'
    // OutlineNode is declared and exported from OutlineTreeItem.vue; since the '*.vue'
    // module shim only exposes a default export to TypeScript, derive the type from the
    // component's own 'node' prop instead of importing it as a named type:
    type OutlineNode = InstanceType<typeof OutlineTreeItem>['node']

    @Options({
        name: 'OutlineTree',
        components: {
            OutlineTreeItem
        },
        props: {
            nodes: { type: Array as PropType<OutlineNode[]>, required: true }
        },
        emits: ['select'],
        data() {
            return {
                selectedId: null as string | null,
                // Ids of outline nodes whose children are currently expanded (Vuetify v-list 'opened' model):
                openedIds: [] as string[]
            }
        },
        computed: {
            // Pre-order traversal of the whole tree, regardless of which folders are open:
            flatOutline(): OutlineNode[] {
                const flatten = (nodes: OutlineNode[]): OutlineNode[] => nodes.flatMap(n => [n, ...flatten(n.children)])
                return flatten(this.nodes)
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
                visit(this.nodes)
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
                visit(this.nodes, null)
                return map
            }
        },
        watch: {
            selectedId: {
                immediate: true,
                handler(id: string | null) {
                    const node = id === null ? null : (this.nodeById as Map<string, OutlineNode>).get(id) ?? null
                    this.$emit('select', node)
                }
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

            // Programmatic API ---------------------------------------------------

            // Selects the node with the given id (if it exists), opening all of its
            // ancestor folders so it becomes visible, and closing all other folders.
            selectNode(id: string) {
                if (!this.nodeById.has(id)) return
                this.openedIds = this.ancestorChain(id)
                this.selectedId = id
                this.focusItem(id)
            },

            // Expands the folder node with the given id (no-op for a leaf or an
            // already-open folder); does not affect selection or other folders.
            expandNode(id: string) {
                const node = this.nodeById.get(id)
                if (!node || node.children.length === 0) return
                if (!this.openedIds.includes(id)) this.openedIds.push(id)
            },

            // Collapses the folder node with the given id (no-op for a leaf or an
            // already-closed folder); does not affect selection or other folders.
            collapseNode(id: string) {
                const node = this.nodeById.get(id)
                if (!node || node.children.length === 0) return
                this.openedIds = this.openedIds.filter((openId: string) => openId !== id)
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
            // Select the first top-level node and keep all folders closed; the
            // caller may select a different node afterwards via selectNode():
            if (this.nodes.length > 0) {
                this.selectedId = this.nodes[0].id
                this.focusItem(this.selectedId)
            }
        }
    })
    export default class OutlineTree extends Vue {
        nodes!: OutlineNode[]
    }
</script>

<style scoped>
    ::v-deep(.v-list-item) {
        min-height: 24px !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
    }
</style>
