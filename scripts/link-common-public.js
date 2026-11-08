/*!
 * Ensure packages/common/public and packages/vue/data exist as links to their
 * respective counterparts (packages/vue/public and packages/common/data).
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * Common code (e.g. XSLT/SEF based importers, JSON-LD schema loading) resolves runtime
 * assets using the relative path './public/assets/...' from packages/common.
 * The actual assets live in packages/vue/public/assets (served by the Vue app).
 * Conversely, Vue tests resolve shared test fixtures using the relative path '../data/...'
 * from packages/vue/tests, while the actual fixtures live in packages/common/data.
 *
 * On a developer's Windows machine this is typically bridged with manually created
 * NTFS junctions (packages/common/public -> packages/vue/public and
 * packages/vue/data -> packages/common/data), which are excluded from Git (see
 * .gitignore) since junctions are not portable and must not be committed.
 *
 * This script recreates those links in a cross-platform way (Windows junction / POSIX
 * symlink) so that CI (Linux) and fresh clones work without relying on pre-existing,
 * manually created junctions. It is idempotent: if a valid link already exists, nothing
 * is done; if a stale link/file is found, it is replaced.
 *
 * Usage: node scripts/link-common-public.js
 */

const fs = require('fs');
const path = require('path');

const LINKS = [
    {
        link: path.resolve(__dirname, '..', 'packages', 'common', 'public'),
        target: path.resolve(__dirname, '..', 'packages', 'vue', 'public'),
    },
    {
        link: path.resolve(__dirname, '..', 'packages', 'vue', 'data'),
        target: path.resolve(__dirname, '..', 'packages', 'common', 'data'),
    },
];

function isLink(p) {
    try {
        const stat = fs.lstatSync(p);
        return stat.isSymbolicLink();
    } catch {
        return false;
    }
}

function ensureLink(linkPath, targetPath) {
    if (!fs.existsSync(targetPath)) {
        console.warn(`⚠️  Warning: link target does not exist: ${targetPath}`);
        return;
    }

    if (isLink(linkPath)) {
        // Already a symlink/junction; verify it resolves to the expected target.
        const resolved = fs.realpathSync(linkPath);
        const expected = fs.realpathSync(targetPath);
        if (resolved === expected) {
            console.log(`✅ Link already up to date: ${linkPath} -> ${targetPath}`);
            return;
        }
        console.log(`Removing stale link: ${linkPath}`);
        fs.unlinkSync(linkPath);
    } else if (fs.existsSync(linkPath)) {
        console.warn(`⚠️  Warning: ${linkPath} exists and is not a link; leaving it untouched.`);
        return;
    }

    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(targetPath, linkPath, type);
    console.log(`✅ Created ${type} link: ${linkPath} -> ${targetPath}`);
}

for (const { link, target } of LINKS) {
    ensureLink(link, target);
}

