<template>
    <v-btn color='primary' @click='dialog = true'>Import ReqIF</v-btn>
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
                <v-alert v-if='errorMessages.length > 0'
                         type='error'
                         dismissible
                         class='mt-4'
                         @click:close='errorMessages = []'>
                    <div v-for='(error, index) in errorMessages' :key='index'>
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
    import { Options, Vue } from 'vue-class-component';
    import { importReqif } from '@/utils/import/ReqIF/import-reqif';
    import { TPigItem, APackage, stringHTML } from '@/utils/schemas/pig/ts/pig-metaclasses';
    import { useHtmlStore } from '@/stores/cacheStore';
    import { IRsp } from '@/utils/lib/messages';

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
                    // Import all files and collect results
                    const results = await this.importAllFiles();

                    // Separate successful and failed imports
                    // ✅ Type annotation hinzugefügt
                    const successful = results.filter((r: IRsp<unknown>) => r.ok);
                    const failed = results.filter((r: IRsp<unknown>) => !r.ok);

                    // Collect all HTML arrays from successful imports
                    // ✅ Type annotation hinzugefügt
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

                        // Log failed imports
                        if (failed.length > 0) {
                            // ✅ Type annotation hinzugefügt
                            this.errorMessages = failed.map((r: IRsp<unknown>) =>
                                `${this.getFilenameFromResponse(r)}: ${r.statusText || 'Unknown error'}`
                            );
                            console.error('Failed imports:', failed);
                        }

                        // Navigate to viewing page after short delay
                        setTimeout(async () => {
                            await this.$router.push({ name: 'Viewing' });
                            this.dialog = false;
                            this.onCancel();
                        }, 1500);
                    } else {
                        this.errorMessages = ['No files were successfully imported'];
                    }

                } catch (error: any) {
                    this.errorMessages = [`Import failed: ${error?.message || String(error)}`];
                    console.error('Import error:', error);
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
                        const rsp = await importReqif(file);
                        results.push(rsp);
                    } catch (error: any) {
                        // Convert exception to IRsp format
                        results.push({
                            ok: false,
                            status: 500,
                            statusText: `${file.name}: ${error?.message || String(error)}`,
                            responseType: 'json'
                        });
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
