import { App, Plugin, Component } from 'vue';
import ImportBase from '../import-base.vue';
import { ImportConfig } from '../import-config';
import { ReqifImporter } from '@/common/import/reqif/import-reqif';

/**
 * Format-specific configuration for the generic ImportBase component
 */
const reqifImportConfig: ImportConfig = {
    buttonLabel: 'ReqIF \uD83E\uDC55',
    dialogTitle: 'Select ReqIF Files',
    inputLabel: 'ReqIF Input',
    accept: '.reqif,.reqifz,.reqif.zip',
    hint: 'Select one or more ReqIF files to import',
    componentName: 'Import-ReqIF',
    importFn: (file: File) => ReqifImporter.import(file)
};

const reqifImportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(reqifImportConfig.componentName, {
            extends: ImportBase,
            props: {
                config: {
                    default: () => reqifImportConfig
                }
            }
        } as Component);
    }
}

export default reqifImportPlugin;
