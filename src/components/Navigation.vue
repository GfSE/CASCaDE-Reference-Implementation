<template>
    <div>
        <v-app-bar class="gradient-banner">
            <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
            <v-app-bar-title><h2>{{msg}}</h2></v-app-bar-title>
        </v-app-bar>

        <v-navigation-drawer v-model="drawer" class="drawer-grey">
            <v-list nav>
                <v-list-item border="md" href="/">
                    <h3>Home</h3>
                </v-list-item>
                <v-list-item border="md" href="/dashboards">
                    <h3>Dashboard</h3>
                </v-list-item>
                <v-list-item border="md" href="/interfaces">
                    <h3>Interfaces</h3>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>
    </div>
</template>

<script lang="ts">
    import { Options, Vue } from 'vue-class-component';

    @Options({
        name: 'AppNav',
        props: {
            msg: String
        },
        data() {
            return { drawer: false }
        }
    })

    export default class AppNav extends Vue { }
</script>


<style>
    .gradient-banner {
        background: linear-gradient(135deg, #2c3e50, #3498db) !important;
        color: white !important;
    }
    .v-app-bar-title h2 {
        color: white !important;
    }
    .drawer-grey {
        background-color: #D0D0D0 !important;
    }
</style>
