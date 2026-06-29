<template>
    <v-btn color='secondary' @click='openDialog'>Export Turtle (TTL)</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Export Packages as Turtle (TTL)</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported.</p>
                    <v-text-field
                        v-model='filename'
                        label='Filename'
                        hint='Enter filename for the exported TTL file'
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
import { getTTL } from '../../../common/export/ttl/getTTL';
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
                const hasExtension = value.endsWith('.ttl');
                return hasExtension || 'Filename should end with .ttl';
            }
        }
    }
  },
  computed: {
    isFilenameValid(): boolean {
        const fn = this.filename as string;
        return fn.length > 0 && fn.endsWith('.ttl');
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
            LOG.info('[Export TTL] Cache is empty, loading from storage...');
            cache.loadFromStorage();
        }

        const pkgs = cache.packages;

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
            this.filename = `${sanitized}.ttl`;
        } else {
            this.filename = 'export.ttl';
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

            // Transform all packages to TTL
            // Use toRaw to unwrap Pinia's reactive proxies
            const ttlPackages = pkgs.map((pkg: any) => {
                const rawPkg = toRaw(pkg);
                return getTTL(rawPkg, { addServedOntologies: true, addItemTypes: true });
            });

            // Combine all TTL strings with line breaks
            const exportData = ttlPackages.join('\n\n');

            // Write to file using PLI
            const result = await PLI.writeFile(exportData, this.filename);

            if (result.ok) {
                this.successMessage = `Successfully exported ${pkgs.length} package(s) to ${this.filename}`;
                LOG.info('[Export TTL] Export successful:', this.filename);

                // Close dialog after short delay to show success message
                setTimeout(() => {
                    this.dialog = false;
                }, 1500);
            } else {
                this.errorMessage = `Export failed: ${result.statusText}`;
                LOG.error('[Export TTL] Export failed:', result.statusText);
            }
        } catch (error) {
            this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
            LOG.error('[Export TTL] Export error:', error);
        } finally {
            this.isExporting = false;
        }
    }
  }
})

export default class TtlExportComponent extends Vue {}
</script>

<style scoped>
.mb-4 {
    margin-bottom: 16px;
}

.mt-4 {
    margin-top: 16px;
}
</style>
