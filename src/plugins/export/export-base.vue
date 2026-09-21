<template>
    <v-btn color='secondary' variant='elevated' class='text-none export-btn' @click='openDialog'>{{ config.buttonLabel }}</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>{{ config.dialogTitle }}</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported.</p>
                    <v-text-field
                        v-model='filename'
                        label='Filename'
                        hint='Enter filename for the exported file'
                        persistent-hint
                        required
                        :rules='[rules.required, rules.extension]'
                        :disabled='isExporting'
                    ></v-text-field>

                    <!-- Optional export options (checkboxes), if configured -->
                    <div v-if='config.options && config.options.length' class='mt-4'>
                        <h4 class='mb-2'>Export Options</h4>
                        <v-checkbox v-for='option in config.options'
                                    :key='option.key'
                                    v-model='optionValues[option.key]'
                                    :label='option.label'
                                    density='compact'
                                    hide-details
                                    :disabled='isExporting'></v-checkbox>
                    </div>
                </div>

                <!-- Error Display -->
                <v-alert v-if='errorMessage'
                         type='error'
                         dismissible
                         class='mt-4'
                         @click:close='errorMessage = ""'>
                    {{ errorMessage }}
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
                <v-progress-linear v-if='isExporting'
                                   indeterminate
                                   color='primary'
                                   class='mt-4'></v-progress-linear>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn :color="isExporting ? undefined : 'grey'" variant='elevated' class='export-btn' @click='dialog = false' :disabled='isExporting'>
                    Cancel
                </v-btn>
                <v-btn
                    :color="(packageCount === 0 || !isFilenameValid || isExporting) ? undefined : 'primary'"
                    variant='elevated'
                    class='export-btn'
                    @click='exportPackages'
                    :disabled='packageCount === 0 || !isFilenameValid || isExporting'
                    :loading='isExporting'
                >
                    Export
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang='ts'>
import { Options, Vue } from 'vue-class-component';
import { toRaw } from 'vue';
import { PackageCache } from '@/stores/package-cache';
import { PLI } from '@/common/lib/platform-independence';
import { LIB, LOG } from '@/common/lib/helpers';
import { ExportConfig } from '@/plugins/export/export-config';

/**
 * Generic export dialog, driven by a format-specific ExportConfig (see export-config.ts).
 * Used by export-jsonld, export-xml, export-cypher and export-ttl via their respective
 * mount-export-*.ts files, which `extend` this component and supply the `config` prop.
 */
@Options({
    props: {
        config: {
            type: Object as () => ExportConfig,
            required: true
        }
    },
    data() {
        return {
            dialog: false,
            filename: '',
            packageCount: 0,
            isExporting: false,
            errorMessage: '',
            successMessage: '',
            optionValues: {} as Record<string, boolean>,
            rules: {
                required: (value: string) => !!value || 'Filename is required',
                extension: (value: string) => {
                    if (!value) return true;
                    const config = this.config as ExportConfig;
                    const hasExtension = config.validExtensions.some(ext => value.endsWith(ext));
                    return hasExtension || `Filename should end with ${config.validExtensions.join(' or ')}`;
                }
            }
        };
    },
    computed: {
        isFilenameValid(): boolean {
            const fn = this.filename as string;
            const config = this.config as ExportConfig;
            return fn.length > 0 && config.validExtensions.some(ext => fn.endsWith(ext));
        }
    },
    methods: {
        openDialog() {
            this.dialog = true;

            // Reset messages and state
            this.errorMessage = '';
            this.successMessage = '';
            this.isExporting = false;

            const config = this.config as ExportConfig;

            // Initialize option checkboxes with their configured defaults
            const initialOptions: Record<string, boolean> = {};
            (config.options || []).forEach(option => {
                initialOptions[option.key] = option.default ?? false;
            });
            this.optionValues = initialOptions;

            // Get packages and update count (already loaded from storage at app startup)
            const cache = PackageCache();
            const pkgs = cache.packages;

            this.packageCount = pkgs.length;

            const defaultExtension = config.validExtensions[0];

            // Set default filename from first package title
            if (LIB.isArrayWithContent(pkgs)) {
                // Use toRaw to unwrap Pinia's reactive proxy
                const firstPackage = toRaw(pkgs[0]);

                // Derive filename from package title or ID and remove invalid characters:
                const sanitized = config.getDefaultFilename
                    ? config.getDefaultFilename(firstPackage)
                    : LIB.makeFilename(firstPackage);
                this.filename = `${sanitized}${defaultExtension}`;
            } else {
                this.filename = `export${defaultExtension}`;
            }
        },

        /**
         * Combine the transformed results of multiple packages into a single
         * exportable value: string results are joined, object results are
         * returned as an array (unless there is only one, then unwrapped).
         */
        combineResults(results: (string | object)[]): string | object {
            if (results.length === 1) return results[0];
            if (results.every(r => typeof r === 'string')) return (results as string[]).join('\n\n');
            return results;
        },

        async exportPackages() {
            // Reset messages
            this.errorMessage = '';
            this.successMessage = '';
            this.isExporting = true;

            const config = this.config as ExportConfig;

            try {
                const cache = PackageCache();
                const pkgs = cache.packages;

                // Transform all packages using the format-specific transformFn
                // Use toRaw to unwrap Pinia's reactive proxies
                const transformed = pkgs.map((pkg: any) => config.transformFn(toRaw(pkg), this.optionValues));

                const exportData = this.combineResults(transformed);

                // Write to file (platform-independent)
                const result = await PLI.writeFile(exportData, this.filename);

                if (result.ok) {
                    this.successMessage = `Successfully exported ${pkgs.length} package(s) to ${this.filename}`;
                    LOG.info(`[${config.componentName}] Export successful:`, this.filename);

                    // Close dialog after short delay to show success message
                    setTimeout(() => {
                        this.dialog = false;
                    }, 1500);
                } else {
                    this.errorMessage = `Export failed: ${result.statusText}`;
                    LOG.error(`[${config.componentName}] Export failed:`, result.statusText);
                }
            } catch (error) {
                this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
                LOG.error(`[${config.componentName}] Export error:`, error);
            } finally {
                this.isExporting = false;
            }
        }
    }
})

export default class ExportBaseComponent extends Vue {
    config!: ExportConfig;
    dialog!: boolean;
    filename!: string;
    packageCount!: number;
    isExporting!: boolean;
    errorMessage!: string;
    successMessage!: string;
    optionValues!: Record<string, boolean>;
}
</script>
