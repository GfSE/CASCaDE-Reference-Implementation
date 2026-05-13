<template>
    <v-btn color='secondary' @click='dialog = true'>Import XML</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Select XML Files</v-card-title>

            <v-card-text>
                <v-file-input v-model='selectedXmlFiles'
                              accept='.xml'
                              label='XML Input'
                              prepend-icon='mdi-folder-open'
                              multiple
                              :loading='isLoading'
                              :disabled='isLoading'
                              hint='Select one or more XML files to import'
                              persistent-hint>
                </v-file-input>
                <v-file-input v-model="selectedSefFile"
                              accept=".sef.json"
                              label="Optional SEF Input"
                              prepend-icon="mdi-file-code"
                              :loading="isLoading"
                              :disabled="isLoading"
                              hint="Optionally select a SEF file for XSL-Transformation"
                              persistent-hint
                              :multiple="false">
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
                <v-btn color='grey' @click='onCancel' :disabled='isLoading'>
                    Cancel
                </v-btn>
                <v-btn color='primary'
                       @click='onSubmit'
                       :disabled='!selectedXmlFiles.length || isLoading'
                       :loading='isLoading'>
                    Import
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
    import { Options, Vue } from 'vue-class-component';
    import { XmlImporter } from '@/common/import/xml/import-xml';
    import { TPigItem, APackage } from '@/common/schema/pig/ts/pig-metaclasses';
    import { stringHTML } from '@/common/export/html/exportHTML';
    import { useHtmlStore } from '@/stores/cacheStore';
    import { LOG } from '@/common/lib/helpers';
    import { Msg, IRsp } from '@/common/lib/messages';

    @Options({
        data() {
            return {
                dialog: false,
                selectedXmlFiles: [] as File[],
                selectedSefFile: null as File | null,
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
                if (!this.selectedXmlFiles.length) {
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
                    // @ToDo: results with 691 status (partial success) should be handled separately, but for now we treat them as failures:
                    const successful = results.filter((r: IRsp<unknown>) => r.ok);
                    const failed = results.filter((r: IRsp<unknown>) => !r.ok);

                    // Collect all HTML arrays from successful imports
                    const allHtmlArrays = successful.flatMap((r: IRsp<unknown>) => {
                        const allItems = r.response as TPigItem[];
                        const thePackage = allItems[0] as APackage;
                        return thePackage.getHTML() as stringHTML[];
                    });

                    if (allHtmlArrays.length > 0) {
                        // Store in Pinia store
                        const store = useHtmlStore();
                        store.htmlArray = allHtmlArrays;

                        // Show success message
                        this.successMessage = `Successfully imported ${successful.length} of ${results.length} file(s)`;

                        this.logFailedImports(failed);

                        // Navigate to the document viewing page after short delay
                        setTimeout(async () => {
                            await this.$router.push({ name: 'Document' });
                            this.dialog = false;
                            this.onCancel();
                        }, 1500);
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

                for (const file of this.selectedXmlFiles) {
                    try {
                        const options = this.selectedSefFile ? { sef: this.selectedSefFile } : undefined;
                        const rsp = await XmlImporter.import(file, options);
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
                // Try to extract filename from statusText
                const match = rsp.statusText?.match(/^([^:]+):/);
                return match ? match[1] : 'Unknown file';
            },

            logFailedImports(failed: IRsp<unknown>[]) {
                if (failed.length > 0) {
                    this.errorMessages = failed.map((r: IRsp<unknown>) =>
                        `${this.getFilenameFromResponse(r)}: ${r.statusText || 'Unknown error'}`
                    );
                    // LOG.error('Failed imports:', failed);
                }
            },

            /**
             * Handle cancel button click
             */
            onCancel() {
                this.dialog = false;
                this.selectedXmlFiles = [];
                this.selectedSefFile = null;
                this.errorMessages = [];
                this.successMessage = '';
            }
        }
    })

    export default class XmlImportComponent extends Vue {
        dialog!: boolean;
        selectedXmlFiles!: File[];
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
