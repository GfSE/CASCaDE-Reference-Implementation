import { defineStore } from 'pinia'
import { APackage } from '../common/schema/pig/ts/pig-metaclasses'
import { LOG } from '../common/lib/helpers'

const STORAGE_KEY = 'cascara-packages';

export const PackageCache = defineStore('packageCache', {
  state: () => ({
    packages: [] as APackage[]
  }),
  actions: {
    /**
    * Set packages and persist to localStorage
    */
    set(packages: APackage[]) {
        this.packages = packages
        this.saveToStorage()
    },

    /**
     * Get packages from cache. If cache is empty, try to load from storage.
     * @returns Array of IAPackage instances
     */
    get(): APackage[] {
      // If cache is empty, try to load from storage
      if (this.packages.length === 0) {
        LOG.info('[PackageCache] Cache is empty, attempting to load from storage...')
        this.loadFromStorage()
      }
      return this.packages as APackage[]
    },

    /**
    * Save packages to localStorage
    */
    saveToStorage() {
        try {
            // Get plain JSON for storage
            const data = this.packages.map(pkg => pkg.get());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
            LOG.info(`[PackageCache] Saved ${this.packages.length} package(s) to localStorage`)
        } catch (error) {
            LOG.error('[PackageCache] Failed to save to localStorage:', error)
        }
    },

    /**
     * Load packages from localStorage on initialization
     */
    loadFromStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const data = JSON.parse(stored);
            // Reinstantiate IAPackage objects from plain JSON
            LOG.debug(`[PackageCache] Loaded raw data from localStorage:`, data);

            this.packages = data.map((pkg: any) => new APackage().set(pkg))
            LOG.info(`[PackageCache] Loaded ${this.packages.length} package(s) from localStorage`)
        }
      } catch (error) {
        LOG.error('[PackageCache] Failed to load from localStorage:', error)
        this.packages = []
      }
    },

    /**
     * Clear all packages
     */
    clear() {
      this.packages = []
      localStorage.removeItem(STORAGE_KEY)
      LOG.info('[PackageCache] Cleared cache')
    }
  }
})
