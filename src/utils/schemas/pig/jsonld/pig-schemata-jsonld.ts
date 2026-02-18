/*! JSON-LD SCHEMATA for PIG items
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/** JSON-LD SCHEMATA for PIG items: Property, Link, Entity, Relationship, AnEntity, ARelationship
 *  These schemas validate the JSON-LD representation (with @id, @type, @value, etc.)
 *
 *  Dependencies: ajv (Another JSON Schema Validator) https://ajv.js.org/
 *  Authors: oskar.dungern@gfse.org, ..
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 *
 * Design decisions:
 * - the JSON-LD schemata are provided in addition to the JSON schemata (pig-schemata-json.ts);
 *   the former validate incoming JSON-LD documents before transformation,
 *   and the latter are used after transformation to internal representation, before an item is instantiated.
 * - this allows separate validation of incoming/outgoing JSON-LD documents
 * - use JSON Schema draft-07 (widely supported)
 * - use ajv for validation (fast, popular)
 * - these schemas validate JSON-LD documents (@graph, @context, @id, @type)
 * - schemata are loaded from external JSON files in public/assets/jsonld/
 * - Browser: fetches via HTTP from /assets/jsonld/
 * - Node.js: reads from local public/assets/jsonld/ directory
 * - Single source of truth: schema files stored only in public/assets/jsonld/
 *
 * Limitations:
 * - xs:datatype values are only pattern-validated here; specific accepted values are validated in code
 * - further constraints (e.g. maxCount >= minCount) are validated in code
 * - eligible values in Property only for string values; other datatypes to be implemented
 *
 * Schema files:
 * - Property.json
 * - Link.json
 * - Entity.json
 * - Relationship.json
 * - anEntity.json
 * - aRelationship.json
 * - aPackage.json
*/

import { ajv } from '../../../../plugins/ajv';
import { PIN } from '../../../lib/platform-independence';

/**
 * Get platform-appropriate base path for schema files
 * - Browser: URL to public asset (/assets/jsonld/)
 * - Node.js: Local filesystem path to public directory (public/assets/jsonld/)
 * 
 * @returns Base path for schema files
 */
function getSchemaBasePath(): string {
    if (PIN.isBrowserEnv()) {
        // Browser: fetch from public directory via HTTP
        const baseUrl = window.location.origin;
        return `${baseUrl}/assets/jsonld/`;
    } else {
        // Node.js: read from local public directory
        return './public/assets/jsonld/';
    }
}

// Schema files (paths constructed at runtime based on environment)
const SCHEMA_FILE_NAMES = {
    Property: 'Property.json',
    Link: 'Link.json',
    Entity: 'Entity.json',
    Relationship: 'Relationship.json',
    AnEntity: 'anEntity.json',
    ARelationship: 'aRelationship.json',
    APackage: 'aPackage.json'
} as const;

// Build full paths for schema files
const SCHEMA_FILES = Object.fromEntries(
    Object.entries(SCHEMA_FILE_NAMES).map(([key, filename]) => [
        key,
        `${getSchemaBasePath()}${filename}`
    ])
) as Record<keyof typeof SCHEMA_FILE_NAMES, string>;

// Type for schema keys
type SchemaKey = keyof typeof SCHEMA_FILE_NAMES;

// Cache for loaded schemas
const schemaCache: Partial<Record<SchemaKey, any>> = {};

/**
 * Load a JSON schema from file
 * @param schemaKey - Key identifying the schema (e.g., 'Property', 'Link')
 * @returns Promise resolving to the schema object
 */
