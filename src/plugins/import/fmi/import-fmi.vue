<template>
    <v-btn color='secondary' @click='dialog = true'>Import FMI</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Select FMI Files</v-card-title>

            <v-card-text>
                <v-file-input v-model='selectedFiles'
                              accept='.fmu,.xml'
                              label='FMI Input'
                              prepend-icon='mdi-folder-open'
                              multiple
                              :loading='isLoading'
                              :disabled='isLoading'
                              hint='Select one or more FMU archives (.fmu) or modelDescription.xml files'
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
                    Import
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { DEF } from '@/common/lib/definitions';
    import { Options, Vue } from 'vue-class-component';
    import { FmiImporter } from '@/common/import/fmi/import-fmi';
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
                    const results = await this.importAllFiles();

                    const successful = results.filter((r: IRsp<unknown>) => r.ok);
                    const failed = results.filter((r: IRsp<unknown>) => !r.ok);

                    const allPackages = successful.flatMap((r: IRsp<unknown>) => {
                        const allItems = r.response as TPigItem[];
                        return allItems[0] as APackage;
                    });

                    if (allPackages.length > 0) {
                        const cache = PackageCache();
                        cache.set(allPackages);

                        this.successMessage = `Successfully imported ${successful.length} of ${results.length} file(s)`;

                        this.logFailedImports(failed);

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
                        const rsp = await FmiImporter.import(file);
                        results.push(rsp);
                    } catch (error: any) {
                        results.push(Msg.create(600, `${file.name}: ${error?.message || String(error)}`));
                    }
                }

                return results;
            },

            /**
             * Extract filename from IRsp response for error messages
             */
            getFilenameFromResponse(rsp: IRsp<unknown>): string {
                const match = rsp.statusText?.match(/^([^:]+):/);
                return match ? match[1] : 'Unknown file';
            },

            logFailedImports(failed: IRsp<unknown>[]) {
                if (failed.length > 0) {
                    this.errorMessages = failed.map((r: IRsp<unknown>) =>
                        `${this.getFilenameFromResponse(r)}: ${r.statusText || 'Unknown error'}`
                    );
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

    export default class FmiImportComponent extends Vue {
        dialog!: boolean;
        selectedFiles!: File[];
        isLoading!: boolean;
        errorMessages!: string[];
        successMessage!: string;
    }
</script>

<style scoped>
    .v-card {
        padding: 1rem;
    }

    .v-card-title {
        font-size: 1.5rem;
        font-weight: 500;
    }

    .v-alert {
        white-space: pre-line;
    }
</style>
