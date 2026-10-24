import { defineStore } from 'pinia'
import { APackage, TPigItem, PigItemType } from '../common/schema/pig/ts/pig-metaclasses'
import { LOG } from '../common/lib/helpers'

// Legacy localStorage key, no longer used for persistence (kept only to remove
// any leftover data from previous versions). localStorage is limited to ~5-10 MB
// per origin, which is too small for large imported files (e.g. sizeable JSON-LD
// documents), so persistence has moved to IndexedDB, which supports much larger
// quotas (typically hundreds of MB or more).
const LEGACY_STORAGE_KEY = 'cascara-packages';

const DB_NAME = 'cascara-db';
// Shared with asset-cache.ts's database; bumped to add the 'assetCache' store.
// Keep in sync with asset-cache.ts's DB_VERSION.
const DB_VERSION = 3;
const STORE_NAME = 'itemCache';
const RECORD_KEY = 'packages';

/**
 * A simple class for IndexedDB to persist the item cache.
 */
class idb {
    /**
     * Open (and if necessary create) the IndexedDB database used to persist the item cache.
     * Also (defensively) ensures the 'assetCache' store used by asset-cache.ts exists,
     * since both caches share the same underlying database.
     */
    static async open(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
                if (!db.objectStoreNames.contains('assetCache')) {
                    db.createObjectStore('assetCache');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Persist a JSON string in IndexedDB under the fixed record key.
     */
    static async set(json: string): Promise<void> {
        const db = await idb.open();
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
    static async get(): Promise<string | undefined> {
        const db = await idb.open();
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
    static async clear(): Promise<void> {
        const db = await idb.open();
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
}

/**
 * Flatten a set of packages into the flat item list held by the store: for
 * each package, APackage.getItems() returns [package, ...graph items], with
 * the graph items being the very same instances referenced by package.graph.
 * Used only internally, to rebuild 'items' after loading packages from storage.
 */
function flattenPackages(packages: APackage[]): TPigItem[] {
    return packages.flatMap(pkg => pkg.getItems());
}

export const ItemCache = defineStore('itemCache', {
  state: () => ({
    // Flat list of all top-level items: packages (aPackage) and their instantiated
    // graph items (anEntity, aRelationship, ...) side by side. Each package's 'graph'
    // property continues to reference the very same item instances held here.
    items: [] as TPigItem[],
    // becomes true once loadFromStorage() has completed (successfully or not),
    // so callers can tell an empty cache apart from a not-yet-initialized one
    initialized: false
  }),
  getters: {
    /**
     * The subset of items that are packages (aPackage), in the order they appear in 'items'.
     */
    packages(state): APackage[] {
        return state.items.filter(itm => itm.itemType === PigItemType.aPackage) as APackage[];
    },

    /**
     * Whether the cache currently holds any package in memory.
     * Note: this only reflects the in-memory state; call loadFromStorage() first
     * (e.g. once during app bootstrap) if packages might still be persisted only.
     */
    hasData(state): boolean {
        return state.items.length > 0;
    }
  },
  actions: {
    /**
     * Set items and persist them to IndexedDB.
     * Fully replaces whatever was cached/persisted before.
     * 'items' is taken as-is (flat list of packages and their items, e.g. as
     * delivered by APackage.getItems()) - it is the caller's responsibility to
     * ensure it is consistent (each package's graph items included alongside it).
     * @returns true if the items were successfully persisted
     */
    async set(items: TPigItem[]): Promise<boolean> {
        this.items = items
        return await this.saveToStorage()
    },

    /**
    * Update items (packages and their graph items alike) and persist them to
    * IndexedDB. 'items' is taken as-is - a flat list of packages and/or items
    * (e.g. as delivered by APackage.getItems()); it is the caller's
    * responsibility to include a package's graph items alongside it if needed.
    *
    * Every incoming item is matched against the cache by id:
    * - If no cached item with that id exists yet, it is added as a new item.
    * - If a cached item with that id exists and the incoming item is newer
    *   (by 'modified'), the CACHED instance is updated in place via its own
    *   set() method - its object identity/reference is preserved, so every
    *   package that already holds a reference to it (in its 'graph' array)
    *   automatically observes the updated data, without needing to be touched.
    *
    * APackage.set() reuses its own existing graph item instances (matched by id)
    * instead of replacing them, so an already-cached package that is updated again
    * keeps its shared items' identity automatically. However, an incoming package
    * that is new to the cache (or independently instantiated, e.g. a second package
    * sharing an item with a package already in the cache) has no knowledge of the
    * canonical item instances already held here, and instantiates its own graph
    * items from scratch. Therefore, every incoming package's 'graph' array is
    * re-linked afterwards to the canonical (identity-preserved) instances held at
    * the top level of the cache, so packages that share an item always reference
    * the very same instance.
    * @returns true if the items were successfully persisted
    */
    async update(items: TPigItem[]): Promise<boolean> {
        // Map existing items by id for lookup, while keeping their identity
        const byId = new Map<string, TPigItem>();
        for (const itm of this.items) byId.set(itm.id, itm as TPigItem);

        for (const incoming of items) {
            const existing = byId.get(incoming.id);
            if (!existing) {
                // Brand-new item: add as-is and register it as the new canonical instance
                this.items.push(incoming);
                byId.set(incoming.id, incoming);
                continue;
            }

            // Treat a missing 'modified' as the oldest possible date, so an
            // incoming item with a defined 'modified' always wins.
            const existingModified = (existing as any).modified ?? '';
            const incomingModified = (incoming as any).modified ?? '';
            if (existingModified >= incomingModified) {
                continue; // cached item is the same age or newer, keep it as-is
            }

            const rev = (existing as any).revision;
            // Serialize the incoming instance to its plain data shape first: set() expects
            // plain data (as produced by get()), not a live class instance with its own
            // internal bookkeeping (e.g. lastStatus, already-instantiated sub-objects).
            const incomingData = (incoming as any).get();
            if (rev && (!incomingData.priorRevision || incomingData.priorRevision.length === 0)) {
                incomingData.priorRevision = [rev];
            }

            // Mutate the existing (cached) instance in place, preserving its identity:
            (existing as any).set(incomingData);
        }

        // Re-link every incoming package's graph entries to the canonical item
        // instances held at the top level, so that items shared with other
        // (possibly previously cached) packages all reference the very same instance:
        for (const incoming of items) {
            if (incoming.itemType === PigItemType.aPackage) {
                const pkg = byId.get(incoming.id) as APackage;
                pkg.graph = pkg.graph.map(child => byId.get(child.id) ?? child);
            }
        }

        return await this.saveToStorage();
    },

    /**
    * Explicitly replace the entire cache (memory + persisted storage) with new items.
    * Removes any previous entry first, to avoid a partial/stale merge on save failure.
    * @returns true if the packages were successfully persisted
    */
    async replace(items: TPigItem[]): Promise<boolean> {
        try {
            await idb.clear()
        } catch (error) {
            LOG.error('[ItemCache] Failed to clear storage before replace:', error)
        }
        return await this.set(items);
    },

    /**
    * Get items from cache. If cache has not been initialized yet, try to load from storage first.
    * @returns Flat array of packages and their instantiated graph items
    */
    async get(): Promise<TPigItem[]> {
        if (!this.initialized) {
            await this.loadFromStorage()
        }
        return this.items as TPigItem[];
    },

    /**
    * Save packages to IndexedDB (graph items are embedded in each package, as before,
    * so storage stays backward-compatible; the flat in-memory 'items' list is
    * reconstructed from the packages again on load).
    * @returns true if the packages were successfully written to and verified in storage
    */
    async saveToStorage(): Promise<boolean> {
        try {
            // Get plain JSON for storage
            const data = this.packages.map(pkg => pkg.get());
            const json = JSON.stringify(data)
            await idb.set(json)

            // Verify the write actually persisted the expected number of packages
            const verify = await idb.get()
            const verifyCount = verify ? (JSON.parse(verify)?.length ?? 0) : 0
            if (verifyCount !== data.length) {
                LOG.error(`[ItemCache] Verification failed after saving to storage: expected ${data.length} package(s), found ${verifyCount}`)
                return false
            }

            LOG.info(`[ItemCache] Saved ${data.length} package(s) (${this.items.length} item(s) total) to storage`)
            return true
        } catch (error) {
            LOG.error('[ItemCache] Failed to save to storage:', error)
            return false
        }
    },

    /**
     * Load packages from IndexedDB and rebuild the flat item list from them.
     */
    async loadFromStorage(): Promise<void> {
      try {
        // Remove any leftover data from the old localStorage-based persistence
        // @ToDo: This can be removed some time in the future.
        try {
            localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch { /* ignore */ }

        const stored = await idb.get()
        if (stored) {
            const data = JSON.parse(stored);
            // Reinstantiate IAPackage objects from plain JSON, then flatten into 'items'
            //LOG.debug(`[ItemCache] Loaded raw data from storage:`, data);

            const packages = data.map((pkg: any) => new APackage().set(pkg));
            this.items = flattenPackages(packages);
            LOG.info(`[ItemCache] Loaded ${packages.length} package(s) (${this.items.length} item(s) total) from storage`);
        }
      } catch (error) {
        LOG.error('[ItemCache] Failed to load from storage:', error)
        this.items = []
      } finally {
        this.initialized = true
      }
    },

    /**
     * Clear all items
     */
    async clear(): Promise<void> {
        this.items = []
        try {
            await idb.clear()
        } catch (error) {
            LOG.error('[ItemCache] Failed to clear storage:', error)
        }
        LOG.info('[ItemCache] Cleared cache')
    }
  }
})
