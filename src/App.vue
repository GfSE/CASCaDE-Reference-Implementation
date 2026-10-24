<template>
    <v-app>
        <!-- App Bar / Banner -->
        <v-app-bar app color="primary" dark>
            <v-app-bar-nav-icon @click="drawer = !drawer" />
            <v-toolbar-title>{{ DEF.appName }}</v-toolbar-title>
        </v-app-bar>

        <!-- Navigation Drawer -->
        <v-navigation-drawer v-model="drawer" app color="surface-light">
            <v-list nav>
                <v-list-item border="md" to="/">
                    <h3>Home</h3>
                </v-list-item>
                <v-list-item border="md" to="/dashboards">
                    <h3>Dashboard</h3>
                </v-list-item>
                <v-list-item border="md" to="/interfaces">
                    <h3>Interfaces</h3>
                </v-list-item>
                <v-list-item border="md" to="/document">
                    <h3>Document</h3>
                </v-list-item>
                <v-list-item border="md" to="/ontology">
                    <h3>Ontology</h3>
                </v-list-item>
                <v-list-item border="md" @click="openGithubIssue">
                    <h3><v-icon start>mdi-github</v-icon>Report an Issue</h3>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <!-- Main Content -->
        <v-main>
            <v-container fluid class="main-content pa-0">
                <router-view />
            </v-container>
        </v-main>

        <!-- Handles ?update="<url>" / ?replace="<url>" and other command query parameters on any route -->
        <url-queries />
    </v-app>
</template>

<script lang="ts">
    import { Vue, Options } from 'vue-class-component';
    import { DEF } from '@/common/lib/definitions';
    import UrlQueries from '@/components/UrlQueries.vue';

    @Options({
        components: {
            UrlQueries
        },
        data() {
            return {
                drawer: false
            };
        },
        computed: {
            DEF() {
                return DEF;
            }
        },
        created() {
            // Show the navigation drawer by default on wide screens only,
            // keep it hidden on mobile/portable devices for better accessibility.
            this.drawer = this.$vuetify.display.mdAndUp;
        },
        methods: {
            openGithubIssue() {
                window.open('https://github.com/GfSE/CASCaDE-Reference-Implementation/issues/new', '_blank');
            }
        }
    })
    export default class App extends Vue { }
</script>

<style scoped>
    h3 {
        text-align: center;
    }

    .main-content {
        height: 100%;
    }
</style>
