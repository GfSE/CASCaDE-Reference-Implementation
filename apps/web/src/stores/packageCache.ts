import { defineStore } from 'pinia'
import { APackage } from '../common/schema/pig/ts/pig-metaclasses'

export const usePackageCache = defineStore('packageCache', {
  state: () => ({
    packages: [] as APackage[]
  })
})
