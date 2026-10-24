import { App, Plugin, Component } from 'vue';
import ExportBase from '../export-base.vue';
import { ExportConfig } from '../export-config';
import { getXML } from '@/common/export/xml/getXML';

/**
 * Format-specific configuration for the generic ExportBase component
 */
const xmlExportConfig: ExportConfig = {
    buttonLabel: '🡖 CASCaRA XML',
    dialogTitle: 'Export Packages as XML',
    componentName: 'Export-XML',
    validExtensions: ['.cas.xml'],
    transformFn: (pkg: any) => getXML(pkg)
};

const xmlExportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(xmlExportConfig.componentName, {
            extends: ExportBase,
            props: {
                config: {
                    default: () => xmlExportConfig
                }
            }
        } as Component);
    }
}

export default xmlExportPlugin;
