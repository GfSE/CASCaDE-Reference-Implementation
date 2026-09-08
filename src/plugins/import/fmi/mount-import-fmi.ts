import { App, Plugin, Component } from 'vue';
import ImportBase from '../import-base.vue';
import { ImportConfig } from '../import-config';
import { FmiImporter } from '@/common/import/fmi/import-fmi';

/**
 * Format-specific configuration for the generic ImportBase component
 */
const fmiImportConfig: ImportConfig = {
    buttonLabel: 'FMI \uD83E\uDC55',
    dialogTitle: 'Select FMI Files',
    inputLabel: 'FMI Input',
    accept: '.fmu,.xml',
    hint: 'Select one or more FMU archives (.fmu) or modelDescription.xml files',
    componentName: 'Import-FMI',
    importFn: (file: File) => FmiImporter.import(file)
};

const fmiImportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(fmiImportConfig.componentName, {
            extends: ImportBase,
            props: {
                config: {
                    default: () => fmiImportConfig
                }
            }
        } as Component);
    }
}

export default fmiImportPlugin;
