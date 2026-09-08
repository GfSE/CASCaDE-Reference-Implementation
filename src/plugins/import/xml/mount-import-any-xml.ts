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

import type { App, Plugin, Component } from 'vue';
import type { XmlImportPluginOptions } from './mount-import-xml';
import ImportBase from '../import-base.vue';
import type { ImportConfig } from '../import-config';
import { XmlImporter } from '@/common/import/xml/import-xml';
import { LOG } from '@/common/lib/helpers';

/**
 * Format-specific configuration for the generic ImportBase component.
 * Uses the optional `secondFile` field to show a SEF file input used
 * for XSL-Transformation of arbitrary XML documents.
 */
const anyXmlImportConfig: ImportConfig = {
    buttonLabel: 'any XML \uD83E\uDC55',
    dialogTitle: 'Select XML Files',
    inputLabel: 'XML Input',
    accept: '.xml,.xml.zip',
    hint: 'Select one or more XML files to import',
    componentName: 'Import-Any-XML',
    importFn: (file: File, secondFile?: File | null) => XmlImporter.import(file, { sef: secondFile }),
    secondFile: {
        label: 'SEF Input',
        accept: '.sef.json',
        hint: 'Select a SEF file for XSL-Transformation',
        icon: 'mdi-file-code',
        required: true,
        requiredMessage: 'Please select a SEF file'
    }
};

const anyXmlImportPlugin: Plugin = {
    install(app: App, options: XmlImportPluginOptions = {}) {
        // Store options in app.config.globalProperties for component access
        app.config.globalProperties.$xmlImportOptions = {
            maxFileSize: options.maxFileSize || 6 * 1024 * 1024, // 6MB default
            onError: options.onError || ((error: Error) => LOG.error('XML Import Error:', error))
        };

        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(anyXmlImportConfig.componentName, {
            extends: ImportBase,
            props: {
                config: {
                    default: () => anyXmlImportConfig
                }
            }
        } as Component);

        // all mounted components are logged in main.ts ...
    }
};

export default anyXmlImportPlugin;
