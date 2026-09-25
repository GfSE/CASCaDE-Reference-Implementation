<template>
    <v-btn color='secondary' variant='elevated' class='text-none export-btn' @click='openDialog'>{{ config.buttonLabel }}</v-btn>
    <v-dialog v-model='dialog' max-width='600'>
        <v-card>
            <v-card-title>{{ config.dialogTitle }}</v-card-title>
            <v-card-text>
                <v-alert v-if='packageCount === 0' type='warning' class='mb-4'>
                    No packages available in cache. Please import packages first.
                </v-alert>
                <div v-else>
                    <p class='mb-4'>{{ packageCount }} package(s) will be exported.</p>
                    <v-text-field
                        v-model='filename'
                        label='Filename'
                        hint='Enter filename for the exported file'
                        persistent-hint
                        required
                        :rules='[rules.required, rules.extension]'
                        :disabled='isExporting'
                    ></v-text-field>

                    <!-- Optional export options (checkboxes), if configured -->
                    <div v-if='config.options && config.options.length' class='mt-4'>
                        <h4 class='mb-2'>Export Options</h4>
                        <v-checkbox v-for='option in config.options'
                                    :key='option.key'
                                    v-model='optionValues[option.key]'
                                    :label='option.label'
                                    density='compact'
                                    hide-details
                                    :disabled='isExporting'></v-checkbox>
                    </div>
                </div>

                <!-- Error Display -->
                <v-alert v-if='errorMessage'
                         type='error'
                         dismissible
                         class='mt-4'
                         @click:close='errorMessage = ""'>
                    {{ errorMessage }}
                </v-alert>

                <!-- Success Display -->
                <v-alert v-if='successMessage'
                         type='success'
                         dismissible
                         class='mt-4'
                         @click:close='successMessage = ""'>
                    {{ successMessage }}
                </v-alert>

                <!-- Progress Indicator -->
                <v-progress-linear v-if='isExporting'
                                   indeterminate
                                   color='primary'
                                   class='mt-4'></v-progress-linear>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn :color="isExporting ? undefined : 'grey'" variant='elevated' class='export-btn' @click='dialog = false' :disabled='isExporting'>
                    Cancel
                </v-btn>
                <v-btn
                    :color="(packageCount === 0 || !isFilenameValid || isExporting) ? undefined : 'primary'"
                    variant='elevated'
                    class='export-btn'
                    @click='exportPackages'
                    :disabled='packageCount === 0 || !isFilenameValid || isExporting'
                    :loading='isExporting'
                >
                    Export
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang='ts'>
import { Options, Vue } from 'vue-class-component';
import { toRaw } from 'vue';
import { ItemCache } from '@/stores/item-cache';
import { PLI } from '@/common/lib/platform-independence';
import { LIB, LOG } from '@/common/lib/helpers';
import { ExportConfig } from '@/plugins/export/export-config';
import { PigItemType } from '@/common/schema/pig/ts/pig-metaclasses';

/**
 * Generic export dialog, driven by a format-specific ExportConfig (see export-config.ts).
 * Used by export-jsonld, export-xml, export-cypher and export-ttl via their respective
 * mount-export-*.ts files, which `extend` this component and supply the `config` prop.
 */
