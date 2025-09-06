<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <p>
      Landing page for {{this.$applicationName}} app. Perform simple import and export functions here.
    </p>
    <ul>
        <li><button @click="$handleJsonImport">Import Json</button></li>
        <li><button @click="$handleJsonExport">Export Json</button></li>
        <li><button @click="$handleRDFExport">Export RDF</button></li>
    </ul>

    <MyGlobalComponent/>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
  props: {
    msg: String
  },
  methods: {
    jsonImport() {this.$handleJsonImport},
    jsonExport() {this.$handleJsonExport},
    rdfExport() {this.$handleRDFExport}
  },
})

export default class Home extends Vue {}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
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
