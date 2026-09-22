import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { LOG, TISODateString } from '../common/lib/helpers'
import { TRevision } from '../common/schema/pig/ts/pig-metaclasses'

/**
 * Descriptor for a single binary asset (e.g. an image referenced by a package),
 * held in-memory and persisted alongside the item cache.
 */
export interface IAsset {
    /** Filename, including a relative path (e.g. 'images/logo.png') */
    filename: string;
    /** File extension, including the leading dot (e.g. '.png' or '.svg') */
    extension: string;
    /** MIME type of the asset's content (e.g. 'image/png') */
    mimeType: string;
    /** Binary file content */
    blob: Blob;
    /** Last modification timestamp (ISO date string) */
    modified?: TISODateString;
    /** Current revision identifier */
    revision?: TRevision;
    /** Prior revision identifier(s), most recent first */
    priorRevision?: TRevision[];
    /** Creator of the asset */
    creator?: string;
}

const DB_NAME = 'cascara-db';
// Shared with item-cache.ts's database; bumped to add the 'assetCache' store.
// Keep in sync with item-cache.ts's DB_VERSION.
const DB_VERSION = 3;
const STORE_NAME = 'assetCache';
const RECORD_KEY = 'assets';

/**
 * A simple class for IndexedDB to persist the asset cache.
 * Stores the array of IAsset objects directly (not JSON-stringified), since
 * IndexedDB natively supports structured cloning of Blobs.
 */
class idb {
    /**
     * Open (and if necessary create) the IndexedDB database used to persist the asset cache.
     * Also (defensively) ensures the 'itemCache' store used by item-cache.ts exists,
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
                if (!db.objectStoreNames.contains('itemCache')) {
                    db.createObjectStore('itemCache');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Persist the asset array in IndexedDB under the fixed record key.
     */
    static async set(assets: IAsset[]): Promise<void> {
        const db = await idb.open();
        try {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(assets, RECORD_KEY);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error);
            });
        } finally {
            db.close();
        }
    }

    /**
     * Read the persisted asset array from IndexedDB, or undefined if nothing is stored.
     */
    static async get(): Promise<IAsset[] | undefined> {
        const db = await idb.open();
        try {
            return await new Promise<IAsset[] | undefined>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
                req.onsuccess = () => resolve(req.result as IAsset[] | undefined);
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

export const AssetCache = defineStore('assetCache', {
  state: () => ({
    // Flat list of asset descriptors (filename, extension, mimeType, blob).
    assets: [] as IAsset[],
    // becomes true once loadFromStorage() has completed (successfully or not),
    // so callers can tell an empty cache apart from a not-yet-initialized one
    initialized: false
  }),
  getters: {
    /**
     * Whether the cache currently holds any asset in memory.
     * Note: this only reflects the in-memory state; call loadFromStorage() first
     * (e.g. once during app bootstrap) if assets might still be persisted only.
     */
    hasData(state): boolean {
        return state.assets.length > 0;
    }
  },
  actions: {
    /**
     * Set assets and persist them to IndexedDB.
     * Fully replaces whatever was cached/persisted before.
     * @returns true if the assets were successfully persisted
     */
    async set(assets: IAsset[]): Promise<boolean> {
        this.assets = assets
        return await this.saveToStorage()
    },

    /**
     * Add or update assets (matched by filename) and persist them to IndexedDB.
     * - If no cached asset with that filename exists yet, it is added as new.
     * - If a cached asset with that filename exists, it is only replaced when the
     *   incoming asset is newer (by 'modified'); a missing 'modified' on either side
     *   is treated as the oldest possible date, similar to ItemCache.update().
     * @returns true if the assets were successfully persisted
     */
    async update(assets: IAsset[]): Promise<boolean> {
        const byFilename = new Map<string, IAsset>();
        for (const asset of this.assets) byFilename.set(asset.filename, asset);

        for (const incoming of assets) {
            const existing = byFilename.get(incoming.filename);
            if (!existing) {
                // Brand-new asset: add as-is
                byFilename.set(incoming.filename, incoming);
                continue;
            }

            // Treat a missing 'modified' as the oldest possible date, so an
            // incoming asset with a defined 'modified' always wins.
            const existingModified = existing.modified ?? '';
            const incomingModified = incoming.modified ?? '';
            if (existingModified >= incomingModified) {
                continue; // cached asset is the same age or newer, keep it as-is
            }

            const rev = existing.revision;
            const updated: IAsset = { ...incoming };
            if (rev && (!updated.priorRevision || updated.priorRevision.length === 0)) {
                updated.priorRevision = [rev];
            }

            byFilename.set(incoming.filename, updated);
        }

        this.assets = Array.from(byFilename.values());
        return await this.saveToStorage()
    },

    /**
    * Explicitly replace the entire cache (memory + persisted storage) with new assets.
    * Removes any previous entry first, to avoid a partial/stale merge on save failure.
    * @returns true if the assets were successfully persisted
    */
    async replace(assets: IAsset[]): Promise<boolean> {
        try {
            await idb.clear()
        } catch (error) {
            LOG.error('[AssetCache] Failed to clear storage before replace:', error)
        }
        return await this.set(assets);
    },

    /**
    * Get assets from cache. If cache has not been initialized yet, try to load from storage first.
    * @returns Flat array of asset descriptors
    */
    async get(): Promise<IAsset[]> {
        if (!this.initialized) {
            await this.loadFromStorage()
        }
        return this.assets as IAsset[];
    },

    /**
    * Save assets to IndexedDB.
    * @returns true if the assets were successfully written to and verified in storage
    */
    async saveToStorage(): Promise<boolean> {
        try {
            // Pinia wraps state (and nested objects, including Blobs) in reactive
            // proxies. IndexedDB's structured clone algorithm cannot clone Vue's
            // reactive Proxy objects, so unwrap each asset (and its Blob) to its
            // raw form before persisting.
            const rawAssets = this.assets.map((asset) => ({ ...toRaw(asset), blob: toRaw(asset.blob) }));
            LOG.debug('[AssetCache] Saving assets to storage:', rawAssets);
            await idb.set(rawAssets)

            // Verify the write actually persisted the expected number of assets
            const verify = await idb.get()
            const verifyCount = verify?.length ?? 0
            if (verifyCount !== this.assets.length) {
                LOG.error(`[AssetCache] Verification failed after saving to storage: expected ${this.assets.length} asset(s), found ${verifyCount}`)
                return false
            }

            LOG.info(`[AssetCache] Saved ${this.assets.length} asset(s) to storage`)
            return true
        } catch (error) {
            LOG.error('[AssetCache] Failed to save to storage:', error)
            return false
        }
    },

    /**
     * Load assets from IndexedDB.
     */
    async loadFromStorage(): Promise<void> {
      try {
        const stored = await idb.get()
        if (stored) {
            this.assets = stored;
            LOG.info(`[AssetCache] Loaded ${this.assets.length} asset(s) from storage`);
        }
      } catch (error) {
        LOG.error('[AssetCache] Failed to load from storage:', error)
        this.assets = []
      } finally {
        this.initialized = true
      }
    },

    /**
     * Clear all assets
     */
    async clear(): Promise<void> {
        this.assets = []
        try {
            await idb.clear()
        } catch (error) {
            LOG.error('[AssetCache] Failed to clear storage:', error)
        }
        LOG.info('[AssetCache] Cleared cache')
    }
  }
})
