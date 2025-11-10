<template>
  <div class="Home Page">
    <h1>{{ msg }}</h1>
    <p>
      Landing page for CASCaDE app. Perform simple import and export functions here.
    </p>
    <ul>
        <li v-for="(component, name) in globalComponents" :key="name">
            <component :is="name"/>
        </li>
    </ul>
  </div>
</template>


<script lang="ts">
import { inject } from 'vue';
import { Options, Vue } from 'vue-class-component';

@Options({
  props: {
    msg: String
  },
  inject: ['globalComponents']
})

export default class Home extends Vue {}
</script>


<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
</style>
