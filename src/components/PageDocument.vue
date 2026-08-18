<template>
    <v-container fluid class="page-document-container">
        <v-row class="fill-height">
            <!-- LEFT PANE -->
            <v-col cols="3" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Outline</v-card-title>
                    <v-divider />
                    <div class="pane-scroll pa-0">
                        <v-list density="compact" @keydown="handleArrowKeys">
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
                selectedId: null as string | null
            }
        },
        computed: {
            outlineTree(): OutlineNode[] {
                const cache = PackageCache();
                const packages = cache.get();

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

            flatOutline(): OutlineNode[] {
                return flattenOutline(this.outlineTree)
            },

            selectedHtml(): stringHTML | null {
                if (this.selectedId === null) return null
                const node = this.flatOutline.find((n: OutlineNode) => n.id === this.selectedId)
                return node?.html ?? null
            }
        },
        methods: {
            selectItem(id: string) {
                this.selectedId = id
            },
            handleArrowKeys(event: KeyboardEvent) {
                const flat = this.flatOutline as OutlineNode[]
                if (flat.length === 0) return
                const currentIndex = flat.findIndex(n => n.id === this.selectedId)
                if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    if (currentIndex === -1) {
                        this.selectedId = flat[0].id
                    } else if (currentIndex < flat.length - 1) {
                        this.selectedId = flat[currentIndex + 1].id
                    }
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    if (currentIndex === -1) {
                        this.selectedId = flat[0].id
                    } else if (currentIndex > 0) {
                        this.selectedId = flat[currentIndex - 1].id
                    }
                }
            },
            extractTitle
        },
        mounted() {
            // Select the first item when opening the view:
            if (this.flatOutline.length > 0) {
                this.selectedId = this.flatOutline[0].id
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
