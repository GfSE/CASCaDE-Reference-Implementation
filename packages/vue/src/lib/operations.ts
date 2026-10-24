import { ItemCache } from '../stores/item-cache';
import { TPigItem, TPigId, APackage } from '@cascara/common/schema/pig/ts/pig-metaclasses';
import { LOG } from '@cascara/common/lib/messages';

/**
 * Operations working on APackage instances held in the ItemCache.
 * Bridges between cache lookups (by id) and APackage's own graph manipulation
 * (addItem()/removeItem()), so pig-metaclasses.ts itself stays cache-agnostic.
 */
export class Operations {
    /**
     * Add already-instantiated items (identified by id) from the cache to a package's graph.
     * The items are not removed from the cache, nor duplicated - they continue to be shared
     * (same instance) between the cache and the package's graph.
     * Logs a warning for every itemId that has no corresponding instantiated item in the cache,
     * and for the packageId itself if it does not resolve to a cached package.
     * @param packageId - id of the APackage (already present in the cache) to add items to
     * @param itemIds - ids of the already-instantiated items to add to the package
     */
    static async addItemToAPackage(packageId: TPigId, itemIds: TPigId[]): Promise<void> {
        const cache = ItemCache();
        if (!cache.initialized)
            await cache.loadFromStorage();

        const pkg = cache.packages.find(p => p.id === packageId);
        if (!pkg) {
            LOG.warn(`Operations.addItemToAPackage: no package found in cache with id '${packageId}'`);
            return;
        }

        const itemsToAdd: TPigItem[] = [];
        for (const itemId of itemIds) {
            const item = cache.items.find(itm => itm.id === itemId);
            if (!item) {
                LOG.warn(`Operations.addItemToAPackage: no instantiated item found in cache with id '${itemId}'`);
                continue;
            }
            if (item.id === packageId) {
                LOG.warn(`Operations.addItemToAPackage: package '${packageId}' cannot contain itself`);
                continue;
            }
            itemsToAdd.push(item as TPigItem);
        }

        if (itemsToAdd.length === 0)
            return;

        pkg.addItem(itemsToAdd);
        await cache.saveToStorage();
    }

    /**
     * Remove items (identified by id) from a package's graph, without deleting them from the cache.
     * Logs a warning for the packageId if it does not resolve to a cached package; warnings for
     * individual itemIds not present in the package's graph are logged by APackage.removeItem() itself.
     * @param packageId - id of the APackage (already present in the cache) to remove items from
     * @param itemIds - ids of the items to remove from the package's graph
     */
    static async removeItemFromAPackage(packageId: TPigId, itemIds: TPigId[]): Promise<void> {
        const cache = ItemCache();
        if (!cache.initialized)
            await cache.loadFromStorage();

        const pkg = cache.packages.find(p => p.id === packageId);
        if (!pkg) {
            LOG.warn(`Operations.removeItemFromAPackage: no package found in cache with id '${packageId}'`);
            return;
        }

        pkg.removeItem(itemIds);
        await cache.saveToStorage();
    }
}
