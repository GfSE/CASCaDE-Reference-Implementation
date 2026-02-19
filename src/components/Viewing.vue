<template>
  <v-container fluid>
    <v-row>
      
      <!-- LEFT PANE -->
      <v-col cols="3">
        <v-card height="100%">
          <v-card-title>Items</v-card-title>
          <v-divider />
          <v-list>
            <v-list-item
              v-for="(item, index) in htmlArray"
              :key="index"
              @click="selectItem(index)"
              :active="selectedIndex === index"
            >
              <v-list-item-title>
                Item {{ index + 1 }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- RIGHT PANE -->
      <v-col cols="9">
        <v-card height="100%">
          <v-card-title>Preview</v-card-title>
          <v-divider />
          <v-card-text>
            <div v-if="selectedHtml" v-html="selectedHtml"></div>
            <div v-else>Select an item from the left</div>
          </v-card-text>
        </v-card>
      </v-col>

    </v-row>
  </v-container>
</template>


<script lang="ts">
import { Vue, Options} from 'vue-class-component'
import { useHtmlStore } from '@/stores/cacheStore'

@Options({
  data() {
    return {
      selectedIndex: null as number | null
    }
  },

  computed: {
    htmlArray(): string[] {
      const store = useHtmlStore()
      const value = store.htmlArray
      console.log('value ' + value)

      if (!value) return []

      return Array.isArray(value) ? value : [value]
    },

    selectedHtml(): string | null {
      if (this.selectedIndex === null) return null

      return this.htmlArray[this.selectedIndex] ?? null
    }
  },

  methods: {
    selectItem(index: number) {
      this.selectedIndex = index
    }
  }
})

export default class Viewing extends Vue {}
</script>


<style scoped>
</style>