import { App, Plugin, Component } from 'vue';
import ExportBase from '../export-base.vue';
import { ExportConfig } from '../export-config';
import { getTTL } from '@/common/export/ttl/getTTL';

/**
 * Format-specific configuration for the generic ExportBase component
 */
const ttlExportConfig: ExportConfig = {
    buttonLabel: '🡖 CASCaRA Turtle (TTL)',
    dialogTitle: 'Export Packages as Turtle (TTL)',
    componentName: 'Export-TTL',
    validExtensions: ['.cas.ttl'],
    // Negate the "skip" options to match getTTL's expected interface
    transformFn: (pkg: any, optionValues?: Record<string, boolean>) => getTTL(pkg, {
        addShapes: !optionValues?.skipShapes,
        addHostedOntologies: !optionValues?.skipHostedOntologies,
        addExplicitTypeToAllClasses: !!optionValues?.addExplicitTypeToAllClasses,
        addItemTypes: !!optionValues?.addItemTypes
    }),
    // Export options - negated for those that default to true, so all checkboxes default to false
    options: [
        { key: 'skipHostedOntologies', label: 'Skip hosted ontologies (not yet implemented)', default: false },
        { key: 'skipShapes', label: 'Skip SHACL shapes for read-only applications', default: false },
        { key: 'addExplicitTypeToAllClasses', label: 'Add explicit rdf:type triples to subClasses and subProperties', default: false },
        { key: 'addItemTypes', label: 'Add cas:itemType triples for easier transformation', default: false }
    ]
};

const ttlExportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component(ttlExportConfig.componentName, {
            extends: ExportBase,
            props: {
                config: {
                    default: () => ttlExportConfig
                }
            }
        } as Component);
    }
}

export default ttlExportPlugin;
