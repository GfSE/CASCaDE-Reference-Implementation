/*!
 * Cypher Export Plugin - Documentation
 * Copyright 2026 CASCaDE Reference Implementation
 * License: Apache 2.0
 */

# Cypher Export Plugin

## Overview
The Cypher Export plugin allows users to export all packages from the `packageCache` store into a `.cypher` file. Each package is converted into Neo4j Cypher statements using `getCypher()` and written to the local filesystem.

## Features

### 1. Automatic Package Detection
- Reads all packages from the `PackageCache` store
- Shows a warning if the cache is empty
- Loads packages from storage when needed

### 2. Filename Preset and Validation
- Generates a default filename from the first package title
- Sanitizes invalid filesystem characters
- Requires `.cypher` extension
- Uses `export.cypher` when no package title is available

### 3. Export Flow
- Converts each package to Cypher with `getCypher(pkg, { includeConstraints: true })`
- Joins package exports using blank lines
- Saves the combined Cypher output via `PLI.writeFile()`

### 4. User Feedback
- Displays export success and error messages
- Shows progress while export is in progress
- Disables form controls during export

## Usage

### User Workflow
1. Click the **"Export Cypher"** button
2. Dialog opens with package count and filename field
3. Edit filename if needed
4. Click **Export** to save a `.cypher` file

### Code Example
```typescript
import { toRaw } from 'vue';
import { PackageCache } from '../../../stores/package-cache';
import { getCypher } from '../../../common/export/cypher/getCypher';
import { PLI } from '../../../common/lib/platform-independence';

const cache = PackageCache();
const cypherText = cache.packages
  .map(pkg => getCypher(toRaw(pkg), { includeConstraints: true }))
  .join('\n\n');
await PLI.writeFile(cypherText, filename);
```

## Implementation Details

### Dependencies
- **Pinia Store**: `PackageCache`
- **Export Utility**: `getCypher()` from `src/common/export/cypher/getCypher`
- **Platform Independence**: `PLI.writeFile()` for file output
- **Vue**: `vue-class-component`, `toRaw`
- **Helpers**: `LOG`

### Data Flow
1. `openDialog()` loads packages and determines the default export filename
2. `exportPackages()` transforms each selected package into Cypher
3. Exported Cypher statements are joined with blank lines
4. File is written to disk using `PLI.writeFile()` 
5. UI displays success or failure

### Error Handling
- **No packages**: disables export button and shows warning
- **Invalid filename**: blocks export via validation rules
- **Write failure**: displays `result.statusText`
- **Unhandled exceptions**: shown as an error message

## File Format

### Single Package Export
The file contains a series of Cypher statements such as `CREATE`, `MERGE`, and `CREATE CONSTRAINT` that represent package contents.

### Multiple Package Export
Packages are exported sequentially, separated by blank lines, allowing Neo4j-import or script execution workflows to process the output in one file.

## Future Enhancements
- Package selection instead of exporting all packages
- Export options for `includeConstraints` and statement grouping
- Neo4j driver integration for direct server export
- Separate schema and data export modes
- Configurable Cypher dialect or Neo4j version support
