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
import type { XmlImportPluginOptions } from './mount-import-xml';
import AnyXmlImportPlugin from './import-any-xml.vue';
import { LOG } from '@/common/lib/helpers';

const anyXmlImportPlugin: Plugin = {
    install(app: App, options: XmlImportPluginOptions = {}) {
        // Store options in app.config.globalProperties for component access
        app.config.globalProperties.$xmlImportOptions = {
            maxFileSize: options.maxFileSize || 6 * 1024 * 1024, // 6MB default
            onError: options.onError || ((error: Error) => LOG.error('XML Import Error:', error))
        };

        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component('Import-Any-XML', AnyXmlImportPlugin);

        // all mounted components are logged in main.ts ...
    }
};

export default anyXmlImportPlugin;
