/*!
 * XML Import Plugin Registration
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

import type { App, Plugin } from 'vue';
import XmlImportPlugin from './import-xml.vue';
import { LOG } from '@/common/lib/helpers';

/**
 * Plugin configuration options
 */
export interface XmlImportPluginOptions {
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
        app.component('Import-XML', XmlImportPlugin);

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
