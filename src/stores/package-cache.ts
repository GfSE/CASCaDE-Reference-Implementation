import { defineStore } from 'pinia'
import { APackage } from '../common/schema/pig/ts/pig-metaclasses'
import { LOG } from '../common/lib/helpers'

// Legacy localStorage key, no longer used for persistence (kept only to remove
// any leftover data from previous versions). localStorage is limited to ~5-10 MB
// per origin, which is too small for large imported files (e.g. sizeable JSON-LD
// documents), so persistence has moved to IndexedDB, which supports much larger
// quotas (typically hundreds of MB or more).
const LEGACY_STORAGE_KEY = 'cascara-packages';

const DB_NAME = 'cascara-db';
const DB_VERSION = 1;
const STORE_NAME = 'packageCache';
const RECORD_KEY = 'packages';

/**
 * Open (and if necessary create) the IndexedDB database used to persist the package cache.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persist a JSON string in IndexedDB under the fixed record key.
 */
async function idbSet(json: string): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(json, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Read the persisted JSON string from IndexedDB, or undefined if nothing is stored.
 */
async function idbGet(): Promise<string | undefined> {
  const db = await openDB();
  try {
    return await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Remove the persisted record from IndexedDB.
 */
async function idbClear(): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const PackageCache = defineStore('packageCache', {
  state: () => ({
    packages: [] as APackage[],
    // becomes true once loadFromStorage() has completed (successfully or not),
    // so callers can tell an empty cache apart from a not-yet-initialized one
    initialized: false
  }),
  getters: {
    /**
     * Whether the cache currently holds any package in memory.
     * Note: this only reflects the in-memory state; call loadFromStorage() first
     * (e.g. once during app bootstrap) if packages might still be persisted only.
     */
    hasData(state): boolean {
      return state.packages.length > 0
    }
  },
  actions: {
    /**
    * Set packages and persist them to IndexedDB.
    * Fully replaces whatever was cached/persisted before.
    * @returns true if the packages were successfully persisted
    */
    async set(packages: APackage[]): Promise<boolean> {
        this.packages = packages
        return await this.saveToStorage()
    },

    /**
     * Explicitly replace the entire cache (memory + persisted storage) with new packages.
     * Removes any previous entry first, to avoid a partial/stale merge on save failure.
     * @returns true if the packages were successfully persisted
     */
    async replace(packages: APackage[]): Promise<boolean> {
        try {
            await idbClear()
        } catch (error) {
            LOG.error('[PackageCache] Failed to clear storage before replace:', error)
        }
        return await this.set(packages)
    },

    /**
     * Get packages from cache. If cache has not been initialized yet, try to load from storage first.
     * @returns Array of IAPackage instances
     */
    async get(): Promise<APackage[]> {
      if (!this.initialized) {
        await this.loadFromStorage()
      }
      return this.packages as APackage[]
    },

    /**
    * Save packages to IndexedDB.
    * @returns true if the packages were successfully written to and verified in storage
    */
    async saveToStorage(): Promise<boolean> {
        try {
            // Get plain JSON for storage
            const data = this.packages.map(pkg => pkg.get());
            const json = JSON.stringify(data)
            await idbSet(json)

            // Verify the write actually persisted the expected number of packages
            const verify = await idbGet()
            const verifyCount = verify ? (JSON.parse(verify)?.length ?? 0) : 0
            if (verifyCount !== data.length) {
                LOG.error(`[PackageCache] Verification failed after saving to storage: expected ${data.length} package(s), found ${verifyCount}`)
                return false
            }

            LOG.info(`[PackageCache] Saved ${this.packages.length} package(s) to storage`)
            return true
        } catch (error) {
            LOG.error('[PackageCache] Failed to save to storage:', error)
            return false
        }
    },

    /**
     * Load packages from IndexedDB.
     */
    async loadFromStorage(): Promise<void> {
      try {
        // Remove any leftover data from the old localStorage-based persistence
        // @ToDo: This can be removed some time in the future.
        try {
            localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch { /* ignore */ }

        const stored = await idbGet()
        if (stored) {
            const data = JSON.parse(stored);
            // Reinstantiate IAPackage objects from plain JSON
            LOG.debug(`[PackageCache] Loaded raw data from storage:`, data);

            this.packages = data.map((pkg: any) => new APackage().set(pkg))
            LOG.info(`[PackageCache] Loaded ${this.packages.length} package(s) from storage`)
        }
      } catch (error) {
        LOG.error('[PackageCache] Failed to load from storage:', error)
        this.packages = []
      } finally {
        this.initialized = true
      }
    },

    /**
     * Clear all packages
     */
    async clear(): Promise<void> {
      this.packages = []
      try {
        await idbClear()
      } catch (error) {
        LOG.error('[PackageCache] Failed to clear storage:', error)
      }
      LOG.info('[PackageCache] Cleared cache')
    }
  }
})
