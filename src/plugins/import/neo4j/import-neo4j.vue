<template>

    <v-btn
        color="secondary"
        class="text-none"
        @click="dialog = true">

        Neo4j 🡕

    </v-btn>


    <v-dialog
        v-model="dialog"
        max-width="600">

        <v-card>

            <v-card-title>
                Import CASCaRA from Neo4j
            </v-card-title>


            <v-card-text>

                <v-text-field
                    v-model="uri"
                    label="Neo4j URI"
                    hint="bolt://localhost:7687"
                    persistent-hint
                    :disabled="isLoading">
                </v-text-field>


                <v-text-field
                    v-model="database"
                    label="Database"
                    hint="neo4j"
                    persistent-hint
                    :disabled="isLoading">
                </v-text-field>


                <v-text-field
                    v-model="username"
                    label="Username"
                    hint="neo4j"
                    persistent-hint
                    :disabled="isLoading">
                </v-text-field>


                <v-text-field
                    v-model="password"
                    label="Password"
                    type="password"
                    hint="Neo4j password"
                    persistent-hint
                    :disabled="isLoading">
                </v-text-field>


                <v-btn
                    color="secondary"
                    variant="outlined"
                    class="mt-4"
                    :disabled="!canConnect || isLoading"
                    :loading="isTestingConnection"
                    @click="onTestConnection">

                    Test Connection

                </v-btn>


                <v-alert
                    v-if="connectionMessage"
                    type="success"
                    class="mt-4">

                    {{ connectionMessage }}

                </v-alert>


                <v-alert
                    v-if="errorMessages.length > 0"
                    type="error"
                    class="mt-4">

                    <div
                        v-for="(error, index) in errorMessages"
                        :key="index">

                        {{ error }}

                    </div>

                </v-alert>


                <v-alert
                    v-if="successMessage"
                    type="success"
                    class="mt-4">

                    {{ successMessage }}

                </v-alert>


                <v-progress-linear
                    v-if="isLoading"
                    indeterminate
                    color="primary"
                    class="mt-4">
                </v-progress-linear>

            </v-card-text>


            <v-card-actions>

                <v-spacer></v-spacer>


                <v-btn
                    color="grey"
                    :disabled="isLoading"
                    @click="onCancel">

                    Cancel

                </v-btn>


                <v-btn
                    color="primary"
                    :disabled="!canConnect || isLoading"
                    :loading="isLoading"
                    @click="onSubmit">

                    {{ submitLabel }}

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
    PackageCache
} from '@/stores/package-cache';


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

            errorMessages:
                [] as string[],

            successMessage:
                '',

            connectionMessage:
                ''
        };
    },


    computed: {

        submitLabel():
            string {

            return PackageCache().hasData
                ? 'Replace'
                : 'Import';
        },


        canConnect():
            boolean {

            return Boolean(
                this.uri &&
                this.database &&
                this.username &&
                this.password
            );
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
         */
        async onSubmit() {

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
                            result => {

                                const items =
                                    result.response as
                                        TPigItem[];


                                return items?.[0] as
                                    APackage;
                            }
                        )
                        .filter(
                            item =>
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
                                result =>
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
                 * Replace the current cache exactly like the other
                 * import plugins.
                 */
                const cache =
                    PackageCache();


                const persisted =
                    await cache.replace(
                        packages
                    );


                this.successMessage =
                    `Imported ${packages.length} ` +
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
                            result =>
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
            }
        },


        onCancel() {

            this.dialog =
                false;

            this.password =
                '';

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

    errorMessages!: string[];

    successMessage!: string;

    connectionMessage!: string;
}

</script>