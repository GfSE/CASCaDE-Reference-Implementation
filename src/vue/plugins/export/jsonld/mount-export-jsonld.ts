import { App, Plugin, Component } from 'vue';
import ExportBase from '../export-base.vue';
import { ExportConfig } from '../export-config';
import { getJSONLD } from '@/common/export/jsonld/getJSONLD';

/**
 * Format-specific configuration for the generic ExportBase component
 */
const jsonldExportConfig: ExportConfig = {
    buttonLabel: '🡖 CASCaRA JSON-LD',
    dialogTitle: 'Export Packages as JSON-LD',
    componentName: 'Export-JSONLD',
    validExtensions: ['.cas.jsonld', '.cas.json'],
    transformFn: (pkg: any) => getJSONLD(pkg/*, { stringify: false }*/)
};

const jsonExportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(jsonldExportConfig.componentName, {
            extends: ExportBase,
            props: {
                config: {
                    default: () => jsonldExportConfig
                }
            }
        } as Component);
    }
}

export default jsonExportPlugin;