@Options({
    props: {
        config: {
            type: Object as () => ExportConfig,
            required: true
        }
    },
    data() {
        return {
            dialog: false,
            filename: '',
            packageCount: 0,
            isExporting: false,
            errorMessage: '',
            successMessage: '',
            optionValues: {} as Record<string, boolean>,
            rules: {
                required: (value: string) => !!value || 'Filename is required',
                extension: (value: string) => {
                    if (!value) return true;
                    const config = this.config as ExportConfig;
                    const zipExtension = `${config.validExtensions[0]}.zip`;
                    return value.endsWith(zipExtension) || `Filename should end with ${zipExtension}`;
                }
            }
        };
    },
    computed: {
        isFilenameValid(): boolean {
            const fn = this.filename as string;
            const config = this.config as ExportConfig;
            return fn.length > 0 && fn.endsWith(`${config.validExtensions[0]}.zip`);
        }
    },
    methods: {
        openDialog() {
            this.dialog = true;

            // Reset messages and state
            this.errorMessage = '';
            this.successMessage = '';
            this.isExporting = false;

            const config = this.config as ExportConfig;

            // Initialize option checkboxes with their configured defaults
            const initialOptions: Record<string, boolean> = {};
            (config.options || []).forEach(option => {
                initialOptions[option.key] = option.default ?? false;
            });
            this.optionValues = initialOptions;

            // Get packages and update count (already loaded from storage at app startup)
            const cache = ItemCache();
            const pkgs = cache.packages;

            this.packageCount = pkgs.length;

            // The export is always a ZIP archive (one entry per package). Its
            // filename carries both the format-specific extension and '.zip'
            // (e.g. '*.cas.jsonld.zip'), so a subsequent import recognizes and
            // filters it correctly (see accept/validExtensions of the matching
            // import dialog) - enabling a lossless export/import roundtrip.
            const zipExtension = `${config.validExtensions[0]}.zip`;
            if (LIB.isArrayWithContent(pkgs)) {
                // Use toRaw to unwrap Pinia's reactive proxy
                const firstPackage = toRaw(pkgs[0]);

                // Derive filename from package title or ID and remove invalid characters:
                const sanitized = config.getDefaultFilename
                    ? config.getDefaultFilename(firstPackage)
                    : LIB.makeFilename(firstPackage);
                this.filename = `${sanitized}${zipExtension}`;
            } else {
                this.filename = `export${zipExtension}`;
            }
        },

        /**
         * Convert a single package's transformed result (string or object)
         * into the bytes to be stored as a ZIP entry.
         */
        toEntryBytes(data: string | object): string {
            return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        },

        /**
         * Build a unique, sanitized ZIP entry name for a package, avoiding
         * collisions with entries already produced by other packages in the
         * same export.
         */
        makeEntryName(pkg: any, extension: string, usedNames: Set<string>): string {
            const config = this.config as ExportConfig;
            const base = config.getDefaultFilename ? config.getDefaultFilename(pkg) : LIB.makeFilename(pkg);
            let name = `${base}${extension}`;
            if (usedNames.has(name)) {
                // Disambiguate by id suffix on collision (e.g. same title used twice)
                name = `${base}_${LIB.makeFilenameFromString(String(pkg.id))}${extension}`;
            }
            usedNames.add(name);
            return name;
        },

        /**
         * Collect the filenames of all assets referenced by the given items (a package
         * plus its graph items, as returned by APackage.getItems()). Scans:
         * - title, description, definition (ILanguageText[]) for <img src="..."> and
         *   <object data="..."> references, on all item kinds
         * - hasProperty[].value (configured string properties) on anEntity/aRelationship
         *   instances, which are likewise plain strings that may embed <img>/<object> tags
         *
         * @param items - items as returned by APackage.getItems()
         * @returns Set of referenced asset filenames (deduplicated)
         */
        collectReferencedAssetFilenames(items: any[]): Set<string> {
            const filenames = new Set<string>();

            const scanLanguageTexts = (arr: any[] | undefined) => {
                if (!Array.isArray(arr)) return;
                for (const entry of arr) {
                    for (const ref of LIB.extractAssetReferences(entry?.value)) {
                        filenames.add(ref);
                    }
                }
            };

            for (const item of items) {
                scanLanguageTexts(item.description);
                scanLanguageTexts(item.definition);

                // Configured string properties (multiLanguage-like) only exist on
                // instances (anEntity/aRelationship), not on classes:
                if ((item.itemType === PigItemType.anEntity || item.itemType === PigItemType.aRelationship) && Array.isArray(item.hasProperty)) {
                    for (const prop of item.hasProperty) {
                        for (const ref of LIB.extractAssetReferences(prop?.value)) {
                            filenames.add(ref);
                        }
                    }
                }
            }

            return filenames;
        },

        async exportPackages() {
            // Reset messages
            this.errorMessage = '';
            this.successMessage = '';
            this.isExporting = true;

            const config = this.config as ExportConfig;

            try {
                const cache = ItemCache();
                const pkgs = cache.packages;
                const extension = config.validExtensions[0];

                // Transform every top-level package with the format-specific
                // transformFn and collect one ZIP entry per package. Contained
                // (nested) packages are not exported as their own top-level entry
                // here - the format-specific transformFn/serializer already emits
                // them as a lightweight proxy within their containing package's
                // own output (see APackage.getProxy() in pig-metaclasses.ts).
                const usedNames = new Set<string>();
                const entries: Record<string, string | Uint8Array> = {};
                const referencedAssetFilenames = new Set<string>();
                for (const pkg of pkgs) {
                    // Use toRaw to unwrap Pinia's reactive proxy
                    const rawPkg = toRaw(pkg) as any;
                    const transformed = config.transformFn(rawPkg, this.optionValues);
                    const entryName = this.makeEntryName(rawPkg, extension, usedNames);
                    entries[entryName] = this.toEntryBytes(transformed);

                    // Scan the package's own items (title/description/definition and
                    // configured string properties) for referenced asset files
                    // (<img src="...">, <object data="...">), so they can be bundled
                    // into the ZIP alongside the graph payload:
                    const items = typeof rawPkg.getItems === 'function' ? rawPkg.getItems() : [rawPkg];
                    for (const filename of this.collectReferencedAssetFilenames(items)) {
                        referencedAssetFilenames.add(filename);
                    }
                }

                // Add referenced assets (found in the asset cache) to the ZIP, at their
                // original relative path/filename, so imports can resolve them again.
                // References that don't resolve to a cached asset are logged as a
                // warning and skipped, without failing the export:
                if (referencedAssetFilenames.size > 0) {
                    const cachedAssets = await PLI.getAssets();
                    const cachedByFilename = new Map(cachedAssets.map(asset => [asset.filename, asset]));

                    for (const filename of referencedAssetFilenames) {
                        if (entries[filename] !== undefined) continue; // already present (e.g. duplicate reference)

                        const asset = cachedByFilename.get(filename);
                        if (!asset) {
                            LOG.warn(`[${config.componentName}] Referenced asset '${filename}' was not found in the asset cache and is not included in the export.`);
                            continue;
                        }

                        try {
                            const buffer = await asset.blob.arrayBuffer();
                            entries[filename] = new Uint8Array(buffer);
                        } catch (e: unknown) {
                            LOG.warn(`[${config.componentName}] Failed to read referenced asset '${filename}' for export:`, e);
                        }
                    }
                }

                const zipResult = PLI.createZip(entries);
                if (!zipResult.ok) {
                    this.errorMessage = `Export failed: ${zipResult.statusText}`;
                    LOG.error(`[${config.componentName}] Zip creation failed:`, zipResult.statusText);
                    return;
                }

                // Write the ZIP archive to file (platform-independent)
                const result = await PLI.writeFile(zipResult.response as Blob, this.filename);

                if (result.ok) {
                    this.successMessage = `Successfully exported ${pkgs.length} package(s) to ${this.filename}`;
                    LOG.info(`[${config.componentName}] Export successful:`, this.filename);

                    // Close dialog after short delay to show success message
                    setTimeout(() => {
                        this.dialog = false;
                    }, 1500);
                } else {
                    this.errorMessage = `Export failed: ${result.statusText}`;
                    LOG.error(`[${config.componentName}] Export failed:`, result.statusText);
                }
            } catch (error) {
                this.errorMessage = `Export error: ${error instanceof Error ? error.message : String(error)}`;
                LOG.error(`[${config.componentName}] Export error:`, error);
            } finally {
                this.isExporting = false;
            }
        }
    }
})

export default class ExportBaseComponent extends Vue {
    config!: ExportConfig;
    dialog!: boolean;
    filename!: string;
    packageCount!: number;
    isExporting!: boolean;
    errorMessage!: string;
    successMessage!: string;
    optionValues!: Record<string, boolean>;
}
</script>
