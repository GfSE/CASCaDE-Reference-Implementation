/*!
 * JSON-LD Export Plugin - Documentation
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

# JSON-LD Export Plugin

## Overview
The JSON-LD Export plugin allows users to export all packages from the packageCache to JSON-LD format and save them to the local filesystem.

## Features

### 1. **Automatic Package Detection**
- Reads all packages from the `packageCache` store
- Displays the number of packages to be exported
- Shows a warning if no packages are available

### 2. **Intelligent Filename Preset**
- Automatically suggests a filename based on the first package's title
- Sanitizes the filename by removing invalid characters (`<>:"/\|?*`)
- Appends `.jsonld` extension if not present
- Fallback to `export.jsonld` if no packages exist

### 3. **Filename Validation**
- Requires a non-empty filename
- Validates that the filename includes `.jsonld` or `.json` extension
- Provides real-time feedback via validation rules

### 4. **Platform-Independent File Writing**
- Uses `PLI.writeFile()` for cross-platform compatibility
- **Node.js**: Writes directly to the filesystem
- **Browser with File System Access API**: Opens native save dialog
- **Browser fallback**: Downloads file using Blob URL

### 5. **JSON-LD Transformation**
- Transforms each package using `getJSONLD(package)`
- Single package: Exports as single JSON-LD object
- Multiple packages: Exports as array of JSON-LD objects

### 6. **User Feedback**
- Success/error messages via snackbar notifications
- Displays filename and number of exported packages
- Detailed error messages on failure

## Usage

### User Workflow
1. Click the **"Export JSON-LD"** button
2. Dialog opens with:
   - Package count
   - Pre-filled filename (from first package title)
3. User can modify the filename
4. Click **"Export"** to save the file
5. File is saved to:
   - **Node.js**: Specified path in the filesystem
   - **Browser**: User selects location via save dialog or downloads to default folder

### Code Example
```typescript
// The component uses the following stores and utilities:
import { PackageCache } from '../../../stores/package-cache';
import { getJSONLD } from '../../../common/export/jsonld/getJSONLD';
import { PLI } from '../../../common/lib/platform-independence';

// Export process:
const jsonldPackages = packages.map(pkg => getJSONLD(pkg));
const result = await PLI.writeFile(jsonldPackages, filename);
```

## Implementation Details

### Dependencies
- **Pinia Store**: `usePackageCache` for accessing cached packages
- **Export Utility**: `getJSONLD()` for transforming packages to JSON-LD
- **Platform Independence**: `PLI.writeFile()` for cross-platform file writing
- **Vuetify**: UI components (v-dialog, v-text-field, v-snackbar, etc.)

### Data Flow
1. User opens dialog → `openDialog()`
2. Filename preset from first package title
3. User confirms → `exportPackages()`
4. Transform packages → `getJSONLD(pkg)` for each package
5. Write to file → `PLI.writeFile(data, filename)`
6. Display result → snackbar notification

### Error Handling
- **No packages**: Disables export button and shows warning
- **Invalid filename**: Real-time validation prevents export
- **Write failure**: Displays error message with details
- **Transform errors**: Caught and displayed via snackbar

## File Format

### Single Package Export
```json
{
  "@context": { ... },
  "@graph": [ ... ],
  "cas:id": "package-id",
  "cas:title": "Package Title",
  ...
}
```

### Multiple Package Export
```json
[
  {
    "@context": { ... },
    "@graph": [ ... ],
    "cas:id": "package-1",
    ...
  },
  {
    "@context": { ... },
    "@graph": [ ... ],
    "cas:id": "package-2",
    ...
  }
]
```

## Future Enhancements
- Package selection (currently exports all packages)
- Filter by item type within packages
- Custom export options (indentation, context handling)
- Batch export with separate files per package
- Export history/log
