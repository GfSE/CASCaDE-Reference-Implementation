import { App, Plugin, Component } from 'vue';
import ImportBase from '../import-base.vue';
import { ImportConfig } from '../import-config';
import { JsonldImporter } from '@/common/import/jsonld/import-jsonld';

/**
 * Format-specific configuration for the generic ImportBase component
 */
const jsonldImportConfig: ImportConfig = {
    buttonLabel: 'CASCaRA JSON-LD \uD83E\uDC55',
    dialogTitle: 'Select JSON-LD Files',
    inputLabel: 'JSON-LD Input',
    accept: '.cas.jsonld,.cas.jsonld.zip',
    hint: 'Select one or more JSON-LD files to import',
    componentName: 'Import-JSONLD',
    importFn: (file: File) => JsonldImporter.import(file)
};

const jsonImportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(jsonldImportConfig.componentName, {
            extends: ImportBase,
            props: {
                config: {
                    default: () => jsonldImportConfig
                }
            }
        } as Component);
    }
}

export default jsonImportPlugin;
