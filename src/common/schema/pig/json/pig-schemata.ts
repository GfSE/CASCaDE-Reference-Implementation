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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Property`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}Property`
                },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
                title: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                definition: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
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
                                    title: {
                                        type: 'array',
                                        minItems: 1,
                                        items: { $ref: '#/$defs/LanguageText' }
                                    }
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
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'title', 'datatype'],
            oneOf: [
                { required: ['hasClass'] },
                { required: ['specializes'] }
            ],
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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Link`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}Link`
                },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
                title: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                definition: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                enumeratedEndpoint: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/idString' }
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'title', 'enumeratedEndpoint'],
            oneOf: [
                { required: ['hasClass'] },
                { required: ['specializes'] }
            ],
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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Entity`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}Entity`
                },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
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
                title: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                definition: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'title'],
            oneOf: [
                { required: ['hasClass'] },
                { required: ['specializes'] }
            ],
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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}Relationship`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}Relationship`
                },
                hasClass: { $ref: '#/$defs/idString' },
                specializes: { $ref: '#/$defs/idString' },
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
                title: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                definition: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'title'],
            oneOf: [
                { required: ['hasClass'] },
                { required: ['specializes'] }
            ],
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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}anEntity`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}anEntity`
                },
                hasClass: { $ref: '#/$defs/idString' },
                title: {
                    type: 'array',
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    items: { $ref: '#/$defs/LanguageText' }
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
                creator: { type: 'string' },
                hasProperty: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            itemType: {
                                type: 'string',
                                enum: [`${DEF.pfxNsMeta}aProperty`]
                            },
                            hasClass: { $ref: '#/$defs/idString' },
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
                },
                hasTargetLink: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            itemType: {
                                type: 'string',
                                enum: [`${DEF.pfxNsMeta}aTargetLink`]
                            },
                            hasClass: { $ref: '#/$defs/idString' },
                            idRef: { $ref: '#/$defs/idString' }
                        },
                        required: ['itemType', 'hasClass', 'idRef'],
                        additionalProperties: false
                    }
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'hasClass', 'modified'],
            anyOf: [
                {
                    required: ['title'],
                    properties: { title: { type: 'array', minItems: 1 } }
                },
                {
                    required: ['description'],
                    properties: { description: { type: 'array', minItems: 1 } }
                }
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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}aRelationship`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}aRelationship`
                },
                hasClass: { $ref: '#/$defs/idString' },
                title: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
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
                creator: { type: 'string' },
                hasProperty: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            itemType: {
                                type: 'string',
                                enum: [`${DEF.pfxNsMeta}aProperty`]
                            },
                            hasClass: { $ref: '#/$defs/idString' },
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
                },
                hasSourceLink: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 1,
                    items: {
                        type: 'object',
                        properties: {
                            itemType: {
                                type: 'string',
                                enum: [`${DEF.pfxNsMeta}aSourceLink`]
                            },
                            hasClass: { $ref: '#/$defs/idString' },
                            idRef: { $ref: '#/$defs/idString' }
                        },
                        required: ['itemType', 'hasClass', 'idRef'],
                        additionalProperties: false
                    }
                },
                hasTargetLink: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 1,
                    items: {
                        type: 'object',
                        properties: {
                            itemType: {
                                type: 'string',
                                enum: [`${DEF.pfxNsMeta}aTargetLink`],
                                description: `The PigItemType for ${DEF.pfxNsMeta}aTargetLink`
                            },
                            hasClass: { $ref: '#/$defs/idString' },
                            idRef: { $ref: '#/$defs/idString' }
                        },
                        required: ['itemType', 'hasClass', 'idRef'],
                        additionalProperties: false
                    }
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'hasClass', 'modified', 'hasSourceLink', 'hasTargetLink'],
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
                itemType: {
                    type: 'string',
                    enum: [`${DEF.pfxNsMeta}aPackage`],
                    description: `The PigItemType for ${DEF.pfxNsMeta}aPackage`
                },
                title: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
                },
                description: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/$defs/LanguageText' }
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
                creator: { type: 'string' },
                graph: {
                    type: 'array',
                    items: {
                        type: 'object',
                        description: 'Any PIG item in the package graph; items are checked individually before instantiation'
                    }
                }
            },
            additionalProperties: false,
            required: ['id', 'itemType', 'modified', 'graph'],
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
