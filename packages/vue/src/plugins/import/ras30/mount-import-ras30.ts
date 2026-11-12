import { App, Plugin, Component } from 'vue';
import ImportBase from '../import-base.vue';
import { ImportConfig } from '../import-config';
import { Ras30Importer } from '@cascara/common/import/ras30/import-ras30';

/**
 * Format-specific configuration for the generic ImportBase component
 */
const ras30ImportConfig: ImportConfig = {
    buttonLabel: 'RAS 3.0 \uD83E\uDC55',
    dialogTitle: 'Select RAS 3.0 Files',
    inputLabel: 'RAS 3.0 Input',
    accept: '.json',
    hint: 'Select one or more RAS 3.0 asset metadata files (JSON)',
    componentName: 'Import-RAS30',
    importFn: (file: File) => Ras30Importer.import(file)
};

const ras30ImportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(ras30ImportConfig.componentName, {
            extends: ImportBase,
            props: {
                config: {
                    default: () => ras30ImportConfig
                }
            }
        } as Component);
    }
}

export default ras30ImportPlugin;
