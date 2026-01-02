/*! JSON SCHEMATA for PIG items: Property, Reference, Entity, Relationship
 * Messages and Responses
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/** JSON SCHEMATA for PIG items: Property, Reference, Entity, Relationship
 *  Dependencies: ajv (Another JSON Schema Validator) https://ajv.js.org/
 *  Authors: oskar.dungern@gfse.org, ..
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 *
 * Design decisions:
 * - use JSON Schema draft-07 (widely supported)
 * - use ajv for validation (fast, popular)
 * - schemata of all classes as well as relationship instances must have a title and may have a description
 * - schema for entity may have either a title or a description or both.
 *   This allows entities (such as simple paragraphs) without a title but with a description only.
*/

import { ajv } from '../../../plugins/ajv';

const ID_NAME_PATTERN = '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$';
//const PROP_NAME_PATTERN = '(^[A-Za-z0-9_\\-]+:[^:\\s]+$)|(^https?:\\/\\/\\S+$)';

/* Consider to allow date or date-time:
        modified: {
            oneOf: [
                { type: 'string', format: 'date' },
                { type: 'string', format: 'date-time' }
            ]
        }
*/
/* PROPERTY_SCHEMA: describes IProperty (pig:Property) */
const PROPERTY_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://gfse.org/schemas/pig/IProperty',
    type: 'object',
    properties: {
        id: { $ref: '#/$defs/idString' },
        itemType: {
            type: 'string',
            enum: ['pig:Property'],
            description: 'The PigItemType for pig:Property'
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
//        datatype: { $ref: '#/$defs/xsDataType' },
        datatype: {
            type: 'string',
            // accept xs: or xsd: datatypes (basic pattern); specific values validated in code
//            pattern: '^(?:xs|xsd):[A-Za-z]+$'
            pattern: '^xs:[A-Za-z]+$'
        },
        minCount: { type: 'integer', minimum: 0 },
        maxCount: { type: 'integer', minimum: 0 },
        maxLength: { type: 'integer', minimum: 0 },
        minInclusive: { type: 'number' },
        maxInclusive: { type: 'number' },
        pattern: { type: 'string' },
        eligibleValue: {
            type: 'array',
            items: {
                type: 'object',
                required: ['id', 'title'],
                properties: {
                    id: { $ref: '#/$defs/idString' },
                    title: { type: 'array', minItems: 1, items: { $ref: '#/$defs/LanguageText' } }
                },
                additionalProperties: false
            }
        },
        defaultValue: { type: 'string' },
        unit: { type: 'string' },
        composedProperty: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        }
    },
    additionalProperties: false,
    required: ['id', 'itemType', 'title', 'datatype'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: ID_NAME_PATTERN
        },
        LanguageText: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' },
                lang: { type: 'string' }
            }
    /*    },
        xsDataType: {
            type: 'string',
            description: 'XSD/XMLSchema datatype',
            enum: [
                'xs:boolean',
                'xs:integer',
                'xs:double',
                'xs:string',
                'xs:anyURI',
                'xs:dateTime',
                'xs:duration',
                'xs:complexType',
            ] */
        }
    }
};
const validatePropertySchema = ajv.compile(PROPERTY_SCHEMA);

/* REFERENCE_SCHEMA: describes IReference (pig:Reference) */
const REFERENCE_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://gfse.org/schemas/pig/IReference',
    type: 'object',
    properties: {
        id: { $ref: '#/$defs/idString' },
        itemType: {
            type: 'string',
            enum: ['pig:Reference'],
            description: 'The PigItemType for pig:Reference'
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
        eligibleTarget: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/idString' }
        }
    },
    additionalProperties: false,
    required: ['id', 'itemType', 'title', 'eligibleTarget'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: ID_NAME_PATTERN
        },
        LanguageText: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' },
                lang: { type: 'string' }
            }
        }
    }
};
const validateReferenceSchema = ajv.compile(REFERENCE_SCHEMA);

