<!--
    PageDocument shows a document as an Outline pane (left) plus a Content pane (right):
    - the Outline is a collapsible tree of anEntity instances, built by
    following aTargetLink instances of class 'cas:lists' starting at anElement items
    with class cas:Root.
    - The Content pane renders the HTML of whichever outline node is currently selected.

    See NavOutline.vue for the full description of the Outline pane's
    mouse/keyboard selection and navigation behavior, which it owns entirely.
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
                        <nav-outline ref="outlineRef" :nodes="outlineTree" @select="onOutlineSelect" />
                    </div>
                </v-card>
            </v-col>

            <!-- RIGHT PANE -->
            <v-col cols="9" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Content</v-card-title>
                    <v-divider />
                    <v-card-text class="pane-scroll">
                        <div v-if="resolvedHtml" ref="contentEl" v-html="resolvedHtml"></div>
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
    import { ItemCache } from '@/stores/item-cache'
    import { getHTML, resolveAssetImagesInHtml, stringHTML } from '@/common/export/html/getHTML'
    import { APackage, AnEntity, PigItemType } from '@/common/schema/pig/ts/pig-metaclasses'
    import NavOutline from './NavOutline.vue'
    import NavOutlineItem from './NavOutlineItem.vue'
    // OutlineNode is declared and exported from NavOutlineItem.vue; since the '*.vue'
    // module shim only exposes a default export to TypeScript, derive the type from the
    // component's own 'node' prop instead of importing it as a named type:
    type OutlineNode = InstanceType<typeof NavOutlineItem>['node']
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
            if (link.instanceOf !== 'cas:lists') continue
            const child = entityById.get(link.idRef)
            if (child && child.id && !ancestors.has(child.id)) {
                children.push(buildOutlineNode(child, entityById, newAncestors, referencedIds))
            }
        }
        return { id: entity.id, title, html, children }
    }

    const RECYCLE_BIN_TITLE = 'Unreferenced Items (Recycle Bin)'

    @Options({
        name: 'PageDocument',
        components: {
            NavOutline
        },
        data() {
            return {
                // Fully resolved HTML (images inlined) of the currently selected outline
                // node, ready to be inserted into the DOM via v-html; kept as a separate,
                // explicitly-set data property (rather than a computed) since resolving
                // image placeholders is asynchronous while Vue computed properties are not:
                resolvedHtml: null as stringHTML | null,
                // Raw HTML (still containing unresolved image placeholders) of the
                // currently selected outline node; set by onOutlineSelect() below:
                selectedHtml: null as stringHTML | null
            }
        },
        watch: {
            // The content pane's HTML (containing image placeholders inserted by
            // getHTML()) changes whenever the selected outline item changes; resolve
            // all image placeholders to inline images *before* writing the result to
            // 'resolvedHtml' (and thus the DOM via v-html), so there is no dependency
            // on DOM/ref timing as there would be when resolving placeholders found
            // in the already-rendered DOM:
            selectedHtml: {
                immediate: true,
                async handler(html: stringHTML | null) {
                    this.resolvedHtml = html === null ? null : await resolveAssetImagesInHtml(html)
                }
            }
        },
        computed: {
            outlineTree(): OutlineNode[] {
                const cache = ItemCache();
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

                // One top-level outline node per package, showing the package's own
                // metadata (native and configurable properties, like anEntity); the
                // package's roots and unreferenced items are nested underneath it.
                const result: OutlineNode[] = []
                for (const rawPkg of rawPackages) {
                    // GetHTML.aPackage() (via getHTML()) returns [packageHTML, ...anEntity
                    // HTML for each graph item]; only the first entry (the package's own
                    // metadata) is needed here, the graph items are handled below via the
                    // outline tree, so no graph item itemTypes are requested:
                    const packageHtml = getHTML(rawPkg, { itemType: [] })[0]
                    const packageTitle = extractTitle(packageHtml) ?? rawPkg.id ?? 'Untitled Package'

                    // The outline is rooted at anEntity instances of class 'cas:Root'.
                    // Their children -- referenced via aTargetLink of class 'cas:lists' -- form
                    // the first level of the outline tree below the package node; each child's
                    // own 'cas:lists' targets are collected recursively to build the full tree.
                    const packageChildren: OutlineNode[] = []
                    const referencedIds = new Set<string>()
                    for (const item of rawPkg.graph) {
                        if (item.itemType !== PigItemType.anEntity || (item as AnEntity).instanceOf !== 'cas:Root') {
                            continue
                        }
                        const root = item as AnEntity
                        if (root.id) referencedIds.add(root.id)
                        const ancestors = new Set<string>(root.id ? [root.id] : [])
                        for (const link of root.hasTargetLink ?? []) {
                            if (link.instanceOf !== 'cas:lists') continue
                            const child = entityById.get(link.idRef)
                            if (child) {
                                packageChildren.push(buildOutlineNode(child, entityById, ancestors, referencedIds))
                            }
                        }
                    }

                    // Any anEntity instance of this package not reachable from a root via
                    // 'cas:lists' is collected into a synthetic 'Unreferenced Items (Recycle
                    // Bin)' folder nested under the package node. Each orphaned entity is built
                    // recursively together with its own 'cas:lists' children, so that whole
                    // orphaned sub-trees end up nested under the bin instead of being listed
                    // flatly; buildOutlineNode marks descendants as referenced as it goes,
                    // avoiding duplicate entries for them.
                    //
                    // An unreferenced entity that is itself listed (via 'cas:lists') by another
                    // unreferenced entity is *not* shown as a separate bin entry -- it will
                    // already appear nested under that other orphan's sub-tree.
                    const packageEntityIds = new Set<string>()
                    for (const item of rawPkg.graph) {
                        if (item.itemType === PigItemType.anEntity && item.id) {
                            packageEntityIds.add(item.id)
                        }
                    }

                    const childOfOrphan = new Set<string>()
                    for (const id of packageEntityIds) {
                        const entity = entityById.get(id)
                        if (!entity || !entity.id || referencedIds.has(entity.id)) continue
                        for (const link of entity.hasTargetLink ?? []) {
                            if (link.instanceOf !== 'cas:lists') continue
                            const targetId = link.idRef
                            if (targetId && packageEntityIds.has(targetId) && !referencedIds.has(targetId)) {
                                childOfOrphan.add(targetId)
                            }
                        }
                    }

                    const unreferenced: OutlineNode[] = []
                    for (const id of packageEntityIds) {
                        const entity = entityById.get(id)
                        if (entity && entity.id && !referencedIds.has(entity.id) && !childOfOrphan.has(entity.id)) {
                            const ancestors = new Set<string>([entity.id])
                            unreferenced.push(buildOutlineNode(entity, entityById, ancestors, referencedIds))
                        }
                    }
                    // Fallback for orphaned entities that only occur in a cycle among themselves
                    // (each one being "someone's child"), so no data is silently dropped:
                    for (const id of packageEntityIds) {
                        const entity = entityById.get(id)
                        if (entity && entity.id && !referencedIds.has(entity.id)) {
                            const ancestors = new Set<string>([entity.id])
                            unreferenced.push(buildOutlineNode(entity, entityById, ancestors, referencedIds))
                        }
                    }
                    if (unreferenced.length > 0) {
                        packageChildren.push({
                            id: `${rawPkg.id ?? 'package'}:cas:RecycleBin`,
                            title: RECYCLE_BIN_TITLE,
                            html: `<div class="meta-anEntity"><div class="col-main"><h3 class="meta-title">${RECYCLE_BIN_TITLE}</h3></div></div>`,
                            children: unreferenced
                        })
                    }

                    result.push({
                        id: rawPkg.id ?? `package:${result.length}`,
                        title: packageTitle,
                        html: packageHtml,
                        children: packageChildren
                    })
                }

                return result
            }
        },
        methods: {
            // Callback from NavOutline whenever the selection changes (mouse click,
            // keyboard navigation, or programmatic selectNode()); drives the content
            // pane entirely through this one callback, with no other dependency on
            // NavOutline's internal selection/expansion state:
            onOutlineSelect(node: OutlineNode | null) {
                this.selectedHtml = node?.html ?? null
            },
            extractTitle
        }
    })
    export default class PageDocument extends Vue { }
</script>

<style scoped>
    .page-document-container {
        height: 100%;
        padding: 0;
    }

    /* Images/SVGs inserted via v-html (e.g. by getHTML()/resolveAssetImagesInHtml())
       are shown at their original size when smaller than the column/pane, and
       scaled down proportionally (never cropped) when they are wider: */
    .pane-scroll ::v-deep(img),
    .pane-scroll ::v-deep(svg) {
        max-width: 100%;
        width: auto;
        height: auto;
    }
</style>
