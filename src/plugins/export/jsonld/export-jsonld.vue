<template>
    <v-btn color='secondary' @click='openDialog'>Export JSON-LD</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Export Packages as JSON-LD</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported.</p>
                    <v-text-field
                        v-model='filename'
                        label='Filename'
                        hint='Enter filename for the exported JSON-LD file'
                        persistent-hint
                        required
                        :rules='[rules.required, rules.extension]'
                        :disabled='isExporting'
                    ></v-text-field>
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
                <v-btn color='grey' @click='dialog = false' :disabled='isExporting'>Cancel</v-btn>
                <v-btn 
                    color='primary' 
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
import { PackageCache } from '../../../stores/package-cache';
import { getJSONLD } from '../../../common/export/jsonld/getJSONLD';
import { PLI } from '../../../common/lib/platform-independence';
import { LOG } from '../../../common/lib/helpers';

@Options({
  data() {
    return {
        dialog: false,
        filename: '',
        packageCount: 0,
        isExporting: false,
        errorMessage: '',
        successMessage: '',
        rules: {
            required: (value: string) => !!value || 'Filename is required',
            extension: (value: string) => {
                if (!value) return true;
                const hasExtension = value.includes('.jsonld') || value.includes('.json');
                return hasExtension || 'Filename should end with .jsonld or .json';
            }
        }
    }
  },
  computed: {
    isFilenameValid(): boolean {
        const fn = this.filename as string;
        return fn.length > 0 && (fn.includes('.jsonld') || fn.includes('.json'));
    }
  },
  methods: {
    openDialog() {
        this.dialog = true;

        // Reset messages and state
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = false;

        // Get packages and update count
        const cache = PackageCache();

        // Load from storage if cache is empty
        if (cache.packages.length === 0) {
            LOG.info('[Export JSON-LD] Cache is empty, loading from storage...');
            cache.loadFromStorage();
        }

        const pkgs = cache.packages;

     /*   // Debug output
        LOG.debug('[Export JSON-LD] packageCache:', cache);
        LOG.debug('[Export JSON-LD] packages:', pkgs);
        LOG.debug('[Export JSON-LD] packages.length:', pkgs.length);
    */

        this.packageCount = pkgs.length;

        // Set default filename from first package title
        if (pkgs && pkgs.length > 0) {
            // Use toRaw to unwrap Pinia's reactive proxy
            const firstPackage = toRaw(pkgs[0]);

            // Handle multilingual title field
            let titleText: string;
            if (typeof firstPackage.title === 'string') {
                titleText = firstPackage.title;
            } else if (Array.isArray(firstPackage.title) && firstPackage.title.length > 0) {
                titleText = firstPackage.title[0].value;
            } else {
                titleText = firstPackage.id || 'export';
            }

            // Sanitize filename: remove invalid characters
            const sanitized = titleText.replace(/[<>:"/\\|?*]/g, '_');
            this.filename = `${sanitized}.jsonld`;
        } else {
            this.filename = 'export.jsonld';
        }
    },
    async exportPackages() {
        // Reset messages
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = true;

        try {
            const cache = PackageCache();
            const pkgs = cache.packages;

            // Transform all packages to JSON-LD
            // Use toRaw to unwrap Pinia's reactive proxies
            const jsonldPackages = pkgs.map((pkg: any) => {
                const rawPkg = toRaw(pkg);
                return getJSONLD(rawPkg, { stringify: false });
            });

            // If single package, export directly; if multiple, wrap in array
            const exportData = jsonldPackages.length === 1 
                ? jsonldPackages[0] 
                : jsonldPackages;

            // Write to file using PLI
            const result = await PLI.writeFile(exportData, this.filename);

            if (result.ok) {
                this.successMessage = `Successfully exported ${pkgs.length} package(s) to ${this.filename}`;
                LOG.info('[Export JSON-LD] Export successful:', this.filename);

                // Close dialog after short delay to show success message
                setTimeout(() => {
                    this.dialog = false;
                }, 1500);
            } else {
                this.errorMessage = `Export failed: ${result.statusText}`;
                LOG.error('[Export JSON-LD] Export failed:', result.statusText);
            }
        } catch (error) {
            this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
            LOG.error('[Export JSON-LD] Export error:', error);
        } finally {
            this.isExporting = false;
        }
    }
  }
})

export default class JsonExportComponent extends Vue {}
</script>

<style scoped>
.mb-4 {
    margin-bottom: 16px;
}

.mt-4 {
    margin-top: 16px;
}

.v-alert {
    white-space: pre-line;
}
</style>
