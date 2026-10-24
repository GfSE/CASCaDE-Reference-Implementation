<template>
    <v-btn color='secondary' variant='elevated' class='text-none export-btn' @click='openDialog'>🡖 Neo4j API</v-btn>
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
                <v-btn :color="isExporting ? undefined : 'grey'" variant='elevated' class='export-btn' @click='dialog = false' :disabled='isExporting'>
                    Cancel
                </v-btn>
                <v-btn
                    :color="(packageCount === 0 || !isFormValid || isExporting) ? undefined : 'primary'"
                    variant='elevated'
                    class='export-btn'
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
import { ItemCache } from '../../../stores/item-cache';
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
        // Clear password reduces the risk of re-exposing credentials if the dialog is reopened or the screen is shared:
        this.password = '';

        const cache = ItemCache();
        this.packageCount = cache.packages.length;
    },
    async exportPackages() {
        this.errorMessage = '';
        this.successMessage = '';
        this.isExporting = true;

        try {
            const cache = ItemCache();
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
                LOG.info('[Export Neo4j] Export completed');
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
