<template>
    <v-app>
        <Navigation :msg="DEF.appName" />

        <v-main>
            <v-container fluid>
                <router-view></router-view>
            </v-container>
        </v-main>
    </v-app>
</template>

<script lang="ts">
    import { Vue, Options } from 'vue-class-component';
    import { DEF } from '@/common-code/lib/definitions';

    @Options({
        computed: {
            DEF() {
                return DEF;
            }
        }
    })
    export default class App extends Vue { }
</script>

<style>
    #app {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        margin-top: 60px;
    }
</style>
