/*!
 * Shared configuration contract for all format-specific import dialogs
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
import { IRsp } from '@/common/lib/messages';

/**
 * Describes everything that differs between the format-specific import dialogs
 * (JSON-LD, XML, FMI, ReqIF, ...). The generic ImportBase component is driven
 * entirely by an instance of this interface, supplied via the `config` prop.
 */
export interface ImportConfig {
    /** Label shown on the button that opens the import dialog */
    buttonLabel: string;

    /** Title shown in the dialog's card-title */
    dialogTitle: string;

    /** Label of the file-input field */
    inputLabel: string;

    /** Comma separated list of accepted file extensions, passed to v-file-input's `accept` */
    accept: string;

    /** Hint text shown below the file-input field */
    hint: string;

    /**
     * Name under which the resulting component is registered globally
     * (via app.component(...)). Don't change existing values, they are
     * used to filter components elsewhere in the application.
     */
    componentName: string;

    /**
     * Imports a single file and resolves with an IRsp result.
     * Implementations should not throw; unexpected errors are caught
     * by the caller and converted into a failed IRsp via Msg.create(600, ...).
     * `auxiliaryFile` is passed through when `auxiliaryFile` config below is set.
     */
    importFn: (file: File, auxiliaryFile?: File | null) => Promise<IRsp<unknown>>;

    /**
     * Optional second, single-file input shown below the main file-input
     * (e.g. a SEF file used for XSL-Transformation of "any XML" imports).
     * Leave undefined to hide the second field entirely.
     */
    auxiliaryFile?: {
        /** Label of the second file-input field */
        label: string;

        /** Comma separated list of accepted file extensions */
        accept: string;

        /** Hint text shown below the second file-input field */
        hint: string;

        /** Icon shown in front of the field, defaults to 'mdi-file-code' */
        icon?: string;

        /** Whether the second file must be selected before submit is allowed (default: true) */
        required?: boolean;

        /** Error message shown when required and no file was selected */
        requiredMessage?: string;
    };
}
