import { App, Plugin, Component } from 'vue';
import ExportBase from '../export-base.vue';
import { ExportConfig } from '../export-config';
import { getCypher } from '@/common/export/cypher/getCypher';
import { APackage } from '@/common/schema/pig/ts/pig-metaclasses';

/**
 * Format-specific configuration for the generic ExportBase component
 */
const cypherExportConfig: ExportConfig = {
    buttonLabel: '🡖 CASCaRA Cypher',
    dialogTitle: 'Export Packages as Cypher',
    componentName: 'Export-Cypher',
    validExtensions: ['.cypher'],
    transformFn: (pkg: any) => getCypher(pkg, { includeConstraints: true }),
    getDefaultFilename: (firstPkg: any) => {
        const title = (firstPkg as any).title;
        const titleText = typeof title === 'string'
            ? title
            : Array.isArray(title) && title.length > 0
                ? title[0].value
                : firstPkg.id || 'export';
        return titleText.replace(/[<>:"/\\|?*]/g, '_');
    }
};

const cypherExportPlugin: Plugin = {
    install(app: App) {
        // Don't change the name, it is used to filter the component in main.ts
        app.component(cypherExportConfig.componentName, {
            extends: ExportBase,
            props: {
                config: {
                    default: () => cypherExportConfig
                }
            }
        } as Component);
    }
};

export default cypherExportPlugin;

// See README.md for a cypher-shell example command.
