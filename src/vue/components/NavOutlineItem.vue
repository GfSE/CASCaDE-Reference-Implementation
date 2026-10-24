<!--
    Renders a single node of the document Outline pane, recursively rendering its
    children as nested nav-outline-item instances. A node with children is shown
    as a collapsible Vuetify v-list-group (folder); a node without children is a
    plain, non-collapsible v-list-item (leaf).

    Selection: there is exactly one "selected" state, driven purely by native DOM
    focus (see PageDocument.vue, which is the single source of truth for
    selectedId and moves focus programmatically for arrow-key navigation). Each
    item therefore carries a stable DOM id (outline-item-<node.id>) so it can be
    looked up and focused, and a data-outline-id attribute so PageDocument can
    identify it again when native focus changes for any other reason (mouse
    click, Tab key, ...). The visual highlight itself is implemented purely via
    :focus/:focus-visible CSS below - selectedId is not used for styling here.

    Clicking an item both selects it (@select, handled by the parent) and, for a
    folder, toggles it open/closed via Vuetify's own v-list-group behavior.

    Titles that are too long to fit the pane are truncated with an ellipsis
    (see .text-body-2 CSS below); a v-tooltip shows the full, untruncated title
    while the mouse hovers over the item - regardless of whether that item is
    currently selected. The tooltip is never shown merely because an item has
    (keyboard) focus/selection - only actual mouse hover triggers it.
-->
<template>
    <v-list-group v-if="node.children && node.children.length > 0" :value="node.id">
        <template v-slot:activator="{ props: activatorProps }">
            <v-tooltip :text="node.title" location="end" open-delay="500" :open-on-focus="false">
                <template v-slot:activator="{ props: tooltipProps }">
                    <v-list-item v-bind="{ ...activatorProps, ...tooltipProps }"
                                 :id="`outline-item-${node.id}`"
                                 :data-outline-id="node.id"
                                 density="compact"
                                 @click="onSelect">
                        <v-list-item-title class="text-body-2">{{ node.title }}</v-list-item-title>
                    </v-list-item>
                </template>
            </v-tooltip>
        </template>
        <nav-outline-item v-for="child in node.children"
                            :key="child.id"
                            :node="child"
                            :selected-id="selectedId"
                            @select="onChildSelect" />
    </v-list-group>
    <v-tooltip v-else :text="node.title" location="end" open-delay="500" :open-on-focus="false">
        <template v-slot:activator="{ props: tooltipProps }">
            <v-list-item v-bind="tooltipProps"
                         :id="`outline-item-${node.id}`"
                         :data-outline-id="node.id"
                         density="compact"
                         @click="onSelect">
                <v-list-item-title class="text-body-2">{{ node.title }}</v-list-item-title>
            </v-list-item>
        </template>
    </v-tooltip>
</template>

<script lang="ts">
    import { Vue, Options } from 'vue-class-component'
    import type { PropType } from 'vue'
    import type { stringHTML } from '@/common/export/html/getHTML'

    // A single node of the document outline tree, built recursively from
    // anEntity instances connected via aTargetLink of class 'cas:lists':
    export interface OutlineNode {
        id: string
        title: string
        html: stringHTML
        children: OutlineNode[]
    }

    @Options({
        name: 'NavOutlineItem',
        props: {
            node: { type: Object as PropType<OutlineNode>, required: true },
            selectedId: { type: String as PropType<string | null>, default: null }
        },
        emits: ['select'],
        methods: {
            onSelect() {
                this.$emit('select', this.node.id)
            },
            onChildSelect(id: string) {
                this.$emit('select', id)
            }
        }
    })
    export default class NavOutlineItem extends Vue {
        node!: OutlineNode
        selectedId!: string | null
    }
</script>

<style scoped>
    /* Truncate titles that don't fit the pane's width with an ellipsis instead
       of wrapping or overflowing; the v-tooltip above shows the full title: */
    .text-body-2 {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* Native DOM focus is the single source of truth for the 'selected' item
       (see PageDocument.vue); style it grey instead of the browser/Vuetify
       default outline or highlight color: */
    :deep(.v-list-item:focus),
    :deep(.v-list-item:focus-visible) {
        outline: none !important;
        background-color: rgba(0, 0, 0, 0.12) !important;
    }

    :deep(.v-list-item:focus .v-list-item__overlay),
    :deep(.v-list-item:focus-visible .v-list-item__overlay) {
        opacity: 0 !important;
    }
</style>
