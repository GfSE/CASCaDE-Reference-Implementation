<template>
    <v-dialog v-model="dialog" max-width="600" persistent>
        <v-card>
            <v-card-title>Import from URL</v-card-title>

            <v-card-text>
                <div class="text-caption mb-2">{{ sourceUrl }}</div>

                <!-- Error Display -->
                <v-alert v-if="errorMessages.length > 0"
                         type="error"
                         dismissible
                         class="mt-2">
                    <div v-for="(error, index) in errorMessages"
                         :key="index"
                         class="text-caption">
                        {{ error }}
                    </div>
                </v-alert>

                <!-- Success Display -->
                <v-alert v-if="successMessage"
                         type="success"
                         dismissible
                         class="mt-2"
                         @click:close="successMessage = ''">
                    {{ successMessage }}
                </v-alert>

                <!-- Progress Indicator -->
                <v-progress-linear v-if="isLoading"
                                   indeterminate
                                   color="primary"
                                   class="mt-4">
                </v-progress-linear>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="grey" variant="elevated" @click="dialog = false" :disabled="isLoading">
                    Close
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { Options, Vue } from 'vue-class-component';
    import { DEF } from '@cascara/common/lib/definitions';
    import { TPigItem } from '@cascara/common/schema/pig/ts/pig-metaclasses';
    import { ItemCache } from '@/stores/item-cache';
    import { AssetCache } from '@/stores/asset-cache';
    import { IRsp, LOG } from '@cascara/common/lib/messages';
    import { JsonldImporter } from '@cascara/common/import/jsonld/import-jsonld';
    import { XmlImporter } from '@cascara/common/import/xml/import-xml';
    import { ReqifImporter } from '@cascara/common/import/reqif/import-reqif';

    type UrlImportFn = (url: string) => Promise<IRsp<unknown>[]>;

    /**
     * Maps supported file extensions (checked against the URL, ignoring any
     * query/fragment) to the importer responsible for them. Mirrors the
     * per-format 'accept' lists configured in the import-* mount plugins
     * (see import-config.ts).
     */
    const urlImporters: { suffixes: string[]; importFn: UrlImportFn }[] = [
        { suffixes: ['.cas.jsonld.zip', '.cas.jsonld'], importFn: (url: string) => JsonldImporter.import(url) },
        { suffixes: ['.cas.xml.zip', '.cas.xml'], importFn: (url: string) => XmlImporter.import(url, undefined) },
        { suffixes: ['.reqif.zip', '.reqifz', '.reqif'], importFn: (url: string) => ReqifImporter.import(url) }
    ];

    /**
     * Finds the importer matching a URL's file extension (query/fragment ignored).
     */
    function findImporter(url: string): UrlImportFn | null {
        const normalized = url.split(/[?#]/, 1)[0].toLowerCase();
        const entry = urlImporters.find(e => e.suffixes.some(suffix => normalized.endsWith(suffix)));
        return entry ? entry.importFn : null;
    }

    /**
     * Strips a single matching pair of surrounding quotes from a query value,
     * as used in the example 'path/document?update="https://.../ex.cas.jsonld"'.
     */
    function unquote(value: string): string {
        const trimmed = value.trim();
        if (trimmed.length >= 2 &&
            ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\'') && trimmed.endsWith('\'')))) {
            return trimmed.slice(1, -1);
        }
        return trimmed;
    }

    /**
     * Watches the current route for query parameters that trigger commands, e.g.
     * an 'update' or 'replace' command carrying a file URL (fully qualified or
     * relative), e.g.:
     * path/document?update="https://product-information-graph.org/examples/ex.cas.jsonld"
     *
     * Supported file types: *.cas.jsonld, *.cas.jsonld.zip, *.cas.xml, *.cas.xml.zip,
     * *.reqif, *.reqifz, *.reqif.zip.
     *
     * Once detected, the referenced file is downloaded and processed like the import
     * dialogs (see import-base.vue): 'update' merges into the existing cache, 'replace'
     * fully replaces it. Progress and success/error messages are shown in this modal dialog.
     *
     * More URL-triggered commands are expected to follow and should be added here.
     */
    @Options({
        data() {
            return {
                dialog: false,
                isLoading: false,
                sourceUrl: '',
                errorMessages: [] as string[],
                successMessage: ''
            };
        },
        watch: {
            '$route.query': {
                immediate: true,
                handler(query: Record<string, any>) {
                    this.checkQuery(query);
                }
            }
        },
        methods: {
            /**
             * Detects an 'update'/'replace' query parameter and, if present, strips it
             * from the URL (so a later re-render or navigation doesn't re-trigger it)
             * and starts the import.
             */
            checkQuery(query: Record<string, any>) {
                if (this.isLoading || !query) return;

                const mode: 'update' | 'replace' | null =
                    query.update !== undefined ? 'update' : (query.replace !== undefined ? 'replace' : null);
                if (!mode) return;

                const url = unquote(String(query[mode]));

                const newQuery = { ...query };
                delete newQuery.update;
                delete newQuery.replace;
                this.$router.replace({ query: newQuery });

                this.runImport(url, mode);
            },

            /**
             * Downloads and imports the file at 'url', then persists the result to
             * ItemCache, mirroring import-base.vue's onSubmit() behavior.
             */
            async runImport(url: string, mode: 'update' | 'replace') {
                this.dialog = true;
                this.isLoading = true;
                this.sourceUrl = url;
                this.errorMessages = [];
                this.successMessage = '';

                try {
                    const importFn = findImporter(url);
                    if (!importFn) {
                        this.errorMessages = [`Unsupported file type: ${url}`];
                        return;
                    }

                    // See the note in import-base.vue's onSubmit(): the asset cache must be
                    // cleared before importing, not after, since importers persist newly
                    // extracted assets as part of the import itself.
                    if (mode === 'replace') {
                        await AssetCache().clear();
                    }

                    let results: IRsp<unknown>[];
                    try {
                        results = await importFn(url);
                    } catch (error: any) {
                        results = [{ status: 600, statusText: `${url}: ${error?.message || String(error)}`, ok: false }];
                    }

                    const successful = results.filter((r: IRsp<unknown>) => r.ok);
                    const failed = results.filter((r: IRsp<unknown>) => !r.ok);
                    if (failed.length > 0) {
                        this.errorMessages = failed.map((r: IRsp<unknown>) => `${r.statusText || 'Unknown error'} (${r.status})`);
                        LOG.error('URL import errors:', failed);
                    }

                    const cache = ItemCache();
                    if (successful.length > 0) {
                        let allPersisted = true;
                        for (let i = 0; i < successful.length; i++) {
                            const items = successful[i].response as TPigItem[];
                            const cacheMode = i === 0 ? mode : 'update';
                            const persisted = cacheMode === 'update'
                                ? await cache.update(items)
                                : await cache.replace(items);
                            allPersisted = allPersisted && persisted;
                        }

                        if (allPersisted) {
                            const action = mode === 'update' ? 'updated' : 'imported';
                            this.successMessage = `Successfully ${action} ${successful.length} of ${results.length} package(s) from URL`;
                        } else {
                            this.errorMessages.push('Warning: imported data could not be persisted to browser storage (IndexedDB). It may be lost after closing the browser tab.');
                        }

                        setTimeout(async () => {
                            await this.$router.push({ name: 'Document' });
                        }, DEF.timeBetweenPages);
                    }
                    else if (mode === 'replace' /* && failed.length > 0 */) {
                        // If all imports failed, clear the cache to avoid leaving stale data behind
                        await cache.clear();
                    }

                } catch (error: any) {
                    this.errorMessages = [`Import failed: ${error?.message || String(error)}`];
                    LOG.error('URL import error:', error);
                } finally {
                    this.isLoading = false;
                }
            }
        }
    })
    export default class UrlQueries extends Vue {
        dialog!: boolean;
        isLoading!: boolean;
        sourceUrl!: string;
        errorMessages!: string[];
        successMessage!: string;
    }
</script>
