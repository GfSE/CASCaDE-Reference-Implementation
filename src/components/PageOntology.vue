<!--
    PageOntology shows the ontology (types) as an Outline pane (left) plus a Content pane (right),
    following the same layout as PageDocument.vue.
    The Outline pane has one top-level folder per CASCaRA Type (Enumeration, Property, Link,
    Entity, Relationship), listing the types found in the ItemCache for each.
-->
<template>
    <v-container fluid class="page-ontology-container">
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
    import { MultiLanguageText } from '@/common/lib/helpers'
    import { PLI } from '@/common/lib/platform-independence'
    import { getHTML, resolveAssetImagesInHtml, stringHTML } from '@/common/export/html/getHTML'
    import { PigItemType, TPigClass } from '@/common/schema/pig/ts/pig-metaclasses'
    import NavOutline from './NavOutline.vue'
    import NavOutlineItem from './NavOutlineItem.vue'
    // OutlineNode is declared and exported from NavOutlineItem.vue; since the '*.vue'
    // module shim only exposes a default export to TypeScript, derive the type from the
    // component's own 'node' prop instead of importing it as a named type:
    type OutlineNode = InstanceType<typeof NavOutlineItem>['node']

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
            NavOutline
        },
        data() {
            return {
                // Fully resolved HTML (images inlined) of the currently selected outline
                // node; see PageDocument.vue for the rationale behind this explicit data
                // property (rather than a computed, since resolving is asynchronous):
                resolvedHtml: null as stringHTML | null,
                // Raw HTML (still containing unresolved image placeholders) of the
                // currently selected outline node; set by onOutlineSelect() below:
                selectedHtml: null as stringHTML | null
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
            outlineTree(): OutlineNode[] {
                const cache = ItemCache()
                // Use the flat, deduplicated top-level 'items' list (not each package's
                // 'graph' array) so that an item shared by several packages is listed
                // only once in the Ontology outline, instead of once per package:
                const items = cache.items

                if (!items || items.length === 0) {
                    return []
                }

                // One top-level folder per CASCaRA Type, listing the matching items found
                // across all loaded packages, in the fixed order given by CASCARA_TYPES:
                const lang = PLI.getBrowserLanguage()
                return CASCARA_TYPES.map(({ itemType, title }) => {
                    const children: OutlineNode[] = []
                    for (const item of items) {
                        if (item.itemType !== itemType) continue
                        const typedItem = item as TPigClass
                        const itemTitle = new MultiLanguageText(typedItem.title).get(lang) || typedItem.id || '(untitled)'
                        const itemHtml = getHTML(typedItem, { lang })[0]
                        children.push({ id: typedItem.id ?? itemTitle, title: itemTitle, html: itemHtml, children: [] })
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
            // Callback from NavOutline whenever the selection changes (mouse click,
            // keyboard navigation, or programmatic selectNode()); drives the content
            // pane entirely through this one callback, with no other dependency on
            // NavOutline's internal selection/expansion state:
            onOutlineSelect(node: OutlineNode | null) {
                this.selectedHtml = node?.html ?? null
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
</style>
