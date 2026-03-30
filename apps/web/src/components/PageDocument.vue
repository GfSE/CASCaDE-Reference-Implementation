<template>
    <v-container fluid class="fill-height">
        <v-row class="fill-height">
            <!-- LEFT PANE -->
            <v-col cols="3" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Document Outline</v-card-title><!-- later: Title of tree root -->
                    <v-divider />
                    <div class="pane-scroll pa-0">
                        <v-list>
                            <v-list-item v-for="(item, index) in htmlArray"
                                         :key="index"
                                         @click="selectItem(index)"
                                         :active="selectedIndex === index">
                                <v-list-item-title class="text-body-2">
                                    <div v-if="extractTitle(item)" v-html="extractTitle(item)"></div>
                                    <div v-else>Item {{ index + 1 }}</div>
                                </v-list-item-title>
                            </v-list-item>
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
    import { useHtmlStore } from '@/stores/cacheStore'

    function extractTitle(html: string): string | null {
        const match = html.match(/<[^>]*class=["'][^"']*meta-title[^"']*["'][^>]*>(.*?)<\/[^>]+>/i);
        return match ? match[1] : null;
    }

    @Options({
        name: 'PageDocument',
        data() {
            return {
                selectedIndex: null as number | null
            }
        },
        computed: {
            htmlArray(): string[] {
                const store = useHtmlStore()
                const value = store.htmlArray
                if (!value) return []
                return Array.isArray(value) ? value : [value]
            },

            selectedHtml(): string | null {
                if (this.selectedIndex === null) return null
                return this.htmlArray[this.selectedIndex] ?? null
            }
        },
        methods: {
            selectItem(index: number) {
                this.selectedIndex = index
            },
            extractTitle
        },
        mounted() {
            // Select the first item when opening the view:
            if (this.htmlArray.length > 0) {
                this.selectedIndex = 0
            }
        }
    })

    export default class PageDocument extends Vue { }
</script>

<style scoped>
    .fill-height {
        height: 100vh !important;
        min-height: 0 !important;
        max-height: 100vh !important;
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
</style>
