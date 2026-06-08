/*!
 * Example: Using PLI.writeFile() for platform-independent file writing
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { PLI } from '../common/lib/platform-independence';

/**
 * Examples demonstrating PLI.writeFile() in various scenarios
 */

// Example 1: Write a JSON object
async function writeJsonFile() {
    const data = {
        name: 'CASCaDE',
        version: '1.0.0',
        features: ['JSON-LD support', 'Platform independence']
    };

    const result = await PLI.writeFile(data, 'output.json');
    if (result.ok) {
        console.log('JSON file written successfully:', result.response);
    } else {
        console.error('Error writing JSON file:', result.statusText);
    }
}

// Example 2: Write a text string
async function writeTextFile() {
    const text = 'Hello, World!\nThis is a test file.';

    const result = await PLI.writeFile(text, 'output.txt');
    if (result.ok) {
        console.log('Text file written successfully:', result.response);
    } else {
        console.error('Error writing text file:', result.statusText);
    }
}

// Example 3: Write XML content
async function writeXmlFile() {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<root>
    <element>Content</element>
</root>`;

    const result = await PLI.writeFile(xmlContent, 'output.xml');
    if (result.ok) {
        console.log('XML file written successfully:', result.response);
    } else {
        console.error('Error writing XML file:', result.statusText);
    }
}

// Example 4: Write a Blob
async function writeBlobFile() {
    const blob = new Blob(['Binary or text content'], { type: 'text/plain' });

    const result = await PLI.writeFile(blob, 'output.bin');
    if (result.ok) {
        console.log('Blob file written successfully:', result.response);
    } else {
        console.error('Error writing Blob file:', result.statusText);
    }
}

// Platform-specific behavior notes:
// - In Node.js: Files are written directly to the filesystem at the specified path
// - In Browser with File System Access API: User gets a save dialog to choose location
// - In Browser fallback: File is downloaded to the default downloads folder
