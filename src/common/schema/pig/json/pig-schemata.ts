import { DEF } from '../../../lib/definitions';
import { ajv } from '../../../../plugins/ajv';

class PigSchemaFactory {
    static getIdNamePattern() {
        return '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$';
    }
    static getDefs() {
        return {
            idString: {
                type: 'string',
                description: 'TPigId — term with namespace (prefix:local) oder eine URI',
                pattern: this.getIdNamePattern()
            },
            LanguageText: {
                type: 'object',
                required: ['value'],
                additionalProperties: false,
                properties: {
                    value: {
                        type: 'string',
                        minLength: 1
                    },
                    lang: { type: 'string' }
                }
            },
            MultiLanguageText: {
                type: 'array',
                minItems: 1,
                items: { $ref: '#/$defs/LanguageText' }
            }
        }
    }
    static getPropertyRef() {
        return {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    hasClass: { $ref: '#/$defs/idString' },
                    itemType: {
                        type: 'string',
                        enum: [`${DEF.pfxNsMeta}aProperty`],
                        description: `The itemType for ${DEF.pfxNsMeta}aProperty`
                    },
                    value: {
                        type: 'string',
                        minLength: 1
                    },
                    idRef: { $ref: '#/$defs/idString' },
                    aComposedProperty: {
                        type: 'array',
                        items: { $ref: '#/$defs/idString' }
                    }
                },
                required: ['itemType', 'hasClass'],
                oneOf: [
                    { required: ['value'] },
                    { required: ['idRef'] }
                ],
                additionalProperties: false
            }
        }
    }
    static getLinkRef(linkType:string, minI?:number, maxI?:number) {
        return {
            type: 'array',
            minItems: minI,
            maxItems: maxI,
            items: {
                type: 'object',
                properties: {
                    hasClass: { $ref: '#/$defs/idString' },
                    itemType: {
                        type: 'string',
                        enum: [`${linkType}`],
                        description: `The itemType for ${linkType}`
                    },
                    idRef: { $ref: '#/$defs/idString' }
                },
                required: ['itemType', 'hasClass', 'idRef'],
                additionalProperties: false
            }
        }
    }

    static getPropertySchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IProperty',
            type: 'object',
            properties: {
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Property`],
                    description: `The itemType for ${DEF.pfxNsMeta}Property`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                definition: { $ref: '#/$defs/MultiLanguageText' },
                datatype: {
                    type: 'string',
                    pattern: '^xs:[A-Za-z]+$'
                },
                minCount: { type: 'integer', minimum: 0 },
                maxCount: { type: 'integer', minimum: 1 },
                maxLength: { type: 'integer', minimum: 1 },
                minInclusive: { type: 'number' },
                maxInclusive: { type: 'number' },
                pattern: { type: 'string' },
                unit: { type: 'string' },
                defaultValue: { type: 'string' },
                enumeratedValue: {
                    type: 'array',
                    items: {
                        oneOf: [
                            {
                                type: 'object',
                                required: ['id', 'title'],
                                properties: {
                                    id: { $ref: '#/$defs/idString' },
                                    title: { $ref: '#/$defs/MultiLanguageText' }
                                },
                                additionalProperties: false,
                                description: 'Enumeration value with multi-language title (for xs:string)'
                            },
                            {
                                type: 'object',
                                required: ['id', 'value'],
                                properties: {
                                    id: { $ref: '#/$defs/idString' },
                                    value: {
                                        type: 'string',
                                        minLength: 1,
                                        description: 'Literal value for numeric and other datatypes (stored as string)'
                                    }
                                },
                                additionalProperties: false,
                                description: 'Enumeration value with literal value (for xs:integer, xs:double, etc.)'
                            }
                        ]
                    }
                },
                composedProperty: {
                    type: 'array',
                    items: { $ref: '#/$defs/idString' }
                },
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' }
            },
            additionalProperties: false,
            required: ['id', 'hasClass', 'itemType', 'title', 'datatype'], // change info is optional for classes
            $defs: this.getDefs()
        };
    }

    static getLinkSchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IReference',
            type: 'object',
            properties: {
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Link`],
                    description: `The itemType for ${DEF.pfxNsMeta}Link`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                definition: { $ref: '#/$defs/MultiLanguageText' },
                enumeratedEndpoint: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/idString' }
                },
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' }
            },
            additionalProperties: false,
            required: ['id', 'hasClass', 'itemType', 'title', 'enumeratedEndpoint'], // change info is optional for classes
            $defs: this.getDefs()
        };
    }

    static getEntitySchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IEntity',
            type: 'object',
            properties: {
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Entity`],
                    description: `The itemType for ${DEF.pfxNsMeta}Entity`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                definition: { $ref: '#/$defs/MultiLanguageText' },
                enumeratedProperty: {
                    type: 'array',
                    items: { $ref: '#/$defs/idString' }
                },
                enumeratedTargetLink: {
                    type: 'array',
                    items: { $ref: '#/$defs/idString' }
                },
                icon: {
                    type: 'object',
                    required: ['value'],
                    additionalProperties: false,
                    properties: {
                        value: { type: 'string' }
                    },
                    description: 'string oder data URI für das Entity-Icon'
                },
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' }
            },
            additionalProperties: false,
            required: ['id', 'hasClass', 'itemType', 'title'], // change info is optional for classes
            $defs: this.getDefs()
        };
    }

    static getRelationshipSchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IRelationship',
            type: 'object',
            properties: {
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Relationship`],
                    description: `The itemType for ${DEF.pfxNsMeta}Relationship`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                definition: { $ref: '#/$defs/MultiLanguageText' },
                enumeratedProperty: {
                    type: 'array',
                    items: { $ref: '#/$defs/idString' }
                },
                enumeratedSourceLink: { $ref: '#/$defs/idString' },
                enumeratedTargetLink: { $ref: '#/$defs/idString' },
                icon: {
                    type: 'object',
                    required: ['value'],
                    additionalProperties: false,
                    properties: {
                        value: { type: 'string' }
                    },
                    description: 'string oder data URI für das Relationship-Icon'
                },
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' }
            },
            additionalProperties: false,
            required: ['id', 'hasClass', 'itemType', 'title'], // change info is optional for classes
            $defs: this.getDefs()
        };
    }

    static getAnEntitySchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IAnEntity',
            type: 'object',
            properties: {
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}anEntity`],
                    description: `The itemType for ${DEF.pfxNsMeta}anEntity`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                hasProperty: this.getPropertyRef(),
                hasTargetLink: this.getLinkRef(`${DEF.pfxNsMeta}aTargetLink`),
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' }
            },
            additionalProperties: false,
            required: ['id', 'hasClass', 'itemType', 'modified'],
            anyOf: [
                { required: ['title'] },
                { required: ['description'] }
            ],
            $defs: this.getDefs()
        };
    }

    static getARelationshipSchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IARelationship',
            type: 'object',
            properties: {
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}aRelationship`],
                    description: `The itemType for ${DEF.pfxNsMeta}aRelationship`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                hasProperty: this.getPropertyRef(),
                hasSourceLink: this.getLinkRef(`${DEF.pfxNsMeta}aSourceLink`, 1, 1),
                hasTargetLink: this.getLinkRef(`${DEF.pfxNsMeta}aTargetLink`, 1, 1),
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' }
            },
            additionalProperties: false,
            required: ['id', 'hasClass', 'itemType', 'modified', 'hasSourceLink', 'hasTargetLink'], // but neither title nor description is required
            $defs: this.getDefs()
        };
    }

    static getAPackageSchema() {
        return {
            $schema: 'http://json-schema.org/draft-07/schema#',
            $id: 'https://gfse.org/schema/pig/IAPackage',
            type: 'object',
            properties: {
                context: {
                    type: 'array',
                    items: {
                        type: 'object',
                        description: 'Namespace definitions with tag and URI mappings',
                        properties: {
                            tag: { type: 'string' },
                            uri: { type: 'string', format: 'uri' }
                        },
                        additionalProperties: false
                    }
                },
                id: { $ref: '#/$defs/idString' },
                hasClass: { $ref: '#/$defs/idString' },
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}aPackage`],
                    description: `The itemType for ${DEF.pfxNsMeta}aPackage`
                },
                title: { $ref: '#/$defs/MultiLanguageText' },
                description: { $ref: '#/$defs/MultiLanguageText' },
                hasProperty: this.getPropertyRef(),
                hasTargetLink: this.getLinkRef(`${DEF.pfxNsMeta}aTargetLink`, 1, 1),
                revision: { type: 'string' },
                priorRevision: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 2,
                    items: { type: 'string' }
                },
                modified: {
                    type: 'string',
                    format: 'date-time'
                },
                creator: { type: 'string' },
                graph: {
                    type: 'array',
                    items: {
                        type: 'object',
                        description: 'Any metamodel item in the package graph; items are checked individually before instantiation'
                    }
                }
            },
            additionalProperties: false,
            required: ['context', 'id', 'hasClass', 'itemType', 'modified', 'graph'],
            $defs: this.getDefs()
        };
    }
}

// Validierungsfunktionen
const validatePropertySchema = ajv.compile(PigSchemaFactory.getPropertySchema());
const validateLinkSchema = ajv.compile(PigSchemaFactory.getLinkSchema());
const validateEntitySchema = ajv.compile(PigSchemaFactory.getEntitySchema());
const validateRelationshipSchema = ajv.compile(PigSchemaFactory.getRelationshipSchema());
const validateAnEntitySchema = ajv.compile(PigSchemaFactory.getAnEntitySchema());
const validateARelationshipSchema = ajv.compile(PigSchemaFactory.getARelationshipSchema());
const validateAPackageSchema = ajv.compile(PigSchemaFactory.getAPackageSchema());

// Exportstruktur
export const SCH = {
    PROPERTY_SCHEMA: PigSchemaFactory.getPropertySchema(),
    validatePropertySchema,
    getValidatePropertyErrors() {
        return ajv.errorsText(validatePropertySchema.errors, { separator: '; ' });
    },
    LINK_SCHEMA: PigSchemaFactory.getLinkSchema(),
    validateLinkSchema,
    getValidateLinkErrors() {
        return ajv.errorsText(validateLinkSchema.errors, { separator: '; ' });
    },
    ENTITY_SCHEMA: PigSchemaFactory.getEntitySchema(),
    validateEntitySchema,
    getValidateEntityErrors() {
        return ajv.errorsText(validateEntitySchema.errors, { separator: '; ' });
    },
    RELATIONSHIP_SCHEMA: PigSchemaFactory.getRelationshipSchema(),
    validateRelationshipSchema,
    getValidateRelationshipErrors() {
        return ajv.errorsText(validateRelationshipSchema.errors, { separator: '; ' });
    },
    ANENTITY_SCHEMA: PigSchemaFactory.getAnEntitySchema(),
    validateAnEntitySchema,
    getValidateAnEntityErrors() {
        return ajv.errorsText(validateAnEntitySchema.errors, { separator: '; ' });
    },
    ARELATIONSHIP_SCHEMA: PigSchemaFactory.getARelationshipSchema(),
    validateARelationshipSchema,
    getValidateARelationshipErrors() {
        return ajv.errorsText(validateARelationshipSchema.errors, { separator: '; ' });
    },
    APACKAGE_SCHEMA: PigSchemaFactory.getAPackageSchema(),
    validateAPackageSchema,
    getValidateAPackageErrors() {
        return ajv.errorsText(validateAPackageSchema.errors, { separator: '; ' });
    }
};