/* ENTITY_SCHEMA: describes IEntity (pig:Entity) */
const ENTITY_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://gfse.org/schemas/pig/IEntity',
    type: 'object',
    properties: {
        id: { $ref: '#/$defs/idString' },
        itemType: {
            type: 'string',
            enum: ['pig:Entity'],
            description: 'The PigItemType for pig:Entity'
        },
        hasClass: { $ref: '#/$defs/idString' },
        specializes: { $ref: '#/$defs/idString' },
        eligibleProperty: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        eligibleReference: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        icon: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' }
            }
        },
        title: {
            type: 'array',
        //    minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        },
        description: {
            type: 'array',
        //    minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        }
    },
    additionalProperties: false,
    required: ['id', 'itemType', 'title'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
    /* One of 'title' and 'description' must be there with content, or both:
    anyOf: [
        { required: ['title'] },
        { required: ['description'] }
    ], */
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: ID_NAME_PATTERN
                    
        },
        LanguageText: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' },
                lang: { type: 'string' }
            }
        }
    }
};
const validateEntitySchema = ajv.compile(ENTITY_SCHEMA);

/* RELATIONSHIP_SCHEMA: describes IRelationship (pig:Relationship) */
const RELATIONSHIP_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://gfse.org/schemas/pig/IRelationship',
    type: 'object',
    properties: {
        id: { $ref: '#/$defs/idString' },
        itemType: {
            type: 'string',
            enum: ['pig:Relationship'],
            description: 'The PigItemType for pig:Relationship'
        },
        hasClass: { $ref: '#/$defs/idString' },
        specializes: { $ref: '#/$defs/idString' },
        eligibleProperty: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        eligibleSource: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        eligibleTarget: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        icon: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' }
            }
        },
        title: {
            type: 'array',
        //    minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        },
        description: {
            type: 'array',
        //    minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        }
    },
    additionalProperties: false,
    required: ['id', 'itemType', 'title'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: ID_NAME_PATTERN
        },
        LanguageText: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' },
                lang: { type: 'string' }
            }
        }
    }
};
const validateRelationshipSchema = ajv.compile(RELATIONSHIP_SCHEMA);

/* ANENTITY_SCHEMA: describes IAnEntity (pig:anEntity) */
/*
// One of 'title' and 'description' must be there with content, or both:
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
*/
/* ANENTITY_SCHEMA: describes IAnEntity (pig:anEntity) */
const ANENTITY_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://gfse.org/schemas/pig/IAnEntity',
    type: 'object',
    properties: {
        id: { $ref: '#/$defs/idString' },
        itemType: {
            type: 'string',
            enum: ['pig:anEntity'],
            description: 'The PigItemType for pig:anEntity'
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
                        enum: ['pig:aProperty']
                    },
                    hasClass: { $ref: '#/$defs/idString' },
                    value: { type: 'string' },
                    idRef: { $ref: '#/$defs/idString' },
                    aComposedProperty: {
                        type: 'array',
                        items: { $ref: '#/$defs/idString' }
                    }
                },
                required: ['itemType', 'hasClass'],
                // One of 'hasClass' and 'specializes' must be there but not both:
                oneOf: [
                    { required: ['value'] },
                    { required: ['idRef'] }
                ],
                additionalProperties: false
            }
        },
        hasTarget: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    itemType: {
                        type: 'string',
                        enum: ['pig:aReference']
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
    required: ['id', 'itemType', 'hasClass', /*'revision',*/ 'modified'],
    // One of 'title' and 'description' must be there with content, or both:
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
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: ID_NAME_PATTERN
        },
        LanguageText: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' },
                lang: { type: 'string' }
            }
        }
    }
};
const validateAnEntitySchema = ajv.compile(ANENTITY_SCHEMA);

export const SCH = {
    PROPERTY_SCHEMA,
    validatePropertySchema,
    getValidatePropertyErrors() {
        return ajv.errorsText(validatePropertySchema.errors, { separator: '; ' });
    },
    REFERENCE_SCHEMA,
    validateReferenceSchema,
    getValidateReferenceErrors() {
        return ajv.errorsText(validateReferenceSchema.errors, { separator: '; ' })
    },
    ENTITY_SCHEMA,
    validateEntitySchema,
    getValidateEntityErrors() {
        return ajv.errorsText(validateEntitySchema.errors, { separator: '; ' })
    },
    RELATIONSHIP_SCHEMA,
    validateRelationshipSchema,
    getValidateRelationshipErrors() {
        return ajv.errorsText(validateRelationshipSchema.errors, { separator: '; ' })
    },
    ANENTITY_SCHEMA,
    validateAnEntitySchema,
    getValidateAnEntityErrors() {
        return ajv.errorsText(validateAnEntitySchema.errors, { separator: '; ' })
    }
};
