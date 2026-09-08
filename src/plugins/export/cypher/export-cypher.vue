<template>
    <v-btn color='secondary' class='text-none export-button' @click='openDialog'>🡖 CASCaRA Cypher</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Export Packages as Cypher</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported.</p>
                    <v-text-field
                        v-model='filename'
                        label='Filename'
                        hint='Enter filename for the exported Cypher file'
                        persistent-hint
                        required
                        :rules='[rules.required, rules.extension]'
                        :disabled='isExporting'
                    ></v-text-field>
                </div>

                <v-alert v-if='errorMessage'
                         type='error'
                         dismissible
                         class='mt-4'
                         @click:close='errorMessage = ""'>
                    {{ errorMessage }}
                </v-alert>

                <v-alert v-if='successMessage'
                         type='success'
                         dismissible
                         class='mt-4'
                         @click:close='successMessage = ""'>
                    {{ successMessage }}
                </v-alert>

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
import { getCypher } from '../../../common/export/cypher/getCypher';
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
                return value.endsWith('.cypher') || 'Filename should end with .cypher';
            }
        }
    }
  },
  computed: {
    isFilenameValid(): boolean {
        const fn = this.filename as string;
        return fn.length > 0 && fn.endsWith('.cypher');
    }
  },
  methods: {
    openDialog() {
        this.dialog = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = false;

        const cache = PackageCache();
        const pkgs = cache.packages;
        this.packageCount = pkgs.length;

        if (pkgs && pkgs.length > 0) {
            const firstPackage = toRaw(pkgs[0]);
            const titleText = typeof firstPackage.title === 'string'
                ? firstPackage.title
                : Array.isArray(firstPackage.title) && firstPackage.title.length > 0
                    ? firstPackage.title[0].value
                    : firstPackage.id || 'export';
            const sanitized = titleText.replace(/[<>:"/\\|?*]/g, '_');
            this.filename = `${sanitized}.cypher`;
        } else {
            this.filename = 'export.cypher';
        }
    },
    async exportPackages() {
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = true;

        try {
            const cache = PackageCache();
            const pkgs = cache.packages;
            const cypherText = pkgs
                .map((pkg: any) => getCypher(toRaw(pkg), { includeConstraints: true }))
                .join('\n\n');

            const result = await PLI.writeFile(cypherText, this.filename);
            if (result.ok) {
                this.successMessage = `Successfully exported ${pkgs.length} package(s) to ${this.filename}`;
                LOG.info('[Export Cypher] Export successful:', this.filename);
                setTimeout(() => {
                    this.dialog = false;
                }, 1500);
            } else {
                this.errorMessage = `Export failed: ${result.statusText}`;
                LOG.error('[Export Cypher] Export failed:', result.statusText);
            }
        } catch (error) {
            this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
            LOG.error('[Export Cypher] Export error:', error);
        } finally {
            this.isExporting = false;
        }
    }
  }
})

export default class CypherExportComponent extends Vue {}
</script>

<style scoped>
.export-button {
    font-weight: 400;
    letter-spacing: 0.01em;
}
</style>
