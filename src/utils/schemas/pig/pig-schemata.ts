import { ajv } from '../../../plugins/ajv';

const ID_NAME_PATTERN = '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$';
//const PROP_NAME_PATTERN = '(^[A-Za-z0-9_\\-]+:[^:\\s]+$)|(^https?:\\/\\/\\S+$)';

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
            description: 'The PigItemType'
        },
        hasClass: { $ref: '#/$defs/idString' },
        specializes: { $ref: '#/$defs/idString' },
        title: {
            type: 'array',
        //    minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        },
        description: {
            type: 'array',
        //    minItems: 1,
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
        composedProperty: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        defaultValue: { type: 'string' }
    },
    additionalProperties: false,
    required: ['id', 'itemType', 'datatype'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
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
            description: 'The PigItemType'
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
    required: ['id', 'itemType'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
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
            description: 'The PigItemType'
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
    required: ['id', 'itemType'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
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
const validateRelationshipSchema = ajv.compile(RELATIONSHIP_SCHEMA);

export const SCH = {
    PROPERTY_SCHEMA,
    validatePropertySchema,
    getValidatePropertyErrors() {
        return ajv.errorsText(validatePropertySchema.errors, { separator: '; ' });
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
    }
};
