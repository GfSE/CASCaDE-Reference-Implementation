<template>
    <v-btn color='secondary' class='text-none' @click='dialog = true'>ReqIF 🡕</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Select ReqIF Files</v-card-title>

            <v-card-text>
                <v-file-input v-model='selectedFiles'
                              accept='.reqif'
                              label='ReqIF Input'
                              prepend-icon='mdi-folder-open'
                              multiple
                              :loading='isLoading'
                              :disabled='isLoading'
                              hint='Select one or more ReqIF files to import'
                              persistent-hint></v-file-input>

                <!-- Error Display -->
                <v-alert v-if="errorMessages.length > 0"
                         type="error"
                         dismissible
                         class="mt-4">
                    <div v-for="(error, index) in errorMessages"
                         :key="index"
                         class="text-caption">
                        {{ error }}
                    </div>
                </v-alert>

                <!-- Success Display -->
                <v-alert v-if='successMessage'
                         type='success'
                         dismissible
                         class='mt-4'
                         @click:close='successMessage = ""'>
                    {{ successMessage }}
                </v-alert>

                <!-- Progress Indicator -->
                <v-progress-linear v-if='isLoading'
                                   indeterminate
                                   color='primary'
                                   class='mt-4'></v-progress-linear>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color='grey' @click='onCancel' :disabled='isLoading'>
                    Cancel
                </v-btn>
                <v-btn color='primary'
                       @click='onSubmit'
                       :disabled='!selectedFiles.length || isLoading'
                       :loading='isLoading'>
                    {{ submitLabel }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { DEF } from '@/common/lib/definitions';
    import { Options, Vue } from 'vue-class-component';
    import { ReqifImporter } from '@/common/import/reqif/import-reqif';
    import { TPigItem, APackage } from '@/common/schema/pig/ts/pig-metaclasses';
    import { PackageCache } from '@/stores/package-cache';
    import { LOG } from '@/common/lib/helpers';
    import { Msg, IRsp } from '@/common/lib/messages';

    @Options({
        data() {
            return {
                dialog: false,
                selectedFiles: [] as File[],
                isLoading: false,
                errorMessages: [] as string[],
                successMessage: ''
            };
        },
        computed: {
            /**
             * Label for the submit button: 'Replace' if the package cache already
             * holds data (in memory or persisted), otherwise 'Import'
             */
            submitLabel(): string {
                return PackageCache().hasData ? 'Replace' : 'Import';
            }
        },
        methods: {
            /**
             * Handle submit button click
             */
            async onSubmit() {
                if (!this.selectedFiles.length) {
                    this.errorMessages = ['Please select at least one file'];
                    return;
                }

                this.isLoading = true;
                this.errorMessages = [];
                this.successMessage = '';

                try {
                    // Import all files and collect results
                    const results = await this.importAllFiles();

                    // Separate successful and failed imports
                    // ✅ Type annotation hinzugefügt
                    const successful = results.filter((r: IRsp<unknown>) => r.ok);
                    const failed = results.filter((r: IRsp<unknown>) => !r.ok);

                    // Collect all packages from successful imports
                    const allPackages = successful.flatMap((r: IRsp<unknown>) => {
                        const allItems = r.response as TPigItem[];
                        return allItems[0] as APackage;
                    });

                    if (allPackages.length > 0) {
                        // Store in Pinia store with persistence (fully replaces any previous cache content)
                        const cache = PackageCache();
                        const persisted = await cache.replace(allPackages);

                        // Show success message
                        this.successMessage = `Successfully imported ${successful.length} of ${results.length} file(s)`;
                        if (!persisted) {
                            this.errorMessages = ['Warning: imported data could not be persisted to browser storage (IndexedDB). It may be lost after closing the browser tab.'];
                        }

                        this.logFailedImports(failed);

                        // Navigate to the document viewing page after short delay
                        setTimeout(async () => {
                            await this.$router.push({ name: 'Document' });
                            this.dialog = false;
                            this.onCancel();
                        }, DEF.timeBetweenPages);
                    } else {
                        this.logFailedImports(failed);
                    }

                } catch (error: any) {
                    this.errorMessages = [`Import failed: ${error?.message || String(error)}`];
                    LOG.error('Import error:', error);
                } finally {
                    this.isLoading = false;
                }
            },

            /**
             * Import all selected files
             * Returns array of IRsp results (one per file)
             */
            async importAllFiles(): Promise<IRsp<unknown>[]> {
                const results: IRsp<unknown>[] = [];

                for (const file of this.selectedFiles) {
                    try {
                        const rsp = await ReqifImporter.import(file);
                        results.push(rsp);
                    } catch (error: any) {
                        // Convert exception to IRsp format
                        results.push(Msg.create(600, `${file.name}: ${error?.message || String(error)}`));
                    }
                }

                return results;
            },

            logFailedImports(failed: IRsp<unknown>[]) {
                if (failed.length > 0) {
                    this.errorMessages = failed.map((r: IRsp<unknown>) =>
                        `${r.statusText || 'Unknown error'} (${r.status})`
                    );
                    // LOG.error('Failed imports:', failed);
                }
            },

            /**
             * Handle cancel button click
             */
            onCancel() {
                this.dialog = false;
                this.selectedFiles = [];
                this.errorMessages = [];
                this.successMessage = '';
            }
        }
    })

    export default class ReqifImportComponent extends Vue {
        dialog!: boolean;
        selectedFiles!: File[];
        isLoading!: boolean;
        errorMessages!: string[];
        successMessage!: string;
    }
</script>
