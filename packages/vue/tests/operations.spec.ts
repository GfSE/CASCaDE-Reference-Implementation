/*!
 * JEST Test Suite for the Operations class - addItemToAPackage() / removeItemFromAPackage()
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { setActivePinia, createPinia } from 'pinia';
import { APackage, IAPackage, PigItemType } from '../../common/src/schema/pig/ts/pig-metaclasses';

// The ItemCache store persists to IndexedDB (via saveToStorage()/loadFromStorage()),
// which is not available in the Node test environment. Since this suite is only
// concerned with the in-memory management of packages/items (not persistence),
// IndexedDB access is mocked out so that saveToStorage() resolves without touching
// a real database.
(global as any).indexedDB = {
    open: () => {
        throw new Error('IndexedDB is not available in this test environment');
    }
};

import { ItemCache } from '../src/stores/item-cache';
import { Operations } from '../src/lib/operations';

describe('Operations - addItemToAPackage() / removeItemFromAPackage()', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        // Silence expected log output from the mocked-out IndexedDB persistence failure
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * Build a minimal, valid package with an Entity class and two anEntity instances.
     */
    function createTestPackage(pkgId: string, itemIds: [string, string]): IAPackage {
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
                    id: itemIds[0],
                    instanceOf: 'o:TestEntity',
                    title: [{ value: 'Item 1', lang: 'en' }],
                    revision: '1',
                    modified: '2025-01-01T00:00:00Z'
                },
                {
                    itemType: PigItemType.anEntity,
                    id: itemIds[1],
                    instanceOf: 'o:TestEntity',
                    title: [{ value: 'Item 2', lang: 'en' }],
                    revision: '1',
                    modified: '2025-01-01T00:00:00Z'
                }
            ]
        } as unknown as IAPackage;
    }

    it('addItemToAPackage() adds an existing cached item to another package\'s graph, without removing it from the cache', async () => {
        const cache = ItemCache();

        const pkg1 = new APackage().set(createTestPackage('d:pkg-1', ['d:item-1', 'd:item-2']));
        if (!pkg1.status().ok) console.error('status pkg1:', pkg1.status());
        expect(pkg1.status().ok).toBe(true);

        await cache.set(pkg1.getItems());

        const pkg2 = new APackage().set(createTestPackage('d:pkg-2', ['d:item-3', 'd:item-4']));
        if (!pkg2.status().ok) console.error('status pkg2:', pkg2.status());
        expect(pkg2.status().ok).toBe(true);

        await cache.update(pkg2.getItems());
        // Test-only workaround: cache.set()/update() seed 'items' directly but don't flip
        // 'initialized', which real loadFromStorage() would do. Since IndexedDB is mocked
        // to throw above, Operations' '!cache.initialized' check would otherwise trigger
        // loadFromStorage() here and wipe the in-memory items we just set. Not a design
        // flaw of ItemCache - loadFromStorage() always sets 'initialized' in production.
        cache.initialized = true;

        const itemCountBefore = cache.items.length;

        await Operations.addItemToAPackage('d:pkg-2', ['d:item-1']);

        // item was added to pkg-2's graph:
        const updatedPkg2 = cache.packages.find(p => p.id === 'd:pkg-2')!;
        expect(updatedPkg2.graph.some(itm => itm.id === 'd:item-1')).toBe(true);

        // item is still present (and shared, same instance) in the cache and in pkg-1's graph:
        expect(cache.items.length).toBe(itemCountBefore);
        const updatedPkg1 = cache.packages.find(p => p.id === 'd:pkg-1')!;
        const itemInPkg1 = updatedPkg1.graph.find(itm => itm.id === 'd:item-1');
        const itemInPkg2 = updatedPkg2.graph.find(itm => itm.id === 'd:item-1');
        expect(itemInPkg1).toBe(itemInPkg2);
    });

    it('addItemToAPackage() logs a warning and does nothing when the package id is unknown', async () => {
        const cache = ItemCache();
        const pkg = new APackage().set(createTestPackage('d:pkg-1', ['d:item-1', 'd:item-2']));
        expect(pkg.status().ok).toBe(true);
        await cache.set(pkg.getItems());
        // Test-only workaround: cache.set() seeds 'items' directly but doesn't flip
        // 'initialized', which real loadFromStorage() would do. Since IndexedDB is mocked
        // to throw above, Operations' '!cache.initialized' check would otherwise trigger
        // loadFromStorage() here and wipe the in-memory items we just set. Not a design
        // flaw of ItemCache - loadFromStorage() always sets 'initialized' in production.
        cache.initialized = true;

        const warnSpy = console.warn;

        await Operations.addItemToAPackage('d:does-not-exist', ['d:item-1']);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('d:does-not-exist'));
        // nothing else changed:
        expect(cache.packages).toHaveLength(1);
    });

    it('addItemToAPackage() logs a warning for an itemId that has no instantiated item in the cache', async () => {
        const cache = ItemCache();
        const pkg = new APackage().set(createTestPackage('d:pkg-1', ['d:item-1', 'd:item-2']));
        expect(pkg.status().ok).toBe(true);
        await cache.set(pkg.getItems());
        // Test-only workaround: cache.set() seeds 'items' directly but doesn't flip
        // 'initialized', which real loadFromStorage() would do. Since IndexedDB is mocked
        // to throw above, Operations' '!cache.initialized' check would otherwise trigger
        // loadFromStorage() here and wipe the in-memory items we just set. Not a design
        // flaw of ItemCache - loadFromStorage() always sets 'initialized' in production.
        cache.initialized = true;

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await Operations.addItemToAPackage('d:pkg-1', ['d:does-not-exist']);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('d:does-not-exist'));
        const updatedPkg = cache.packages.find(p => p.id === 'd:pkg-1')!;
        expect(updatedPkg.graph.some(itm => itm.id === 'd:does-not-exist')).toBe(false);
        warnSpy.mockRestore();
    });

    it('removeItemFromAPackage() removes an item from the package\'s graph but keeps it in the cache', async () => {
        const cache = ItemCache();
        const pkg = new APackage().set(createTestPackage('d:pkg-1', ['d:item-1', 'd:item-2']));
        expect(pkg.status().ok).toBe(true);
        await cache.set(pkg.getItems());
        // Test-only workaround: cache.set() seeds 'items' directly but doesn't flip
        // 'initialized', which real loadFromStorage() would do. Since IndexedDB is mocked
        // to throw above, Operations' '!cache.initialized' check would otherwise trigger
        // loadFromStorage() here and wipe the in-memory items we just set. Not a design
        // flaw of ItemCache - loadFromStorage() always sets 'initialized' in production.
        cache.initialized = true;

        const itemCountBefore = cache.items.length;

        await Operations.removeItemFromAPackage('d:pkg-1', ['d:item-1']);

        const updatedPkg = cache.packages.find(p => p.id === 'd:pkg-1')!;
        expect(updatedPkg.graph.some(itm => itm.id === 'd:item-1')).toBe(false);

        // the item itself is still present in the cache, it was not deleted:
        expect(cache.items.length).toBe(itemCountBefore);
        expect(cache.items.some(itm => itm.id === 'd:item-1')).toBe(true);
    });

    it('removeItemFromAPackage() logs a warning and does nothing when the package id is unknown', async () => {
        const cache = ItemCache();
        const pkg = new APackage().set(createTestPackage('d:pkg-1', ['d:item-1', 'd:item-2']));
        expect(pkg.status().ok).toBe(true);
        await cache.set(pkg.getItems());
        // Test-only workaround: cache.set() seeds 'items' directly but doesn't flip
        // 'initialized', which real loadFromStorage() would do. Since IndexedDB is mocked
        // to throw above, Operations' '!cache.initialized' check would otherwise trigger
        // loadFromStorage() here and wipe the in-memory items we just set. Not a design
        // flaw of ItemCache - loadFromStorage() always sets 'initialized' in production.
        cache.initialized = true;

        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await Operations.removeItemFromAPackage('d:does-not-exist', ['d:item-1']);

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('d:does-not-exist'));
        const updatedPkg = cache.packages.find(p => p.id === 'd:pkg-1')!;
        expect(updatedPkg.graph.some(itm => itm.id === 'd:item-1')).toBe(true);
        warnSpy.mockRestore();
    });
});
