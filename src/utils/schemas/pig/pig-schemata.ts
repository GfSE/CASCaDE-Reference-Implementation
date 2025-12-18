import { ajv } from '../../../plugins/ajv';

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
            minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        },
        description: {
            type: 'array',
            minItems: 1,
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
    // One of 'title' and 'description' must be there, or both:
    anyOf: [
        { required: ['title'] },
        { required: ['description'] }
    ],
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$'
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
            minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        },
        description: {
            type: 'array',
            minItems: 1,
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
    // One of 'title' and 'description' must be there, or both:
    anyOf: [
        { required: ['title'] },
        { required: ['description'] }
    ],
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$'
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
