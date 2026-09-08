<template>
    <v-btn color='secondary' class='text-none' @click='openDialog'>🡖 CASCaRA XML</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Export Packages as XML</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported.</p>
                    <v-text-field
                        v-model='filename'
                        label='Filename'
                        hint='Enter filename for the exported XML file'
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
import { getXML } from '../../../common/export/xml/getXML';
import { PLI } from '../../../common/lib/platform-independence';
import { LIB, LOG } from '../../../common/lib/helpers';

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
                const hasExtension = value.endsWith('.cas.xml');
                return hasExtension || 'Filename should end with .cas.xml';
            }
        }
    }
  },
  computed: {
    isFilenameValid(): boolean {
        const fn = this.filename as string;
        return fn.length > 0 && fn.endsWith('.cas.xml');
    }
  },
  methods: {
    openDialog() {
        this.dialog = true;

        // Reset messages and state
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = false;

        // Get packages and update count (already loaded from storage at app startup)
        const cache = PackageCache();
        const pkgs = cache.packages;

        this.packageCount = pkgs.length;

        // Set default filename from first package title
        if (LIB.isArrayWithContent(pkgs)) {
            // Use toRaw to unwrap Pinia's reactive proxy
            const firstPackage = toRaw(pkgs[0]);

            // Derive filename from package title or ID and remove invalid characters:
            const sanitized = LIB.makeFilename(firstPackage);
            this.filename = `${sanitized}.cas.xml`;
        } else {
            this.filename = 'export.cas.xml';
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

            // Transform all packages to XML
            // Use toRaw to unwrap Pinia's reactive proxies
            const xmlPackages = pkgs.map((pkg: any) => {
                const rawPkg = toRaw(pkg);
                return getXML(rawPkg);
            });

            // Combine all XML strings with line breaks
            const exportData = xmlPackages.join('\n\n');

            // Write to file using PLI
            const result = await PLI.writeFile(exportData, this.filename);

            if (result.ok) {
                this.successMessage = `Successfully exported ${pkgs.length} package(s) to ${this.filename}`;
                LOG.info('[Export XML] Export successful:', this.filename);

                // Close dialog after short delay to show success message
                setTimeout(() => {
                    this.dialog = false;
                }, 1500);
            } else {
                this.errorMessage = `Export failed: ${result.statusText}`;
                LOG.error('[Export XML] Export failed:', result.statusText);
            }
        } catch (error) {
            this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
            LOG.error('[Export XML] Export error:', error);
        } finally {
            this.isExporting = false;
        }
    }
  }
})

export default class XmlExportComponent extends Vue {}
</script>
