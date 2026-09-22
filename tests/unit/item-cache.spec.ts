/*!
 * JEST Test Suite for the ItemCache store's update() method
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { setActivePinia, createPinia } from 'pinia';
import { APackage, AnEntity, IAPackage, PigItemType } from '../../src/common/schema/pig/ts/pig-metaclasses';

// The ItemCache store persists to IndexedDB (via saveToStorage()/loadFromStorage()),
// which is not available in the Node test environment. Since this suite is only
// concerned with the in-memory update() logic (not persistence), IndexedDB access
// is mocked out so that saveToStorage() resolves without touching a real database.
(global as any).indexedDB = {
    open: () => {
        throw new Error('IndexedDB is not available in this test environment');
    }
};

import { ItemCache } from '../../src/stores/item-cache';

describe('ItemCache store - update()', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        // Silence expected error logs from the mocked-out IndexedDB persistence failure
        jest.spyOn(require('../../src/common/lib/helpers').LOG, 'error').mockImplementation(() => {});
        jest.spyOn(require('../../src/common/lib/helpers').LOG, 'warn').mockImplementation(() => {});
        jest.spyOn(require('../../src/common/lib/helpers').LOG, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Build a minimal, valid package with an Entity class and two anEntity instances.
     */
    function createTestPackage(): IAPackage {
        return {
            instanceOf: PigItemType.Package,
            itemType: PigItemType.aPackage,
            id: 'd:test-package',
            title: [{ value: 'Test Package', lang: 'en' }],
            modified: '2026-02-10T00:00:00Z',
            'context': [
                { tag: 'owl', uri: 'http://www.w3.org/2002/07/owl#' },
                { tag: 'cas', uri: 'https://example.org/metamodel/' },
                { tag: 'o', uri: 'https://example.org/ontology/' },
                { tag: 'd', uri: 'https://example.org/data/' }
            ],
            graph: [
                {
                    itemType: PigItemType.Entity,
                    id: 'o:TestEntity',
                    instanceOf: 'owl:Class',
                    title: [{ value: 'Test Entity', lang: 'en' }]
                },
                {
                    itemType: PigItemType.anEntity,
                    id: 'd:item-1',
                    instanceOf: 'o:TestEntity',
                    title: [{ value: 'Item 1', lang: 'en' }],
                    revision: '1',
                    modified: '2025-01-01T00:00:00Z'
                },
                {
                    itemType: PigItemType.anEntity,
                    id: 'd:item-2',
                    instanceOf: 'o:TestEntity',
                    title: [{ value: 'Item 2', lang: 'en' }],
                    revision: '1',
                    modified: '2025-01-01T00:00:00Z'
                }
            ]
        } as unknown as IAPackage;
    }

    /**
     * Build a minimal, valid package with an Entity class and two anEntity instances,
     * with configurable package id, item ids and 'modified' timestamps - used to build
     * scenarios where two packages share one item (by id) but not the other.
     */
    function createPackageWithItems(
        pkgId: string,
        item1: { id: string; title: string; modified: string },
        item2: { id: string; title: string; modified: string }
    ): IAPackage {
        return {
            instanceOf: PigItemType.Package,
            itemType: PigItemType.aPackage,
            id: pkgId,
            title: [{ value: 'Test Package', lang: 'en' }],
            modified: '2026-02-10T00:00:00Z',
            'context': [
                { tag: 'owl', uri: 'http://www.w3.org/2002/07/owl#' },
                { tag: 'cas', uri: 'https://example.org/metamodel/' },
                { tag: 'o', uri: 'https://example.org/ontology/' },
                { tag: 'd', uri: 'https://example.org/data/' }
            ],
            graph: [
                {
                    itemType: PigItemType.Entity,
                    id: 'o:TestEntity',
                    instanceOf: 'owl:Class',
                    title: [{ value: 'Test Entity', lang: 'en' }]
                },
                {
                    itemType: PigItemType.anEntity,
                    id: item1.id,
                    instanceOf: 'o:TestEntity',
                    title: [{ value: item1.title, lang: 'en' }],
                    revision: '1',
                    modified: item1.modified
                },
                {
                    itemType: PigItemType.anEntity,
                    id: item2.id,
                    instanceOf: 'o:TestEntity',
                    title: [{ value: item2.title, lang: 'en' }],
                    revision: '1',
                    modified: item2.modified
                }
            ]
        } as unknown as IAPackage;
    }

    it('should update an item in place when the incoming version is newer, and the package graph reflects the new data', async () => {
        const cache = ItemCache();

        const pkg = new APackage().set(createTestPackage());
        if (!pkg.status().ok) console.error('status:', pkg.status());
        expect(pkg.status().ok).toBe(true);

        const items = pkg.getItems();
        await cache.set(items);

        // Sanity check on the initial state
        const originalItem1 = cache.items.find(itm => itm.id === 'd:item-1') as any;
        expect(originalItem1).toBeDefined();
        expect(originalItem1.title[0].value).toBe('Item 1');

        // Prepare a newer version of 'd:item-1', applied directly (not via a package):
        const newItem1 = new AnEntity().set({
            itemType: PigItemType.anEntity,
            id: 'd:item-1',
            instanceOf: 'o:TestEntity',
            title: [{ value: 'Item 1 Updated', lang: 'en' }],
            revision: '1',
            modified: '2025-06-01T00:00:00Z'
        } as any);
        expect(newItem1.status().ok).toBe(true);

        await cache.update([newItem1 as any]);

        // The top-level cache entry must reflect the update...
        const cachedItem1 = cache.items.find(itm => itm.id === 'd:item-1') as any;
        expect(cachedItem1).toBeDefined();
        expect(cachedItem1.title[0].value).toBe('Item 1 Updated');
        expect(cachedItem1.modified).toBe('2025-06-01T00:00:00Z');

        // ...and it must be the very same instance as before (identity preserved):
        expect(cachedItem1).toBe(originalItem1);

        // The package in the cache must still reference the very same (now updated) item:
        const cachedPackage = cache.packages.find(p => p.id === 'd:test-package') as APackage;
        expect(cachedPackage).toBeDefined();
        const graphItem1 = cachedPackage.graph.find((itm: any) => itm.id === 'd:item-1') as any;
        expect(graphItem1).toBe(cachedItem1);
        expect(graphItem1.title[0].value).toBe('Item 1 Updated');

        // The other item must remain unaffected
        const item2 = cache.items.find(itm => itm.id === 'd:item-2') as any;
        expect(item2.title[0].value).toBe('Item 2');
    });

    it('should NOT update an item when the incoming version is older, neither at the top level nor in the package graph', async () => {
        const cache = ItemCache();

        const pkg = new APackage().set(createTestPackage());
        if (!pkg.status().ok) console.error('status:', pkg.status());
        expect(pkg.status().ok).toBe(true);

        const items = pkg.getItems();
        await cache.set(items);

        const originalItem1 = cache.items.find(itm => itm.id === 'd:item-1') as any;
        expect(originalItem1).toBeDefined();
        expect(originalItem1.title[0].value).toBe('Item 1');
        expect(originalItem1.modified).toBe('2025-01-01T00:00:00Z');

        // Prepare an OLDER version of 'd:item-1', applied directly (not via a package):
        const olderItem1Instance = new AnEntity().set({
            itemType: PigItemType.anEntity,
            id: 'd:item-1',
            instanceOf: 'o:TestEntity',
            title: [{ value: 'Item 1 Stale Update', lang: 'en' }],
            revision: '1',
            modified: '2024-01-01T00:00:00Z' // older than the cached '2025-01-01T00:00:00Z'
        } as any);
        expect(olderItem1Instance.status().ok).toBe(true);

        await cache.update([olderItem1Instance as any]);

        // The top-level cache entry must remain unchanged
        const cachedItem1 = cache.items.find(itm => itm.id === 'd:item-1') as any;
        expect(cachedItem1).toBeDefined();
        expect(cachedItem1.title[0].value).toBe('Item 1');
        expect(cachedItem1.modified).toBe('2025-01-01T00:00:00Z');
        expect(cachedItem1).toBe(originalItem1);

        // The package's graph entry must also remain unchanged
        const cachedPackage = cache.packages.find(p => p.id === 'd:test-package') as APackage;
        expect(cachedPackage).toBeDefined();
        const graphItem1 = cachedPackage.graph.find((itm: any) => itm.id === 'd:item-1') as any;
        expect(graphItem1).toBe(cachedItem1);
        expect(graphItem1.title[0].value).toBe('Item 1');
    });

    it('should merge a second package sharing one item with the first: the shared item is updated once (in place) and both packages reference the same canonical instance', async () => {
        const cache = ItemCache();

        // Package 1: 'd:shared-item' (older) and 'd:pkg1-only-item'
        const pkg1 = new APackage().set(createPackageWithItems(
            'd:package-1',
            { id: 'd:shared-item', title: 'Shared Item v1', modified: '2025-01-01T00:00:00Z' },
            { id: 'd:pkg1-only-item', title: 'Package 1 Only Item', modified: '2025-01-01T00:00:00Z' }
        ));
        if (!pkg1.status().ok) console.error('status pkg1:', pkg1.status());
        expect(pkg1.status().ok).toBe(true);

        await cache.set(pkg1.getItems());

        // Sanity check on the initial state: exactly one 'd:shared-item' at the top level
        expect(cache.items.filter(itm => itm.id === 'd:shared-item')).toHaveLength(1);
        const originalSharedItem = cache.items.find(itm => itm.id === 'd:shared-item') as any;
        expect(originalSharedItem.title[0].value).toBe('Shared Item v1');

        // Package 2: 'd:shared-item' (NEWER) and 'd:pkg2-only-item'
        const pkg2 = new APackage().set(createPackageWithItems(
            'd:package-2',
            { id: 'd:shared-item', title: 'Shared Item v2 (newer)', modified: '2025-06-01T00:00:00Z' },
            { id: 'd:pkg2-only-item', title: 'Package 2 Only Item', modified: '2025-01-01T00:00:00Z' }
        ));
        if (!pkg2.status().ok) console.error('status pkg2:', pkg2.status());
        expect(pkg2.status().ok).toBe(true);

        await cache.update(pkg2.getItems());

        // The shared item must exist exactly once at the top level, with the newer data,
        // and must be the very same (canonical, identity-preserved) instance as before:
        const sharedItems = cache.items.filter(itm => itm.id === 'd:shared-item');
        expect(sharedItems).toHaveLength(1);
        const cachedSharedItem = sharedItems[0] as any;
        expect(cachedSharedItem).toBe(originalSharedItem);
        expect(cachedSharedItem.title[0].value).toBe('Shared Item v2 (newer)');
        expect(cachedSharedItem.modified).toBe('2025-06-01T00:00:00Z');

        // Both packages must be present at the top level...
        const cachedPkg1 = cache.packages.find(p => p.id === 'd:package-1') as APackage;
        const cachedPkg2 = cache.packages.find(p => p.id === 'd:package-2') as APackage;
        expect(cachedPkg1).toBeDefined();
        expect(cachedPkg2).toBeDefined();

        // ...and both must reference the very same, now-updated canonical instance in their graph:
        const graphItemInPkg1 = cachedPkg1.graph.find((itm: any) => itm.id === 'd:shared-item') as any;
        const graphItemInPkg2 = cachedPkg2.graph.find((itm: any) => itm.id === 'd:shared-item') as any;
        expect(graphItemInPkg1).toBe(cachedSharedItem);
        expect(graphItemInPkg2).toBe(cachedSharedItem);
        expect(graphItemInPkg1.title[0].value).toBe('Shared Item v2 (newer)');
        expect(graphItemInPkg2.title[0].value).toBe('Shared Item v2 (newer)');

        // The items unique to each package must remain unaffected and present exactly once:
        expect(cache.items.filter(itm => itm.id === 'd:pkg1-only-item')).toHaveLength(1);
        expect(cache.items.filter(itm => itm.id === 'd:pkg2-only-item')).toHaveLength(1);
        expect((cache.items.find(itm => itm.id === 'd:pkg1-only-item') as any).title[0].value).toBe('Package 1 Only Item');
        expect((cache.items.find(itm => itm.id === 'd:pkg2-only-item') as any).title[0].value).toBe('Package 2 Only Item');
    });

    it('should merge a second package sharing one OLDER item with the first: the shared item keeps the first package\'s (newer) data and both packages reference the same canonical instance', async () => {
        const cache = ItemCache();

        // Package 1: 'd:shared-item' (NEWER) and 'd:pkg1-only-item'
        const pkg1 = new APackage().set(createPackageWithItems(
            'd:package-1',
            { id: 'd:shared-item', title: 'Shared Item v2 (newer)', modified: '2025-06-01T00:00:00Z' },
            { id: 'd:pkg1-only-item', title: 'Package 1 Only Item', modified: '2025-01-01T00:00:00Z' }
        ));
        if (!pkg1.status().ok) console.error('status pkg1:', pkg1.status());
        expect(pkg1.status().ok).toBe(true);

        await cache.set(pkg1.getItems());

        // Sanity check on the initial state: exactly one 'd:shared-item' at the top level
        expect(cache.items.filter(itm => itm.id === 'd:shared-item')).toHaveLength(1);
        const originalSharedItem = cache.items.find(itm => itm.id === 'd:shared-item') as any;
        expect(originalSharedItem.title[0].value).toBe('Shared Item v2 (newer)');

        // Package 2: 'd:shared-item' (OLDER) and 'd:pkg2-only-item'
        const pkg2 = new APackage().set(createPackageWithItems(
            'd:package-2',
            { id: 'd:shared-item', title: 'Shared Item v1 (stale)', modified: '2025-01-01T00:00:00Z' },
            { id: 'd:pkg2-only-item', title: 'Package 2 Only Item', modified: '2025-01-01T00:00:00Z' }
        ));
        if (!pkg2.status().ok) console.error('status pkg2:', pkg2.status());
        expect(pkg2.status().ok).toBe(true);

        await cache.update(pkg2.getItems());

        // The shared item must exist exactly once at the top level, retaining the newer data
        // from package 1 (the older incoming version must be ignored), and must still be the
        // very same (canonical, identity-preserved) instance as before:
        const sharedItems = cache.items.filter(itm => itm.id === 'd:shared-item');
        expect(sharedItems).toHaveLength(1);
        const cachedSharedItem = sharedItems[0] as any;
        expect(cachedSharedItem).toBe(originalSharedItem);
        expect(cachedSharedItem.title[0].value).toBe('Shared Item v2 (newer)');
        expect(cachedSharedItem.modified).toBe('2025-06-01T00:00:00Z');

        // Both packages must be present at the top level...
        const cachedPkg1 = cache.packages.find(p => p.id === 'd:package-1') as APackage;
        const cachedPkg2 = cache.packages.find(p => p.id === 'd:package-2') as APackage;
        expect(cachedPkg1).toBeDefined();
        expect(cachedPkg2).toBeDefined();

        // ...and both must reference the very same canonical instance in their graph,
        // still holding the newer data (package 2's stale data must not have won):
        const graphItemInPkg1 = cachedPkg1.graph.find((itm: any) => itm.id === 'd:shared-item') as any;
        const graphItemInPkg2 = cachedPkg2.graph.find((itm: any) => itm.id === 'd:shared-item') as any;
        expect(graphItemInPkg1).toBe(cachedSharedItem);
        expect(graphItemInPkg2).toBe(cachedSharedItem);
        expect(graphItemInPkg1.title[0].value).toBe('Shared Item v2 (newer)');
        expect(graphItemInPkg2.title[0].value).toBe('Shared Item v2 (newer)');

        // The items unique to each package must remain unaffected and present exactly once:
        expect(cache.items.filter(itm => itm.id === 'd:pkg1-only-item')).toHaveLength(1);
        expect(cache.items.filter(itm => itm.id === 'd:pkg2-only-item')).toHaveLength(1);
        expect((cache.items.find(itm => itm.id === 'd:pkg1-only-item') as any).title[0].value).toBe('Package 1 Only Item');
        expect((cache.items.find(itm => itm.id === 'd:pkg2-only-item') as any).title[0].value).toBe('Package 2 Only Item');
    });
});
