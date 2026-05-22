<template>
    <v-container fluid class="fill-height">
        <v-row class="fill-height">
            <!-- LEFT PANE -->
            <v-col cols="3" class="fill-height">
                <v-card class="pane-card">
                    <v-card-title tag="h2">Outline</v-card-title>
                    <v-divider />
                    <div class="pane-scroll pa-0">
                        <v-list density="compact">
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
    import { toRaw } from 'vue'
    import { usePackageCache } from '@/stores/packageCache'
    import { getHTML, stringHTML } from '@/common/export/html/getHTML'
    import { APackage } from '@/common/schema/pig/ts/pig-metaclasses'

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
            htmlArray(): stringHTML[] {
                const cache = usePackageCache()
                const packages = cache.packages

                if (!packages || packages.length === 0) {
                    return []
                }

                // Convert all packages to HTML arrays and flatten into single array
                const result: stringHTML[] = []
                for (const pkg of packages) {
                    // Use toRaw to unwrap Pinia's reactive proxy
                    const rawPkg = toRaw(pkg) as APackage
                    const htmlItems = getHTML(rawPkg)
                    result.push(...htmlItems)
                }
                return result
            },

            selectedHtml(): stringHTML | null {
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

    .pane-scroll :deep(.v-list-item) {
        min-height: 24px !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
    }
</style>
