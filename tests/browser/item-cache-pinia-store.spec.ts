// Real-browser smoke test for the ItemCache Pinia store, exercised through an actual
// user-visible operation (ReqIF import UI) rather than internal app/store access, so it
// validates persistence to IndexedDB and in-memory cache behavior as a real user would see it.
import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('ItemCache Pinia store (real browser import)', () => {
    test.beforeEach(({ page }) => {
        page.on('pageerror', (error) => {
            console.log(`[browser page error] ${error.message}`);
        });
    });

    test('importing a ReqIF file populates the ItemCache store and persists it to IndexedDB', async ({ page }) => {
        await page.goto('/interfaces');

        // Open the ReqIF import dialog
        await page.getByRole('button', { name: /ReqIF/ }).click();

        // Pick the real fixture file via the dialog's file input
        const fixturePath = path.resolve(__dirname, '../../packages/common/data/ReqIF/Related-Terms.reqif');
        await page.locator('input[type="file"]').first().setInputFiles(fixturePath);

        // Submit the import (first import shows a single 'Import' button)
        await page.getByRole('button', { name: 'Import' }).click();

        // The app navigates to the Document page once the import is persisted successfully
        await page.waitForURL(/\/document$/, { timeout: 15000 });

        // The imported package's outline should now be rendered from ItemCache's in-memory state
        await expect(page.locator('.pane-card', { hasText: 'Outline' })).toBeVisible();

        // Verify the data was actually persisted to IndexedDB (not just held in memory),
        // confirming ItemCache.saveToStorage()/loadFromStorage() round-trip in a real browser.
        const persistedItemCount = await page.evaluate(() => {
            return new Promise<number>((resolve, reject) => {
                const request = indexedDB.open('cascara-db');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    const tx = db.transaction('itemCache', 'readonly');
                    const store = tx.objectStore('itemCache');
                    const countRequest = store.count();
                    countRequest.onsuccess = () => resolve(countRequest.result);
                    countRequest.onerror = () => reject(countRequest.error);
                };
            });
        });

        expect(persistedItemCount).toBeGreaterThan(0);

        // Reloading the app should rehydrate the store from IndexedDB (loadFromStorage()
        // is called during app bootstrap), proving the persisted data is actually usable.
        await page.reload();
        await page.goto('/document');
        await expect(page.locator('.pane-card', { hasText: 'Outline' })).toBeVisible();
    });
});
