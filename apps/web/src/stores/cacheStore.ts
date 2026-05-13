import { defineStore } from 'pinia'

export const useHtmlStore = defineStore('htmlStore', {
  state: () => ({
    htmlArray: [] as string[]
  }),
  actions: {
    setHtmlArray(newArray: string[]) {
      console.log("CacheStore: Setting htmlArray", newArray);
      this.htmlArray = newArray;
    }
  }
})