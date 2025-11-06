<template>
    <div>
    <v-app-bar theme="dark">
        <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
        <v-app-bar-title><h2>{{msg}}</h2></v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" color="secondary">
      <v-list nav>
        <v-list-item border="md" href="/">
            <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
        <v-list-item border="md" href="/interfaces">
            <v-list-item-title>Interfaces</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    </div>
</template>


<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
  props: {
    msg: String
  },
  data() {
    return {drawer: false}
  }
})

export default class Home extends Vue {}
</script>


<style scoped></style>
