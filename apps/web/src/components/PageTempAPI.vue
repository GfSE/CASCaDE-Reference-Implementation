<template>
  <v-btn color='secondary' @click=loadData :disabled="isLoading">{{ isLoading ? 'Loading...' : 'Get JSON Data' }}</v-btn>
  <div v-if="message">
    <h3>{{ message }}</h3>
  </div>
</template>

<script lang="ts">
  import { Options, Vue } from 'vue-class-component';
  import { getHelloMessage } from "../services/api";

  @Options({

    name: 'APIComponent',

    data() {
      return {
        message: 'Loading...',
        apiData: null as any,
        isLoading: false
      }
    },

    mounted() {
      this.loadData();
    },

    methods: {
      async loadData() {
        try {
          const data = await getHelloMessage();
          this.apiData = data;
          this.message = data.message;
        } catch (err) {
          this.message = "Error contacting API";
          console.error(err);
        }
      }
    }

  })

  export default class PageAPI extends Vue {}

</script>

<style scoped></style>