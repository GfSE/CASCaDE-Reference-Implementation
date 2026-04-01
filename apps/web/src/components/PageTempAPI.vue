<template>
  <h1>{{ message }}</h1>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getHelloMessage } from "./services/api";

const message = ref("Loading...");

onMounted(async () => {
  try {
    const data = await getHelloMessage();
    message.value = data.message;
  } catch (err) {
    message.value = "Error contacting API";
    console.error(err);
  }
});
</script>