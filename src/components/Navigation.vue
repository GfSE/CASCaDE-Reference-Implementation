<template>
    <div>
        <v-app-bar class="gradient-banner">
            <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
            <v-app-bar-title>{{msg}}</v-app-bar-title>
        </v-app-bar>

        <v-navigation-drawer v-model="drawer" color="surface-light"> <!-- or grey-lighten-3 -->
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

<style scoped>
    .gradient-banner {
        background: linear-gradient(135deg, #ad0505, #ff6d05) !important;
        color: white !important;
    }
</style>
