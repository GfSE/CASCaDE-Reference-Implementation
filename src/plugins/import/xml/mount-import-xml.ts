/*!
 * Import Plugin Registration for CASCaRA XML
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * Mounts the XML import plugin with the Vue application
 * 
 * Usage in main.ts:
 * import { xmlImportPlugin } from './plugins/import/xml/mount-import-xml';
 * 
 * app.use(xmlImportPlugin);
 */

import type { App, Plugin, Component } from 'vue';
import ImportBase from '../import-base.vue';
import type { ImportConfig } from '../import-config';
import { XmlImporter } from '@/common/import/xml/import-xml';
import { LOG } from '@/common/lib/helpers';

/**
 * Format-specific configuration for the generic ImportBase component
 */
const xmlImportConfig: ImportConfig = {
    buttonLabel: 'CASCaRA XML \uD83E\uDC55',
    dialogTitle: 'Select XML Files',
    inputLabel: 'XML Input',
    accept: '.cas.xml,.cas.xml.zip',
    hint: 'Select one or more XML files to import',
    componentName: 'Import-XML',
    importFn: (file: File) => XmlImporter.import(file, undefined)
};

/**
 * Plugin configuration options
 */
export type XmlImportPluginOptions = {
    /**
     * Maximum file size in bytes (default: 6MB)
     */
    maxFileSize?: number;

    /**
     * Custom error handler
     */
    onError?: (error: Error) => void;
}

/**
 * XML Import Plugin installer
 * Implements Vue Plugin interface for use with app.use()
 */
export const xmlImportPlugin: Plugin = {
    install(app: App, options: XmlImportPluginOptions = {}) {
        // Store options in app.config.globalProperties for component access
        app.config.globalProperties.$xmlImportOptions = {
            maxFileSize: options.maxFileSize || 6 * 1024 * 1024, // 6MB default
            onError: options.onError || ((error: Error) => LOG.error('XML Import Error:', error))
        };

        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(xmlImportConfig.componentName, {
            extends: ImportBase,
            props: {
                config: {
                    default: () => xmlImportConfig
                }
            }
        } as Component);

        // all mounted components are logged in main.ts ...
    }
};

/**
 * Export business logic for programmatic use
 */
// export { XmlImporter } from '../../../common/import/xml/import-xml';

/**
 * Type declarations for global properties
 */
declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $xmlImportOptions?: {
            maxFileSize: number;
            onError: (error: Error) => void;
        };
    }
}

export default xmlImportPlugin;
