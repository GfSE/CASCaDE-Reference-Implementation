<template>
    <v-btn color='secondary' variant='elevated' class='text-none import-btn' @click='dialog = true'>{{ config.buttonLabel }}</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>{{ config.dialogTitle }}</v-card-title>

            <v-card-text>
                <v-file-input v-model='selectedFiles'
                              :accept='config.accept'
                              :label='config.inputLabel'
                              prepend-icon='mdi-folder-open'
                              multiple
                              :loading='isLoading'
                              :disabled='isLoading'
                              :hint='config.hint'
                              persistent-hint></v-file-input>

                <!-- Optional second, single-file input (e.g. a SEF file for XSL-Transformation) -->
                <v-file-input v-if='config.secondFile'
                              v-model='selectedSecondFile'
                              :accept='config.secondFile.accept'
                              :label='config.secondFile.label'
                              :prepend-icon='config.secondFile.icon || "mdi-file-code"'
                              :loading='isLoading'
                              :disabled='isLoading'
                              :hint='config.secondFile.hint'
                              persistent-hint
                              :multiple='false'></v-file-input>

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
                <v-btn :color="isLoading ? undefined : 'grey'" variant='elevated' class='import-btn' @click='onCancel' :disabled='isLoading'>
                    Cancel
                </v-btn>
                <v-btn :color="isSubmitDisabled ? undefined : 'primary'"
                       variant='elevated'
                       class='import-btn'
                       @click='onSubmit'
                       :disabled='isSubmitDisabled'
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
    import { TPigItem, APackage } from '@/common/schema/pig/ts/pig-metaclasses';
    import { PackageCache } from '@/stores/package-cache';
    import { LOG } from '@/common/lib/helpers';
    import { Msg, IRsp } from '@/common/lib/messages';
    import { ImportConfig } from '@/plugins/import/import-config';

    /**
     * Generic import dialog, driven by a format-specific ImportConfig
     * (see import-config.ts). Used by import-jsonld, import-xml, import-fmi
     * and import-reqif via their respective mount-import-*.ts files, which
     * `extend` this component and supply the `config` prop.
     */
    @Options({
        props: {
            config: {
                type: Object as () => ImportConfig,
                required: true
            }
        },
        data() {
            return {
                dialog: false,
                selectedFiles: [] as File[],
                selectedSecondFile: null as File | null,
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
            },

            /**
             * Whether the submit button should be disabled: no files selected,
             * an import is already running, or a required second file is missing
             */
            isSubmitDisabled(): boolean {
                const config = this.config as ImportConfig;
                return !this.selectedFiles.length
                    || this.isLoading
                    || !!(config.secondFile && config.secondFile.required !== false && !this.selectedSecondFile);
            }
        },
        methods: {
            /**
             * Handle submit button click
             */
            async onSubmit() {
                const config = this.config as ImportConfig;
                const errors: string[] = [];
                if (!this.selectedFiles.length) {
                    errors.push('Please select at least one file');
                }
                if (config.secondFile && config.secondFile.required !== false && !this.selectedSecondFile) {
                    errors.push(config.secondFile.requiredMessage || `Please select a ${config.secondFile.label}`);
                }
                if (errors.length > 0) {
                    this.errorMessages = errors;
                    return;
                }

                this.isLoading = true;
                this.errorMessages = [];
                this.successMessage = '';

                try {
                    // Import all files and collect results
                    const results = await this.importAllFiles();

                    // Separate successful and failed imports
                    // @ToDo: results with 603 status (partial success) should be handled separately, but for now we treat them as failures:
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
                        const rsp = await (this.config as ImportConfig).importFn(file, this.selectedSecondFile);
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
                this.selectedSecondFile = null;
                this.errorMessages = [];
                this.successMessage = '';
            }
        }
    })

    export default class ImportBaseComponent extends Vue {
        config!: ImportConfig;
        dialog!: boolean;
        selectedFiles!: File[];
        selectedSecondFile!: File | null;
        isLoading!: boolean;
        errorMessages!: string[];
        successMessage!: string;
    }
</script>
