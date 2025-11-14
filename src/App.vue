<template>
    <v-app>
        <Navigation msg="CASCaRA"/>

        <v-main>
            <v-container fluid>
              <router-view></router-view>
            </v-container>
        </v-main>
    </v-app>
</template>

<script lang="ts">
import { Vue } from 'vue-class-component';
export default class App extends Vue {}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>