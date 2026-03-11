import { defineStore } from 'pinia'

export const useHtmlStore = defineStore('htmlStore', {
  state: () => ({
    htmlArray: [] as string[]
  })
})