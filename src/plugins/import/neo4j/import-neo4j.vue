<template>
    <v-btn color='secondary' variant='elevated' class='text-none import-btn' @click='dialog = true'>Neo4j 🡕</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>Import CASCaRA from Neo4j</v-card-title>

            <v-card-text>
                <v-text-field v-model='uri'
                              label='Neo4j URI'
                              hint='bolt://localhost:7687'
                              persistent-hint
                              :disabled='isLoading'>
                </v-text-field>

                <v-text-field v-model='database'
                              label='Database'
                              hint='neo4j'
                              persistent-hint
                              :disabled='isLoading'>
                </v-text-field>

                <v-text-field v-model='username'
                              label='Username'
                              hint='neo4j'
                              persistent-hint
                              :disabled='isLoading'>
                </v-text-field>

                <v-text-field v-model='password'
                              label='Password'
                              type='password'
                              hint='Neo4j password'
                              persistent-hint
                              :disabled='isLoading'>
                </v-text-field>

                <v-btn color='secondary'
                       variant='outlined'
                       class='mt-4'
                       :disabled='!canConnect || isLoading'
                       :loading='isTestingConnection'
                       @click='onTestConnection'>
                    Test Connection
                </v-btn>

                <!-- Connection Test Result -->
                <v-alert v-if='connectionMessage'
                         type='success'
                         class='mt-4'>
                    {{ connectionMessage }}
                </v-alert>

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
                <v-btn :color="isLoading ? undefined : 'grey'" variant='elevated' class='import-btn' @click='onCancel' :disabled='isLoading'>
                    Cancel
                </v-btn>
                <template v-if='hasCachedData'>
                    <v-btn :color="isSubmitDisabled ? undefined : 'primary'"
                           variant='elevated'
                           class='import-btn'
                           @click='onSubmit("replace")'
                           :disabled='isSubmitDisabled'
                           :loading="isLoading && submitMode === 'replace'">
                        Replace
                    </v-btn>
                    <v-btn :color="isSubmitDisabled ? undefined : 'primary'"
                           variant='elevated'
                           class='import-btn'
                           @click='onSubmit("update")'
                           :disabled='isSubmitDisabled'
                           :loading="isLoading && submitMode === 'update'">
                        Update
                    </v-btn>
                </template>
                <v-btn v-else
                       :color="isSubmitDisabled ? undefined : 'primary'"
                       variant='elevated'
                       class='import-btn'
                       @click='onSubmit("replace")'
                       :disabled='isSubmitDisabled'
                       :loading='isLoading'>
                    Import
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>


<script lang="ts">

import {
    Options,
    Vue
} from 'vue-class-component';

import {
    DEF
} from '@/common/lib/definitions';

import {
    LOG
} from '@/common/lib/helpers';

import {
    IRsp
} from '@/common/lib/messages';

import {
    APackage,
    TPigItem
} from '@/common/schema/pig/ts/pig-metaclasses';

import {
    Neo4jImporter,
    INeo4jImportOptions
} from '@/common/import/neo4j/import-neo4j';

import {
    ItemCache
} from '@/stores/item-cache';

import {
    AssetCache
} from '@/stores/asset-cache';


