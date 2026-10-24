/*!
 * Pinia store caching PIG/CASCaRA packages and their items in memory, persisted to IndexedDB.
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * ItemCache - in-memory cache of all loaded packages (aPackage) and their graph items
 * (anEntity, aRelationship, ...), persisted to IndexedDB for durability across sessions.
 *
 * Unlike AssetCache, ItemCache is loaded eagerly at app start. It supports both a full
 * replace() of the cache and an incremental update() that merges incoming items with the
 * ones already cached, preserving canonical object identity and package graph references.
 *
 * Persistence stores each item (package or graph item) as its own JSON document, keyed by id.
 * A package's 'graph' is persisted as lightweight proxies ({ id, itemType }) rather than
 * full item data (see APackage.getWithProxies()), so an item shared by several packages is
 * never duplicated in storage. When loading, every item is instantiated once, and each
 * package's proxies are resolved back to these canonical instances (APackage.setWithProxies()).
 *
 * ToDo:
 * - CASCaRA types often have no change information; a revision can be added to the path.
 *   There is a case where a package is updated with newer types, but the graph items are not changed.
 *   The app should be able to handle this case.
 *   Perhaps we must store the items with resolved ids, that is replacing the namespace tags
 *   with the fully qualified URL path. This will make the items unique and allow to update them correctly.
 */
import { defineStore } from 'pinia'
import { APackage, TPigItem, PigItem, PigItemType } from '../common/schema/pig/ts/pig-metaclasses'
import { LOG } from '../common/lib/messages'

// Legacy localStorage key, no longer used for persistence (kept only to remove
// any leftover data from previous versions). localStorage is limited to ~5-10 MB
// per origin, which is too small for large imported files (e.g. sizeable JSON-LD
// documents), so persistence has moved to IndexedDB, which supports much larger
// quotas (typically hundreds of MB or more).
const LEGACY_STORAGE_KEY = 'cascara-packages';

// Pre-existing installations of this (unchanged) DB_VERSION 3 object store may still hold
// a single legacy record under this key: the entire package array, JSON-encoded as it was
// written by an older version of this cache (before items were persisted one-per-id). That
// shape is incompatible with the current per-item record format and is not migrated - it is
// simply discarded, and the cache behaves as if freshly installed (see loadFromStorage()).
const LEGACY_PACKAGES_KEY = 'packages';

const DB_NAME = 'cascara-db';
// Shared with asset-cache.ts's database; bumped to add the 'assetCache' store.
// Keep in sync with asset-cache.ts's DB_VERSION.
const DB_VERSION = 3;
const STORE_NAME = 'itemCache';

/**
 * A simple class for IndexedDB to persist the item cache: each item (package or
 * graph item) is stored as its own record, keyed by its id.
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
     * Persist several items at once, each under its own id, in a single transaction.
     * Each entry is [id, plainData].
     */
    static async setItems(entries: [string, any][]): Promise<void> {
        const db = await idb.open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.clear();
                for (const [id, data] of entries) store.put(data, id);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    }

    /**
     * Read all persisted items' plain JSON data (ids are not needed, each item
     * carries its own 'id' field), or an empty array if nothing is stored.
     */
    static async getAll(): Promise<any[]> {
        const db = await idb.open();
        try {
            return await new Promise<any[]>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).getAll();
                req.onsuccess = () => resolve(req.result ?? []);
                req.onerror = () => reject(req.error);
            });
        } finally {
            db.close();
        }
    }

    /**
     * Count the persisted items, without reading their data.
     */
    static async count(): Promise<number> {
        const db = await idb.open();
        try {
            return await new Promise<number>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } finally {
            db.close();
        }
    }

    /**
     * Remove a single record by key, if present. Used to purge legacy/incompatible
     * records (e.g. the pre-granular 'packages' blob) without touching other records.
     */
    static async deleteKey(key: string): Promise<void> {
        const db = await idb.open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    }

    /**
     * Remove all persisted items from IndexedDB.
     */
    static async clear(): Promise<void> {
        const db = await idb.open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).clear();
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
 * Serialize one cached item to its plain JSON persistence shape: packages are
 * serialized via getWithProxies() (graph as lightweight { id, itemType } proxies,
 * to avoid duplicating items shared by several packages), all other items via get().
 */
function toStorageRecord(itm: TPigItem): any {
    return itm.itemType === PigItemType.aPackage
        ? (itm as APackage).getWithProxies()
        : (itm as any).get();
}
/**
 * Instantiate one persisted, non-package item record via its regular set().
 */
function instantiateItemRecord(data: any): TPigItem | undefined {
    const itm = PigItem.create(data.itemType);
    if (!itm) {
        LOG.error(`[ItemCache] Unable to instantiate item '${data.id}' of type '${data.itemType}'`);
        return undefined;
    }
    (itm as any).set(data);
    return itm as TPigItem;
}

/**
 * Check whether a value read from storage looks like a valid item record (as written
 * by toStorageRecord()), as opposed to legacy/incompatible data such as the pre-granular
 * 'packages' blob (a JSON-encoded array stored as a single record - not an object with
 * 'id'/'itemType' fields).
 */
function isValidItemRecord(data: any): boolean {
    return !!data && typeof data === 'object' && !Array.isArray(data)
        && typeof data.id === 'string' && typeof data.itemType === 'string';
}

/**
 * Instantiate all persisted records in an order that guarantees every graph proxy
 * can be resolved to an already-instantiated instance when a package's graph is built:
 * 1. All non-package items first (they never reference other items by id).
 * 2. Packages whose graph contains no nested package proxies.
 * 3. Remaining packages, in dependency order (a package is only instantiated once
 *    every nested package it references has been instantiated), innermost first,
 *    working up the hierarchy.
 * Packages are only instantiated here, their 'graph' is resolved from proxies to
 * canonical instances in the very same step, since by then every item/package they
 * can reference is already instantiated.
 */
