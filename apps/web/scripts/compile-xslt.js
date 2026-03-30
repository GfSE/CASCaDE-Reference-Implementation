/*!
 * Compile all XSLT stylesheets in /src/utils/schemas/XSLT/ to SEF.JSON
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * Compile all XSLT stylesheets in /src/utils/schemas/XSLT/ to SEF.JSON
 *  Authors: oskar.dungern@gfse.org
 * 
 * This script:
 * 1. Finds all *.xsl files in the XSLT folder (recursively)
 * 2. Compiles each to *.sef.json using Saxon-JS xslt3 compiler
 * 3. Places the compiled files next to the source files
 * 
 * Requirements:
 * - saxon-js package installed (npm install saxon-js)
 * - xslt3 CLI tool available via npx
 *
 * see also:
 * - https://www.npmjs.com/package/saxon-js
 * - https://stackoverflow.com/questions/63187173/how-to-convert-xsl-file-to-sef-file
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const XSLT_FOLDER = path.resolve(__dirname, '..', 'public', 'assets', 'xslt');

console.log('═══════════════════════════════════════════════════════════');
console.log('  XSLT Compilation Script');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Scanning folder: ${XSLT_FOLDER}\n`);

/**
 * Recursively find all .xsl files in a directory
 * @param {string} dir - Directory to search
 * @param {string[]} fileList - Accumulated list of files
 * @returns {string[]} Array of absolute paths to .xsl files
 */
function findXslFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) {
        console.warn(`⚠️  Warning: Directory does not exist: ${dir}`);
        return fileList;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // Recursively search subdirectories
            findXslFiles(filePath, fileList);
        } else if (file.endsWith('.xsl')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

/**
 * Compile a single XSLT file to SEF.JSON
 * @param {string} xslPath - Absolute path to .xsl file
 * @returns {boolean} True if compilation succeeded
 */
function compileXslt(xslPath) {
    const sefPath = xslPath.replace(/\.xsl$/, '.sef.json');
    const relativePath = path.relative(path.resolve(__dirname, '..'), xslPath);

    console.log(`\n📄 Compiling: ${relativePath}`);

    try {
        // Build Saxon-JS xslt3 command
        const cmd = `npx xslt3 -xsl:"${xslPath}" -export:"${sefPath}" -nogo -t`;

        // Execute compilation
        execSync(cmd, {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'pipe' // Capture output
        });

        // Verify output file was created
        if (fs.existsSync(sefPath)) {
            const stats = fs.statSync(sefPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`   ✓ Created: ${path.basename(sefPath)} (${sizeKB} KB)`);
            return true;
        } else {
            throw new Error('SEF file was not created');
        }
    } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        return false;
    }
}

// Main execution
try {
    // Find all .xsl files
    const xslFiles = findXslFiles(XSLT_FOLDER);

    if (xslFiles.length === 0) {
        console.log('ℹ️  No .xsl files found in XSLT folder.');
        console.log('   Create XSLT stylesheets in:');
        console.log(`   ${XSLT_FOLDER}`);
        process.exit(0);
    }

    console.log(`Found ${xslFiles.length} XSLT file(s):\n`);
    xslFiles.forEach((file, index) => {
        const relativePath = path.relative(XSLT_FOLDER, file);
        console.log(`   ${index + 1}. ${relativePath}`);
    });

    // Compile all files
    console.log('\n───────────────────────────────────────────────────────────');
    console.log('Starting compilation...');
    console.log('───────────────────────────────────────────────────────────');

    let successCount = 0;
    let failCount = 0;

    xslFiles.forEach(xslPath => {
        const success = compileXslt(xslPath);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    });

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Compilation Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total files:     ${xslFiles.length}`);
    console.log(`✓ Successful:    ${successCount}`);
    if (failCount > 0) {
        console.log(`❌ Failed:        ${failCount}`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    if (failCount > 0) {
        console.warn('⚠️  Some compilations failed. Check errors above.');
        console.log('   You can use native browser XSLT transformation as fallback.\n');
        // Don't fail the build - allow fallback to .xsl files
        process.exit(0);
    } else {
        console.log('✅ All XSLT stylesheets compiled successfully!\n');
        process.exit(0);
    }

} catch (error) {
    console.error('\n❌ Compilation script failed:');
    console.error('   Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Ensure saxon-js is installed: npm install saxon-js');
    console.log('   2. Check that .xsl files are valid XSLT 3.0');
    console.log('   3. Verify file permissions in XSLT folder\n');

    // Don't fail the build
    process.exit(0);
}
