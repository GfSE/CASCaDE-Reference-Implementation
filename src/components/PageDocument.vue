<!--
    PageDocument shows a document as an Outline pane (left) plus a Content pane
    (right):
    - the Outline is a collapsible tree of anEntity instances, built by
    following aTargetLink instances of class 'cas:lists' starting at anElement items
    with class cas:Root.
    - The Content pane renders the HTML of whichever outline node is currently selected.

    See the comment above flattenOutline() below for the full description of
    the Outline pane's mouse/keyboard selection and navigation behavior.
-->
<template>
    <v-container fluid class="page-document-container">
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
                        <div v-if="selectedHtml" v-html="selectedHtml"></div>
                        <div v-else>Select an item from the left</div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script lang="ts">
    import { Vue, Options } from 'vue-class-component'
    import { toRaw } from 'vue'
    import { PackageCache } from '@/stores/package-cache'
    import { getHTML, stringHTML } from '@/common/export/html/getHTML'
    import { APackage, AnEntity, PigItemType } from '@/common/schema/pig/ts/pig-metaclasses'
    import OutlineTreeItem from './OutlineTreeItem.vue'
    // OutlineNode is declared and exported from OutlineTreeItem.vue; since the '*.vue'
    // module shim only exposes a default export to TypeScript, derive the type from the
    // component's own 'node' prop instead of importing it as a named type:
    type OutlineNode = InstanceType<typeof OutlineTreeItem>['node']