function instantiateRecords(records: any[]): TPigItem[] {
    const byId = new Map<string, TPigItem>();
    const items: TPigItem[] = [];

    // 1. Non-package items first
    const packageRecords: any[] = [];
    for (const data of records) {
        if (!isValidItemRecord(data)) continue;
        if (data.itemType === PigItemType.aPackage) {
            packageRecords.push(data);
            continue;
        }
        const itm = instantiateItemRecord(data);
        if (itm) {
            byId.set(itm.id, itm);
            items.push(itm);
        }
    }

    // 2./3. Packages, innermost (no nested package dependencies) first, then up the hierarchy
    const pendingPackages = new Map<string, any>();
    for (const data of packageRecords) pendingPackages.set(data.id, data);

    while (pendingPackages.size > 0) {
        // A package is ready once every nested package it references (graph proxies
        // of itemType aPackage) has already been instantiated:
        const ready = Array.from(pendingPackages.values()).filter(data =>
            (data.graph || []).every((proxy: any) =>
                proxy?.itemType !== PigItemType.aPackage || byId.has(proxy.id))
        );

        if (ready.length === 0) {
            // Circular or otherwise unresolvable package references: instantiate the
            // rest as-is to avoid an infinite loop; unresolved proxies are logged
            // as warnings by setWithProxies().
            LOG.warn(`[ItemCache] Detected circular or unresolvable nested package references among: ${Array.from(pendingPackages.keys()).join(', ')}`);
            ready.push(...pendingPackages.values());
        }

        for (const data of ready) {
            const pkg = PigItem.create(PigItemType.aPackage) as APackage | null;
            pendingPackages.delete(data.id);
            if (!pkg) {
                LOG.error(`[ItemCache] Unable to instantiate package '${data.id}'`);
                continue;
            }
            pkg.setWithProxies(data, (id) => byId.get(id));
            byId.set(pkg.id, pkg);
            items.push(pkg);
        }
    }

    return items;
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
            // LOG.debug(`[ItemCache] Processing incoming item '${incoming.id}' (${incoming.itemType}) - existing: ${existing?.id} from ${existing ? (existing as any).modified : 'N/A'}`);
            if (!existing) {
                // Brand-new item: add as-is and register it as the new canonical instance
                this.items.push(incoming);
                byId.set(incoming.id, incoming);
                continue;
            }

            // LOG.debug(`[ItemCache] Testing existing item with incoming data '${incoming.id}' (${incoming.itemType}) from ${incoming.modified}`);
            // LOG.debug(`[ItemCache] Existing item '${existing.id}' and incoming data '${incoming.id}': ${existing.id===incoming.id}`);

            // An incoming item without a 'modified' date cannot be shown to be
            // newer than the cached one, so skip the update and keep the
            // existing item as-is (it is not stored twice).
            const incomingModified = (incoming as any).modified;
            if (!incomingModified) {
                // LOG.debug(`[ItemCache] Incoming item '${incoming.id}' has no 'modified' date, skipping update`);
                continue;
            }
            // LOG.debug(`[ItemCache] Updating existing item with incoming data '${incoming.id}' (${incoming.itemType})`);

            const existingModified = (existing as any).modified ?? '';
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
    * Save all items (packages and graph items alike) to IndexedDB, one record per id.
    * Packages are persisted with their 'graph' as lightweight proxies (see
    * toStorageRecord()), so an item shared by several packages is stored only once.
    * @returns true if the items were successfully written to and verified in storage
    */
    async saveToStorage(): Promise<boolean> {
        try {
            const entries: [string, any][] = this.items.map(itm => [itm.id, toStorageRecord(itm as TPigItem)]);
            await idb.setItems(entries)

            // Verify the write actually persisted the expected number of items
            const verifyCount = await idb.count()
            if (verifyCount !== entries.length) {
                LOG.error(`[ItemCache] Verification failed after saving to storage: expected ${entries.length} item(s), found ${verifyCount}`)
                return false
            }

            LOG.info(`[ItemCache] Saved ${entries.length} item(s) to storage`)
            return true
        } catch (error) {
            LOG.error('[ItemCache] Failed to save to storage:', error)
            return false
        }
    },

    /**
     * Load all items from IndexedDB, instantiate them, and resolve each package's
     * proxy-only 'graph' back to the canonical, already-instantiated item instances.
     */
    async loadFromStorage(): Promise<void> {
      try {
        // Remove any leftover data from the old localStorage-based persistence
        // @ToDo: This can be removed some time in the future.
        try {
            localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch { /* ignore */ }

        // Purge the legacy pre-granular 'packages' record (a single JSON-encoded array),
        // if present. It is incompatible with the current per-item record format and is
        // intentionally discarded rather than migrated - affected installations simply
        // start with an empty cache, as on a fresh install.
        try {
            await idb.deleteKey(LEGACY_PACKAGES_KEY)
        } catch (error) {
            LOG.error('[ItemCache] Failed to purge legacy packages record:', error)
        }

        const records = await idb.getAll()
        const validRecords = records.filter(isValidItemRecord)
        if (validRecords.length !== records.length) {
            LOG.warn(`[ItemCache] Discarded ${records.length - validRecords.length} incompatible legacy record(s) found in storage`)
        }
        if (validRecords.length > 0) {
            const items = instantiateRecords(validRecords);
            this.items = items;
            LOG.info(`[ItemCache] Loaded ${items.length} item(s) from storage`);
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
