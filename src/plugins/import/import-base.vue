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
                             *       multiple
                              :loading='isLoading'
                              :disabled='isLoading'
                              :hint='config.hint'
                              persistent-hint>
                </v-file-input>

                <!-- Optional auxiliary single-file input (e.g. a SEF file for XSL-Transformation) -->
                <v-file-input v-if='config.auxiliaryFile'
                              v-model='selectedAuxiliaryFile'
                              :accept='config.auxiliaryFile.accept'
                              :label='config.auxiliaryFile.label'
                              :prepend-icon='config.auxiliaryFile.icon || "mdi-file-code"'
                              :loading='isLoading'
                              :disabled='isLoading'
                              :hint='config.auxiliaryFile.hint'
                              persistent-hint
                              :multiple='false'>
                </v-file-input>

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
                                   class='mt-4'>
                </v-progress-linear>
            </v-card-text>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn :color="isLoading ? undefined : 'grey'" variant='elevated' class='import-btn' @click='onCancel' :disabled='isLoading'>
                    Cancel
                </v-btn>
                <template v-if='hasCachedData'>
                    <v-btn :color="isSubmitDisabled ? undefined : 'primary'"
                           variant='elevated'
                           class='import-btn'
                           @click='onSubmit("replace")'
                           :disabled='isSubmitDisabled'
                           :loading="isLoading && submitMode === 'replace'">
                        Replace
                    </v-btn>
                    <v-btn :color="isSubmitDisabled ? undefined : 'primary'"
                           variant='elevated'
                           class='import-btn'
                           @click='onSubmit("update")'
                           :disabled='isSubmitDisabled'
                           :loading="isLoading && submitMode === 'update'">
                        Update
                    </v-btn>
                </template>
                <v-btn v-else
                       :color="isSubmitDisabled ? undefined : 'primary'"
                       variant='elevated'
                       class='import-btn'
                       @click='onSubmit("replace")'
                       :disabled='isSubmitDisabled'
                       :loading='isLoading'>
                    Import
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { DEF } from '@/common/lib/definitions';
    import { Options, Vue } from 'vue-class-component';
    import { TPigItem, APackage } from '@/common/schema/pig/ts/pig-metaclasses';
    import { ItemCache } from '@/stores/item-cache';
    import { LOG } from '@/common/lib/helpers';
    import { Msg, IRsp } from '@/common/lib/messages';
    import { ImportConfig } from '@/plugins/import/import-config';

    /**
     * Generic import dialog, driven by a format-specific ImportConfig (see import-config.ts).
     * Used by import-jsonld, import-xml, import-fmi and import-reqif via their respective mount-import-*.ts files, 
     * which `extend` this component and supply the `config` prop.
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
                selectedAuxiliaryFile: null as File | null,
                isLoading: false,
                submitMode: null as 'replace' | 'update' | null,
                errorMessages: [] as string[],
                successMessage: ''
            };
        },
        computed: {
            /**
             * Whether the item cache already holds data (in memory or persisted).
             * Drives which submit button(s) are shown: 'Import' when empty,
             * 'Replace' and 'Update' when the cache already holds data.
             */
            hasCachedData(): boolean {
                return ItemCache().hasData;
            },

            /**
             * Whether the submit button should be disabled: no files selected,
             * an import is already running, or a required second file is missing
             */
            isSubmitDisabled(): boolean {
                const config = this.config as ImportConfig;
                return !this.selectedFiles.length
                    || this.isLoading
                    || !!(config.auxiliaryFile && config.auxiliaryFile.required !== false && !this.selectedAuxiliaryFile);
            }
        },
        methods: {
            /**
             * Handle submit button click
             * @param mode 'replace' fully replaces the cache (used for the 'Import' and 'Replace'
             *             buttons), 'update' merges the imported items into the existing cache,
             *             preserving object identity of already-cached, unchanged items (see
             *             ItemCache.update()).
             */
            async onSubmit(mode: 'replace' | 'update') {
                const config = this.config as ImportConfig;
                const errors: string[] = [];
                if (!this.selectedFiles.length) {
                    errors.push('Please select at least one file');
                }
                if (config.auxiliaryFile && config.auxiliaryFile.required !== false && !this.selectedAuxiliaryFile) {
                    errors.push(config.auxiliaryFile.requiredMessage || `Please select a ${config.auxiliaryFile.label}`);
                }
                if (errors.length > 0) {
                    this.errorMessages = errors;
                    return;
                }

                this.isLoading = true;
                this.submitMode = mode;
                this.errorMessages = [];
                this.successMessage = '';

                try {
                    // Import all files (outer loop) and all ZIP entries within each file (inner loop,
                    // handled inside the importer itself); results are one entry per imported package.
                    const results = await this.importAllFiles();

                    // Separate successful and failed imports
                    // @ToDo: results with 603 status (partial success) should be handled separately, but for now we treat them as failures:
                    const successful = results.filter((r: IRsp<unknown>) => r.ok);
                    const failed = results.filter((r: IRsp<unknown>) => !r.ok);
                    this.logFailedImports(failed);

                    if (successful.length > 0) {
                        // Store each package in the cache sequentially: the first package uses the
                        // mode selected via the clicked button ('replace' or 'update'), every
                        // following package is merged via 'update' so it doesn't wipe out packages
                        // already written to the cache during this same import operation.
                        const cache = ItemCache();
                        let allPersisted = true;
                        for (let i = 0; i < successful.length; i++) {
                            const items = successful[i].response as TPigItem[];
                            // LOG.debug('Imported items:', items);
                            const packageMode = i === 0 ? mode : 'update';
                            const persisted = packageMode === 'update'
                                ? await cache.update(items)
                                : await cache.replace(items);
                            allPersisted = allPersisted && persisted;
                        }

                        if (allPersisted) {
                            const action = mode === 'update' ? 'updated' : 'imported';
                            this.successMessage = `Successfully ${action} ${successful.length} of ${results.length} package(s)`;
                        } else {
                            this.errorMessages = ['Warning: imported data could not be persisted to browser storage (IndexedDB). It may be lost after closing the browser tab.'];
                        }

                        // Navigate to the document viewing page after short delay
                        setTimeout(async () => {
                            await this.$router.push({ name: 'Document' });
                            this.dialog = false;
                            this.onCancel();
                        }, DEF.timeBetweenPages);
                    }

                } catch (error: any) {
                    this.errorMessages = [`Import failed: ${error?.message || String(error)}`];
                    LOG.error('Import error:', error);
                } finally {
                    this.isLoading = false;
                    this.submitMode = null;
                }
            },

            /**
             * Import all selected files (outer loop). Each file may itself expand into
             * several packages if it is a ZIP archive containing multiple matching entries
             * (inner loop, handled inside the format-specific importer).
             * Returns a flattened array of IRsp results, one per imported package.
             */
            async importAllFiles(): Promise<IRsp<unknown>[]> {
                const results: IRsp<unknown>[] = [];

                for (const file of this.selectedFiles) {
                    try {
                        const rspList = await (this.config as ImportConfig).importFn(file, this.selectedAuxiliaryFile);
                        results.push(...rspList);
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
                this.selectedAuxiliaryFile = null;
                this.submitMode = null;
                this.errorMessages = [];
                this.successMessage = '';
            }
        }
    })

    export default class ImportBaseComponent extends Vue {
        config!: ImportConfig;
        dialog!: boolean;
        selectedFiles!: File[];
        selectedAuxiliaryFile!: File | null;
        isLoading!: boolean;
        submitMode!: 'replace' | 'update' | null;
        errorMessages!: string[];
        successMessage!: string;
    }
</script>