@Options({

    data() {

        return {

            dialog:
                false,

            uri:
                'bolt://localhost:7687',

            database:
                'neo4j',

            username:
                'neo4j',

            password:
                '',

            isLoading:
                false,

            isTestingConnection:
                false,

            submitMode:
                null as 'replace' | 'update' | null,

            errorMessages:
                [] as string[],

            successMessage:
                '',

            connectionMessage:
                ''
        };
    },


    computed: {

        /**
         * Whether the item cache already holds data (in memory or persisted).
         * Drives which submit button(s) are shown: 'Import' when empty,
         * 'Replace' and 'Update' when the cache already holds data.
         */
        hasCachedData():
            boolean {

            return ItemCache().hasData;
        },


        canConnect():
            boolean {

            return Boolean(
                this.uri &&
                this.database &&
                this.username &&
                this.password
            );
        },


        isSubmitDisabled():
            boolean {

            return !this.canConnect ||
                this.isLoading;
        }
    },


    methods: {

        getConnection():
            INeo4jImportOptions {

            return {

                uri:
                    this.uri,

                database:
                    this.database,

                username:
                    this.username,

                password:
                    this.password
            };
        },


        /**
         * Verify credentials/server before importing.
         */
        async onTestConnection() {

            this.isTestingConnection =
                true;

            this.errorMessages =
                [];

            this.connectionMessage =
                '';

            this.successMessage =
                '';


            try {

                const response =
                    await Neo4jImporter
                        .testConnection(
                            this.getConnection()
                        );


                if (
                    response.ok
                ) {

                    this.connectionMessage =
                        'Successfully connected to Neo4j.';

                } else {

                    this.errorMessages = [
                        response.statusText ||
                        'Could not connect to Neo4j.'
                    ];
                }

            } catch (error: any) {

                this.errorMessages = [
                    error?.message ||
                    String(error)
                ];


                LOG.error(
                    'Neo4j connection error:',
                    error
                );

            } finally {

                this.isTestingConnection =
                    false;
            }
        },


        /**
         * Import every CASCaRA package found in Neo4j.
         * @param mode 'replace' fully replaces the item cache (used for the 'Import' and
         *             'Replace' buttons), 'update' merges the imported items into the
         *             existing cache, preserving object identity of already-cached,
         *             unchanged items (see ItemCache.update()).
         */
        async onSubmit(
            mode:
                'replace' | 'update'
        ) {

            if (
                !this.canConnect
            ) {

                this.errorMessages = [
                    'Please provide all Neo4j connection fields.'
                ];

                return;
            }


            this.isLoading =
                true;

            this.submitMode =
                mode;

            this.errorMessages =
                [];

            this.successMessage =
                '';

            this.connectionMessage =
                '';


            try {

                const results =
                    await Neo4jImporter.import(
                        this.getConnection()
                    );


                /*
                 * Same behavior as the other import plugins:
                 * status 0 is accepted as successful.
                 *
                 * A 603 partial import remains a failed import
                 * for now.
                 */
                const successful =
                    results.filter(
                        (
                            result:
                                IRsp<TPigItem[]>
                        ) =>
                            result.ok
                    );


                const failed =
                    results.filter(
                        (
                            result:
                                IRsp<TPigItem[]>
                        ) =>
                            !result.ok
                    );


                const packages:
                    APackage[] =
                    successful
                        .map(
                            (
                                result:
                                    IRsp<TPigItem[]>
                            ) => {

                                const items =
                                    result.response as
                                        TPigItem[];


                                return items?.[0] as
                                    APackage;
                            }
                        )
                        .filter(
                            (
                                item:
                                    unknown
                            ) =>
                                item instanceof
                                    APackage
                        );


                if (
                    packages.length === 0
                ) {

                    if (
                        failed.length > 0
                    ) {

                        this.errorMessages =
                            failed.map(
                                (
                                    result:
                                        IRsp<TPigItem[]>
                                ) =>
                                    result.statusText ||
                                    `Neo4j import error (${result.status})`
                            );

                    } else {

                        this.errorMessages = [
                            'No CASCaRA packages were found in Neo4j.'
                        ];
                    }


                    return;
                }


                /*
                 * Store the imported packages in the item cache, same as the other
                 * import plugins. The item cache is lazily loaded, so it must be
                 * loaded from storage first if not yet initialized. A 'replace'
                 * also clears the asset cache beforehand, since it fully replaces
                 * the cache contents; this MUST happen before persisting, otherwise
                 * stale/orphaned assets from a previous import would linger.
                 */
                const cache =
                    ItemCache();


                if (
                    !cache.initialized
                ) {

                    await cache.loadFromStorage();
                }


                if (
                    mode === 'replace'
                ) {

                    await AssetCache().clear();
                }


                const items:
                    TPigItem[] =
                    packages.flatMap(
                        pkg =>
                            pkg.getItems()
                    );


                const persisted =
                    mode === 'update'
                        ? await cache.update(
                            items
                        )
                        : await cache.replace(
                            items
                        );


                const action =
                    mode === 'update'
                        ? 'updated'
                        : 'imported';

                this.successMessage =
                    `Successfully ${action} ${packages.length} ` +
                    `CASCaRA package(s) from Neo4j.`;


                if (
                    !persisted
                ) {

                    this.errorMessages.push(
                        'Warning: imported data could not be persisted ' +
                        'to browser storage (IndexedDB).'
                    );
                }


                if (
                    failed.length > 0
                ) {

                    this.errorMessages.push(
                        ...failed.map(
                            (
                                result:
                                    IRsp<TPigItem[]>
                            ) =>
                                result.statusText ||
                                `Neo4j import error (${result.status})`
                        )
                    );
                }


                /*
                 * Same post-import navigation used by the existing
                 * importer plugins.
                 */
                setTimeout(
                    async () => {

                        await this.$router.push({
                            name:
                                'Document'
                        });


                        this.dialog =
                            false;


                        this.onCancel();
                    },
                    DEF.timeBetweenPages
                );

            } catch (error: any) {

                this.errorMessages = [
                    `Import failed: ${
                        error?.message ||
                        String(error)
                    }`
                ];


                LOG.error(
                    'Neo4j import error:',
                    error
                );

            } finally {

                this.isLoading =
                    false;

                this.submitMode =
                    null;
            }
        },


        onCancel() {

            this.dialog =
                false;

            this.password =
                '';

            this.submitMode =
                null;

            this.errorMessages =
                [];

            this.successMessage =
                '';

            this.connectionMessage =
                '';
        }
    }
})


export default class Neo4jImportComponent
    extends Vue {

    dialog!: boolean;

    uri!: string;

    database!: string;

    username!: string;

    password!: string;

    isLoading!: boolean;

    isTestingConnection!: boolean;

    submitMode!: 'replace' | 'update' | null;

    errorMessages!: string[];

    successMessage!: string;

    connectionMessage!: string;
}

</script>
