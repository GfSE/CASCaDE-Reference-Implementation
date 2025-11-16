<template>
    <div>
        <v-sheet
          border="dashed md"
          color="surface-light"
          height="200"
          rounded="lg"
          width="100%"
        >
            <ul>
                <li v-for="(component, name) in exportComponents" :key="name">
                    <component :is="name"/>
                </li>
            </ul>
        </v-sheet>
        <v-sheet
          border="dashed md"
          color="surface-light"
          height="200"
          rounded="lg"
          width="100%"
        >
            <ul>
                <li v-for="(component, name) in importComponents" :key="name">
                    <component :is="name"/>
                </li>
            </ul>
        </v-sheet>
    </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import { inject } from 'vue';

@Options({
    inject: ['importComponents', 'exportComponents']
})

export default class Interfaces extends Vue {}
</script>

<style scoped>
    ul {
      display: flex;
      list-style: none;
      padding: 0;
      margin: 25px 0;
    }

    li {
      margin-right: 10px;
      margin-left: 10px;
      display: inline-block
    }

    .v-sheet {
      margin-top: 10px
    }
</style>