//    import { LOG } from '@/common/lib/helpers'

    function extractTitle(html: string): string | null {
        const match = html.match(/<[^>]*class=["'][^"']*meta-title[^"']*["'][^>]*>(.*?)<\/[^>]+>/i);
        return match ? match[1] : null;
    }

    // Recursively build an outline node for an entity, following aTargetLink
    // instances of class 'cas:lists' to collect its children.
    // 'ancestors' guards against cycles within the current branch.
    // 'referencedIds' collects the ids of all entities reachable from a root,
    // so that entities not reachable from any root can be detected afterwards.
    function buildOutlineNode(entity: AnEntity, entityById: Map<string, AnEntity>, ancestors: Set<string>, referencedIds: Set<string>): OutlineNode {
        const html = getHTML(entity, { itemType: [PigItemType.anEntity] })[0]
        const title = extractTitle(html) ?? entity.id

        if (entity.id) referencedIds.add(entity.id)

        const newAncestors = new Set(ancestors)
        if (entity.id) newAncestors.add(entity.id)

        const children: OutlineNode[] = []
        for (const link of entity.hasTargetLink ?? []) {
            if (link.hasClass !== 'cas:lists') continue
            const child = entityById.get(link.idRef)
            if (child && child.id && !ancestors.has(child.id)) {
                children.push(buildOutlineNode(child, entityById, newAncestors, referencedIds))
            }
        }
        return { id: entity.id, title, html, children }
    }

    const RECYCLE_BIN_ID = 'cas:RecycleBin'
    const RECYCLE_BIN_TITLE = 'Unreferenced Items (Recycle Bin)'

    // Desired Outline pane selection/navigation behavior:
    // - Mouse click: selects the clicked item (folder or leaf) and gives it native
    //   DOM focus; clicking a folder's activator also toggles it open/closed
    //   (Vuetify's own v-list-group behavior).
    // - Up/Down arrow keys: move the selection one step up/down through the
    //   currently *visible* tree only, i.e. the children of a closed folder are
    //   skipped; they never open or close a folder.
    // - Right arrow key: if the selected item is a closed collapsible folder, it
    //   is opened in place (selection stays on it); otherwise (open folder or
    //   leaf) the selection moves down to the next item in the *whole* tree
    //   (pre-order), which may step into a folder that isn't visible yet.
    //   When stepping out of a folder past its last descendant, that folder is
    //   closed again.
    // - Left arrow key: the mirror image of the right arrow key: if the selected
    //   item is an open collapsible folder, it is closed in place (selection
    //   stays on it); otherwise (closed folder or leaf) the selection moves up
    //   to the previous item in the *whole* tree, re-opening any folder that is
    //   stepped back into.
    // - Native DOM focus is the single source of truth for "selected": there is
    //   exactly one visual selection state, driven purely by :focus/:focus-visible
    //   styling (see OutlineTreeItem.vue), and selectedId always mirrors it,
    //   regardless of whether the focus change was caused by a mouse click, the
    //   arrow keys above, or e.g. Tab-key browser navigation.

    // Flatten an outline tree (pre-order) into a single array, e.g. for arrow-key navigation:
    function flattenOutline(nodes: OutlineNode[]): OutlineNode[] {
        const result: OutlineNode[] = []
        for (const node of nodes) {
            result.push(node)
            result.push(...flattenOutline(node.children))
        }
        return result
    }

    @Options({
        name: 'PageDocument',
        components: {
            OutlineTreeItem
        },
        data() {
            return {
                selectedId: null as string | null,
                // Ids of outline nodes whose children are currently expanded (Vuetify v-list 'opened' model):
                openedIds: [] as string[]
            }
        },
        computed: {
            outlineTree(): OutlineNode[] {
                const cache = PackageCache();
                const packages = cache.packages;

                if (!packages || packages.length === 0) {
                    return []
                }

                // Use toRaw to unwrap Pinia's reactive proxy for all loaded packages
                const rawPackages = packages.map(pkg => toRaw(pkg) as APackage)

                // Build a global lookup of anEntity instances by id, so that
                // aTargetLink.idRef references can be resolved across all loaded packages:
                const entityById = new Map<string, AnEntity>()
                for (const rawPkg of rawPackages) {
                    for (const item of rawPkg.graph) {
                        if (item.itemType === PigItemType.anEntity && item.id) {
                            entityById.set(item.id, item as AnEntity)
                        }
                    }
                }

                // The outline is rooted at anEntity instances of class 'cas:Root'.
                // Their children -- referenced via aTargetLink of class 'cas:lists' -- form
                // the first level of the outline tree; each child's own 'cas:lists' targets
                // are collected recursively to build the full tree.
                const result: OutlineNode[] = []
                const referencedIds = new Set<string>()
                for (const rawPkg of rawPackages) {
                    for (const item of rawPkg.graph) {
                        if (item.itemType !== PigItemType.anEntity || (item as AnEntity).hasClass !== 'cas:Root') {
                            continue
                        }
                        const root = item as AnEntity
                        if (root.id) referencedIds.add(root.id)
                        const ancestors = new Set<string>(root.id ? [root.id] : [])
                        for (const link of root.hasTargetLink ?? []) {
                            if (link.hasClass !== 'cas:lists') continue
                            const child = entityById.get(link.idRef)
                            if (child) {
                                result.push(buildOutlineNode(child, entityById, ancestors, referencedIds))
                            }
                        }
                    }
                }

                // Any anEntity instance not reachable from a root via 'cas:lists' is collected
                // into a synthetic 'Unreferenced Items (Recycle Bin)' folder appended at the end.
                // Each orphaned entity is built recursively together with its own 'cas:lists'
                // children, so that whole orphaned sub-trees end up nested under the bin
                // instead of being listed flatly; buildOutlineNode marks descendants as
                // referenced as it goes, avoiding duplicate top-level entries for them.
                //
                // An unreferenced entity that is itself listed (via 'cas:lists') by another
                // unreferenced entity is *not* shown as a separate top-level bin entry --
                // it will already appear nested under that other orphan's sub-tree.
                const childOfOrphan = new Set<string>()
                for (const entity of entityById.values()) {
                    if (!entity.id || referencedIds.has(entity.id)) continue
                    for (const link of entity.hasTargetLink ?? []) {
                        if (link.hasClass !== 'cas:lists') continue
                        const targetId = link.idRef
                        if (targetId && entityById.has(targetId) && !referencedIds.has(targetId)) {
                            childOfOrphan.add(targetId)
                        }
                    }
                }

                const unreferenced: OutlineNode[] = []
                for (const entity of entityById.values()) {
                    if (entity.id && !referencedIds.has(entity.id) && !childOfOrphan.has(entity.id)) {
                        const ancestors = new Set<string>([entity.id])
                        unreferenced.push(buildOutlineNode(entity, entityById, ancestors, referencedIds))
                    }
                }
                // Fallback for orphaned entities that only occur in a cycle among themselves
                // (each one being "someone's child"), so no data is silently dropped:
                for (const entity of entityById.values()) {
                    if (entity.id && !referencedIds.has(entity.id)) {
                        const ancestors = new Set<string>([entity.id])
                        unreferenced.push(buildOutlineNode(entity, entityById, ancestors, referencedIds))
                    }
                }
                if (unreferenced.length > 0) {
                    result.push({
                        id: RECYCLE_BIN_ID,
                        title: RECYCLE_BIN_TITLE,
                        html: `<div class="meta-anEntity"><div class="col-main"><h3 class="meta-title">${RECYCLE_BIN_TITLE}</h3></div></div>`,
                        children: unreferenced
                    })
                }

                return result
            },

            // Full pre-order traversal of the *entire* tree, regardless of which
            // folders are currently expanded; used by the left/right arrow keys,
            // which walk through the whole tree, opening/closing folders as needed:
            flatOutline(): OutlineNode[] {
                return flattenOutline(this.outlineTree)
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

            selectedHtml(): stringHTML | null {
                if (this.selectedId === null) return null
                return this.nodeById.get(this.selectedId)?.html ?? null
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
            },
            extractTitle
        },
        mounted() {
            // Select the first item when opening the view:
            if (this.flatOutline.length > 0) {
                this.selectedId = this.flatOutline[0].id
                this.focusItem(this.selectedId)
            }
        }
    })

    export default class PageDocument extends Vue { }
</script>

<style scoped>
    .page-document-container {
        height: 100%;
        padding: 0;
    }

    .fill-height {
        height: 100%;
        min-height: 0;
    }

    .pane-card {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
    }

    .pane-scroll {
        flex: 1 1 0;
        overflow-y: auto;
        min-height: 0;
    }

    .pane-scroll ::v-deep(.v-list-item) {
        min-height: 24px !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
    }
</style>
