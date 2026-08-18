<template>
    <v-list-group v-if="node.children && node.children.length > 0" :value="node.id">
        <template v-slot:activator="{ props: activatorProps }">
            <v-list-item v-bind="activatorProps"
                         density="compact"
                         :active="selectedId === node.id"
                         @click="onSelect">
                <v-list-item-title class="text-body-2">{{ node.title }}</v-list-item-title>
            </v-list-item>
        </template>
        <outline-tree-item v-for="child in node.children"
                            :key="child.id"
                            :node="child"
                            :selected-id="selectedId"
                            @select="onChildSelect" />
    </v-list-group>
    <v-list-item v-else
                 density="compact"
                 :active="selectedId === node.id"
                 @click="onSelect">
        <v-list-item-title class="text-body-2">{{ node.title }}</v-list-item-title>
    </v-list-item>
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
        name: 'OutlineTreeItem',
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
    export default class OutlineTreeItem extends Vue {
        node!: OutlineNode
        selectedId!: string | null
    }
</script>
