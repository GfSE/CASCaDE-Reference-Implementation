<template>
    <v-btn color='secondary' class='text-none export-button' @click='openDialog'>🡖 CASCaRA Neo4j</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Export Packages to Neo4j</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported to Neo4j.</p>
                    <v-text-field
                        v-model='uri'
                        label='Neo4j URI'
                        hint='bolt://localhost:7687'
                        persistent-hint
                        required
                        :rules='[rules.required]'
                        :disabled='isExporting'
                    ></v-text-field>
                    <v-text-field
                        v-model='username'
                        label='Username'
                        hint='neo4j'
                        persistent-hint
                        required
                        :rules='[rules.required]'
                        :disabled='isExporting'
                    ></v-text-field>
                    <v-text-field
                        v-model='password'
                        label='Password'
                        type='password'
                        hint='Enter Neo4j password'
                        persistent-hint
                        required
                        :rules='[rules.required]'
                        :disabled='isExporting'
                    ></v-text-field>
                    <v-text-field
                        v-model='database'
                        label='Database'
                        hint='neo4j'
                        persistent-hint
                        required
                        :rules='[rules.required]'
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
                    :disabled='packageCount === 0 || !isFormValid || isExporting'
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
import { exportToNeo4j } from './neo4j-export';
import { LOG } from '../../../common/lib/helpers';

@Options({
  data() {
    return {
        dialog: false,
        uri: 'bolt://localhost:7687',
        username: 'neo4j',
        password: '',
        database: 'neo4j',
        packageCount: 0,
        isExporting: false,
        errorMessage: '',
        successMessage: '',
        rules: {
            required: (value: string) => !!value || 'This field is required'
        }
    }
  },
  computed: {
    isFormValid(): boolean {
        return !!this.uri && !!this.username && !!this.password && !!this.database;
    }
  },
  methods: {
    openDialog() {
        this.dialog = true;
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = false;
        this.password = '';
        const cache = PackageCache();
        if (cache.packages.length === 0) {
            LOG.info('[Export Neo4j] Cache is empty, loading from storage...');
            cache.loadFromStorage();
        }

        this.packageCount = cache.packages.length;
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

            const result = await exportToNeo4j(cypherText, {
                uri: this.uri,
                username: this.username,
                password: this.password,
                database: this.database
            });

            if (result.ok) {
                this.successMessage = result.message;
                LOG.info('[Export Neo4j] Export placeholder completed');
                setTimeout(() => { this.dialog = false; }, 1500);
            } else {
                this.errorMessage = result.message;
                LOG.error('[Export Neo4j] Export failed:', result.message);
            }
        } catch (error) {
            this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
            LOG.error('[Export Neo4j] Export error:', error);
        } finally {
            this.isExporting = false;
        }
    }
  }
})

export default class Neo4jExportComponent extends Vue {}
</script>

<style scoped>
.mb-4 {
    margin-bottom: 16px;
}

.mt-4 {
    margin-top: 16px;
}

.export-button {
    font-weight: 400;
    letter-spacing: 0.01em;
}
</style>