async function loadSchema(schemaKey: SchemaKey): Promise<any> {
    // Return cached schema if available
    if (schemaCache[schemaKey]) {
        return schemaCache[schemaKey];
    }

    const schemaPath = SCHEMA_FILES[schemaKey];

    try {
        // Use PIN.readFileAsText to support both Node and browser
        const rsp = await PIN.readFileAsText(schemaPath);

        if (!rsp.ok) {
            throw new Error(`Failed to load schema ${schemaPath}: ${rsp.statusText}`);
        }

        const schema = JSON.parse(rsp.response as string);

        // Cache the schema
        schemaCache[schemaKey] = schema;

        return schema;
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Error loading schema ${schemaPath}: ${msg}`);
    }
}

/**
 * Load all schemas from JSON files
 * @returns Promise resolving to an object with all loaded schemas
 */
async function loadAllSchemas(): Promise<Record<SchemaKey, any>> {
    const schemas = {} as Record<SchemaKey, any>;

    for (const key of Object.keys(SCHEMA_FILE_NAMES) as SchemaKey[]) {
        schemas[key] = await loadSchema(key);
    }

    return schemas;
}

/**
 * Initialize and register all schemas with AJV
 * Must be called before using any validators
 */
async function initializeSchemas(): Promise<void> {
    const schemas = await loadAllSchemas();

    // Register all schemas with AJV
    ajv.addSchema(schemas.Property);
    ajv.addSchema(schemas.Link);
    ajv.addSchema(schemas.Entity);
    ajv.addSchema(schemas.Relationship);
    ajv.addSchema(schemas.AnEntity);
    ajv.addSchema(schemas.ARelationship);
    ajv.addSchema(schemas.APackage);
}

// Initialize schemas on module load
let initializationPromise: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
    if (!initializationPromise) {
        initializationPromise = initializeSchemas();
    }
    return initializationPromise;
}

/**
 * Compiled validators (lazy-loaded)
 */
let validatePropertyLD: any = null;
let validateLinkLD: any = null;
let validateEntityLD: any = null;
let validateRelationshipLD: any = null;
let validateAnEntityLD: any = null;
let validateARelationshipLD: any = null;
let validatePackageLD: any = null;

/**
 * Get or compile a validator
 */
async function getValidator(schemaKey: SchemaKey): Promise<any> {
    await ensureInitialized();

    const schema = await loadSchema(schemaKey);

    // Check if already compiled
    switch (schemaKey) {
        case 'Property':
            if (!validatePropertyLD) validatePropertyLD = ajv.compile(schema);
            return validatePropertyLD;
        case 'Link':
            if (!validateLinkLD) validateLinkLD = ajv.compile(schema);
            return validateLinkLD;
        case 'Entity':
            if (!validateEntityLD) validateEntityLD = ajv.compile(schema);
            return validateEntityLD;
        case 'Relationship':
            if (!validateRelationshipLD) validateRelationshipLD = ajv.compile(schema);
            return validateRelationshipLD;
        case 'AnEntity':
            if (!validateAnEntityLD) validateAnEntityLD = ajv.compile(schema);
            return validateAnEntityLD;
        case 'ARelationship':
            if (!validateARelationshipLD) validateARelationshipLD = ajv.compile(schema);
            return validateARelationshipLD;
        case 'APackage':
            if (!validatePackageLD) validatePackageLD = ajv.compile(schema);
            return validatePackageLD;
        default:
            throw new Error(`Unknown schema key: ${schemaKey}`);
    }
}

/**
 * Public API - returns promises that resolve to validators
 */
export const SCH_LD = {
    // Lazy-loading getters for validators
    async getPropertyValidator() {
        return await getValidator('Property');
    },
    async getLinkValidator() {
        return await getValidator('Link');
    },
    async getEntityValidator() {
        return await getValidator('Entity');
    },
    async getRelationshipValidator() {
        return await getValidator('Relationship');
    },
    async getAnEntityValidator() {
        return await getValidator('AnEntity');
    },
    async getARelationshipValidator() {
        return await getValidator('ARelationship');
    },
    async getPackageValidator() {
        return await getValidator('APackage');
    },

    // Schema getter methods (return promises)
    async getPropertySchema() {
        return await loadSchema('Property');
    },
    async getLinkSchema() {
        return await loadSchema('Link');
    },
    async getEntitySchema() {
        return await loadSchema('Entity');
    },
    async getRelationshipSchema() {
        return await loadSchema('Relationship');
    },
    async getAnEntitySchema() {
        return await loadSchema('AnEntity');
    },
    async getARelationshipSchema() {
        return await loadSchema('ARelationship');
    },
    async getPackageSchema() {
        return await loadSchema('APackage');
    },

    // Validation methods (async)
    async validatePropertyLD(data: any): Promise<boolean> {
        const validator = await getValidator('Property');
        return validator(data);
    },
    async validateLinkLD(data: any): Promise<boolean> {
        const validator = await getValidator('Link');
        return validator(data);
    },
    async validateEntityLD(data: any): Promise<boolean> {
        const validator = await getValidator('Entity');
        return validator(data);
    },
    async validateRelationshipLD(data: any): Promise<boolean> {
        const validator = await getValidator('Relationship');
        return validator(data);
    },
    async validateAnEntityLD(data: any): Promise<boolean> {
        const validator = await getValidator('AnEntity');
        return validator(data);
    },
    async validateARelationshipLD(data: any): Promise<boolean> {
        const validator = await getValidator('ARelationship');
        return validator(data);
    },
    async validatePackageLD(data: any): Promise<boolean> {
        const validator = await getValidator('APackage');
        return validator(data);
    },

    // Error getter methods
    async getValidatePropertyLDErrors(): Promise<string> {
        const validator = await getValidator('Property');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },
    async getValidateLinkLDErrors(): Promise<string> {
        const validator = await getValidator('Link');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },
    async getValidateEntityLDErrors(): Promise<string> {
        const validator = await getValidator('Entity');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },
    async getValidateRelationshipLDErrors(): Promise<string> {
        const validator = await getValidator('Relationship');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },
    async getValidateAnEntityLDErrors(): Promise<string> {
        const validator = await getValidator('AnEntity');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },
    async getValidateARelationshipLDErrors(): Promise<string> {
        const validator = await getValidator('ARelationship');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },
    async getValidatePackageLDErrors(): Promise<string> {
        const validator = await getValidator('APackage');
        return ajv.errorsText(validator.errors, { separator: '; ' });
    },

    // Utility: Ensure all schemas are loaded
    async initialize(): Promise<void> {
        await ensureInitialized();
    }
};

// Export schema path for external use
export { SCHEMA_FILES };
