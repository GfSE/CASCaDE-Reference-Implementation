<template>
  <v-layout class="rounded rounded-md border">
    <v-app-bar>
        <v-app-bar-title>{{msg}}</v-app-bar-title>
    </v-app-bar>

    <v-navigation-drawer>
      <v-list nav>
        <v-list-item title="Navigation" link></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center" height="300">
      <v-container>
        <v-sheet
          border="dashed md"
          color="surface-light"
          height="200"
          rounded="lg"
          width="100%"
        >
        <p>
          Landing page for CASCaDE app. Perform simple import and export functions here.
        </p>
        <ul>
            <li v-for="(component, name) in exportComponents" :key="name">
                <component :is="name"/>
            </li>
        </ul>
        <ul>
            <li v-for="(component, name) in importComponents" :key="name">
                <component :is="name"/>
            </li>
        </ul>
        </v-sheet>
      </v-container>
    </v-main>
  </v-layout>
</template>


<script lang="ts">
import { inject } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
  props: {
    msg: String
  },
  inject: ['importComponents', 'exportComponents']
})

export default class Home extends Vue {}
</script>


<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  margin: 10px 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
</style>
