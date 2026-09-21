/*!
 * Shared configuration contract for all format-specific export dialogs
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
import { IIdentifiable } from '@/common/schema/pig/ts/pig-metaclasses';

/**
 * Describes everything that differs between the format-specific export dialogs
 * (JSON-LD, XML, Cypher, ...). The generic ExportBase component is driven
 * entirely by an instance of this interface, supplied via the `config` prop.
 */
export interface ExportConfig {
    /** Label shown on the button that opens the export dialog */
    buttonLabel: string;

    /** Title shown in the dialog's card-title */
    dialogTitle: string;

    /**
     * Name under which the resulting component is registered globally
     * (via app.component(...)). Don't change existing values, they are
     * used to filter components elsewhere in the application.
     */
    componentName: string;

    /**
     * Accepted filename extensions, in order of preference. The first
     * entry is used to build the default filename; the filename field
     * is considered valid if it ends with any of these extensions.
     */
    validExtensions: string[];

    /**
     * Transforms a single (raw, non-reactive) package into its exported
     * representation - either a string (e.g. XML, Cypher) or a plain
     * object (e.g. JSON-LD). Results of multiple packages are combined
     * generically by ExportBase (see combineResults in export-base.vue).
     * `optionValues` reflects the current state of the checkboxes defined
     * in `options` below (keyed by their `key`), if any are configured.
     */
    transformFn: (pkg: any, optionValues?: Record<string, boolean>) => string | object;

    /**
     * Optional override to derive the default filename (without extension
     * handling) from the first package. Defaults to LIB.makeFilename(pkg).
     */
    getDefaultFilename?: (firstPkg: IIdentifiable) => string;

    /**
     * Optional list of checkboxes shown under an "Export Options" heading.
     * Leave undefined to hide the options section entirely.
     */
    options?: {
        /** Key under which the checkbox's boolean value is passed to transformFn's optionValues */
        key: string;

        /** Label shown next to the checkbox */
        label: string;

        /** Default value of the checkbox (defaults to false) */
        default?: boolean;
    }[];
}
