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
 * - use JSON Schema draft-07 (widely supported)
 * - use ajv for validation (fast, popular)
 * - these schemas validate JSON-LD documents (@graph, @context, @id, @type)
 * - separate from internal JSON schemas (pig-schemata.ts)
 *
 * Limitations:
 * - xs:datatype values are only pattern-validated here; specific accepted values are validated in code
 * - further constraints (e.g. maxCount >= minCount) are validated in code
 * - eligible values in Property only for string values; other datatypes to be implemented
*/

import { ajv } from '../../../plugins/ajv';

const ID_NAME_PATTERN = '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$';

/* Shared JSON-LD definitions */
const JSONLD_DEFS = {
    idString: {
        type: 'string',
        pattern: ID_NAME_PATTERN
    },
    idObject: {
        type: 'object',
        required: ['@id'],
        properties: {
            '@id': { $ref: '#/$defs/idString'  }
        },
        additionalProperties: false
    },
    languageValue: {
        type: 'object',
        required: ['@value'],
        properties: {
            '@value': { type: 'string' },
            '@language': { type: 'string' }
        },
        additionalProperties: false
    }
};

/* PROPERTY_LD_SCHEMA: validates JSON-LD representation of IProperty */
const PROPERTY_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/Property',
    type: 'object',
    properties: {
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:specializes': { $ref: '#/$defs/idObject' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:Property'],
                    description: 'The PigItemType for pig:Property'
                }
            },
            additionalProperties: false
        },
        'dcterms:title': {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/languageValue' }
        },
        'sh:datatype': { $ref: '#/$defs/idObject' },
        'sh:minCount': { type: 'number' },
        'sh:maxCount': { type: 'number' },
        'sh:maxLength': { type: 'number' },
        'sh:minInclusive': { type: 'number' },
        'sh:maxInclusive': { type: 'number' },
        'sh:pattern': { type: 'string' },
        'pig:unit': { type: 'string' },
        'sh:defaultValue': { type: 'string' },
        'pig:eligibleValue': {
            type: 'array',
            items: {
                type: 'object',
                required: ['@id', 'dcterms:title'],
                properties: {
                    '@id': { $ref: '#/$defs/idString' },
                    'dcterms:title': {
                        type: 'array',
                        minItems: 1,
                        items: { $ref: '#/$defs/languageValue' }
                    }
                },
                additionalProperties: false
            }
        },
        'pig:composedProperty': {
            type: 'array',
            items: { $ref: '#/$defs/idObject' }
        }
    },
    required: ['@id', 'pig:itemType', 'dcterms:title', 'sh:datatype'],
    oneOf: [
        { required: ['@type'] },
        { required: ['pig:specializes'] }
    ],
    additionalProperties: false,
    $defs: JSONLD_DEFS
};
/* LINK_LD_SCHEMA: validates JSON-LD representation of ILink */
const LINK_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/Link',
    type: 'object',
    properties: {
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:specializes': { $ref: '#/$defs/idObject' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:Link'],
                    description: 'The PigItemType for pig:Property'
                }
            },
            additionalProperties: false
        },
        'dcterms:title': {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'pig:eligibleEndpoint': {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/idObject' }
        }
    },
    required: ['@id', 'pig:itemType', 'dcterms:title', 'pig:eligibleEndpoint'],
    oneOf: [
        { required: ['@type'] },
        { required: ['pig:specializes'] }
    ],
    additionalProperties: false,
    $defs: JSONLD_DEFS
};

/* ENTITY_LD_SCHEMA: validates JSON-LD representation of IEntity */
const ENTITY_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/Entity',
    type: 'object',
    properties: {
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:specializes': { $ref: '#/$defs/idObject' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:Entity'],
                    description: 'The PigItemType for pig:Property'
                }
            },
            additionalProperties: false
        },
        'dcterms:title': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'pig:eligibleProperty': {
            type: 'array',
            items: { $ref: '#/$defs/idObject' }
        },
        'pig:eligibleTargetLink': {
            type: 'array',
            items: { $ref: '#/$defs/idObject' }
        },
        'pig:icon': {
            type: 'object',
            properties: {
                '@value': { type: 'string' }
            }
        }
    },
    required: ['@id', 'pig:itemType', 'dcterms:title'],
    oneOf: [
        { required: ['@type'] },
        { required: ['pig:specializes'] }
    ],
    additionalProperties: false,
    $defs: JSONLD_DEFS
};

/* RELATIONSHIP_LD_SCHEMA: validates JSON-LD representation of IRelationship */
const RELATIONSHIP_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/Relationship',
    type: 'object',
    properties: {
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:specializes': { $ref: '#/$defs/idObject' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:Relationship'],
                    description: 'The PigItemType for pig:Property'
                }
            },
            additionalProperties: false
        },
        'dcterms:title': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'pig:eligibleProperty': {
            type: 'array',
            items: { $ref: '#/$defs/idObject' }
        },
        'pig:eligibleSourceLink': { $ref: '#/$defs/idObject' },
        'pig:eligibleTargetLink': { $ref: '#/$defs/idObject' },
        'pig:icon': {
            type: 'object',
            properties: {
                '@value': { type: 'string' }
            }
        }
    },
    required: ['@id', 'pig:itemType', 'dcterms:title'],
    oneOf: [
        { required: ['@type'] },
        { required: ['pig:specializes'] }
    ],
    additionalProperties: false,
    $defs: JSONLD_DEFS
};

/* ANENTITY_LD_SCHEMA: validates JSON-LD representation of IAnEntity */
const ANENTITY_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/AnEntity',
    type: 'object',
    properties: {
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:anEntity'],
                    description: 'The PigItemType for pig:anEntity'
                }
            },
            additionalProperties: false
        },
        'pig:revision': { type: 'string' },
        'pig:priorRevision': {
            type: 'array',
            items: { type: 'string' }
        },
        'dcterms:modified': { type: 'string', format: 'date-time' },
        'dcterms:creator': { type: 'string' },
        'dcterms:title': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        }
    },
    patternProperties: {
        '^(?!pig:itemType|pig:revision|pig:priorRevision|@id|@type|dcterms:modified|dcterms:creator|dcterms:title|dcterms:description)([A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$': {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    'pig:itemType': {
                        type: 'object',
                        required: ['@id'],
                        properties: {
                            '@id': {
                                type: 'string',
                                enum: ['pig:aProperty', 'pig:aTargetLink']
                            }
                        },
                        additionalProperties: false
                    },
                    '@value': { type: 'string' },
                    '@id': { $ref: '#/$defs/idString' }
                },
                required: ['pig:itemType'],
                oneOf: [
                    {
                        // aProperty with direct value: must have @value
                        type: 'object',
                        properties: {
                            'pig:itemType': {
                                type: 'object',
                                properties: {
                                    '@id': { const: 'pig:aProperty' }
                                }
                            }
                        },
                        required: ['@value'],
                        not: { required: ['@id'] }
                    },
                    {
                        // aProperty with enumeration reference: must have @id
                        type: 'object',
                        properties: {
                            'pig:itemType': {
                                type: 'object',
                                properties: {
                                    '@id': { const: 'pig:aProperty' }
                                }
                            }
                        },
                        required: ['@id'],
                        not: { required: ['@value'] }
                    },
                    {
                        // aTargetLink: must have @id
                        type: 'object',
                        properties: {
                            'pig:itemType': {
                                type: 'object',
                                properties: {
                                    '@id': { const: 'pig:aTargetLink' }
                                }
                            }
                        },
                        required: ['@id'],
                        not: { required: ['@value'] }
                    }
                ],
                additionalProperties: false
            }
        }
    },
    required: ['@id', 'pig:itemType', '@type', 'dcterms:modified'],
    anyOf: [
        {
            required: ['dcterms:title'],
            properties: { 'dcterms:title': { type: 'array', minItems: 1 } }
        },
        {
            required: ['dcterms:description'],
            properties: { 'dcterms:description': { type: 'array', minItems: 1 } }
        }
    ],
    additionalProperties: false,
    $defs: JSONLD_DEFS
};

/* ARELATIONSHIP_LD_SCHEMA: validates JSON-LD representation of IARelationship */
const ARELATIONSHIP_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/ARelationship',
    type: 'object',
    properties: {
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:aRelationship'],
                    description: 'The PigItemType for pig:aRelationship'
                }
            },
            additionalProperties: false
        },
        'pig:revision': { type: 'string' },
        'pig:priorRevision': {
            type: 'array',
            items: { type: 'string' }
        },
        'dcterms:modified': { type: 'string', format: 'date-time' },
        'dcterms:creator': { type: 'string' },
        'dcterms:title': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        }
    },
    patternProperties: {
        // Match configurable properties and links, but exclude standard PIG properties
        // Negative lookahead: don't match properties that are already defined in 'properties'
        '^(?!pig:itemType|pig:revision|pig:priorRevision|@id|@type|dcterms:modified|dcterms:creator|dcterms:title|dcterms:description)([A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$': {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    'pig:itemType': {
                        type: 'object',
                        required: ['@id'],
                        properties: {
                            '@id': {
                                type: 'string',
                                enum: ['pig:aProperty', 'pig:aSourceLink', 'pig:aTargetLink']
                            }
                        },
                        additionalProperties: false
                    },
                    '@value': { type: 'string' },
                    '@id': { $ref: '#/$defs/idString' }
                },
                required: ['pig:itemType'],
                oneOf: [
                    {
                        // aProperty with direct value: must have @value
                        type: 'object',
                        properties: {
                            'pig:itemType': {
                                type: 'object',
                                properties: {
                                    '@id': { const: 'pig:aProperty' }
                                }
                            }
                        },
                        required: ['@value'],
                        not: { required: ['@id'] }
                    },
                    {
                        // aProperty with enumeration reference: must have @id
                        type: 'object',
                        properties: {
                            'pig:itemType': {
                                type: 'object',
                                properties: {
                                    '@id': { const: 'pig:aProperty' }
                                }
                            }
                        },
                        required: ['@id'],
                        not: { required: ['@value'] }
                    },
                    {
                        // aSourceLink or aTargetLink: must have @id
                        type: 'object',
                        properties: {
                            'pig:itemType': {
                                type: 'object',
                                properties: {
                                    '@id': { enum: ['pig:aSourceLink', 'pig:aTargetLink'] }
                                }
                            }
                        },
                        required: ['@id'],
                        not: { required: ['@value'] }
                    }
                ],
                additionalProperties: false
            }
        }
    },
    required: ['@id', 'pig:itemType', '@type', 'dcterms:modified'],
    additionalProperties: false, // ✅ Strict validation enabled
    $defs: JSONLD_DEFS
};

/* APACKAGE_LD_SCHEMA: validates a complete JSON-LD document with @graph */
const APACKAGE_LD_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: '#/schema/jsonld/APackage',
    type: 'object',
    properties: {
        '@context': {
            description: 'JSON-LD context',
            oneOf: [
                { type: 'object' },
                { type: 'array' },
                { type: 'string' }
            ]
        },
        '@id': { $ref: '#/$defs/idString' },
        '@type': { $ref: '#/$defs/idString' },
        'pig:itemType': {
            type: 'object',
            required: ['@id'],
            properties: {
                '@id': {
                    type: 'string',
                    enum: ['pig:aPackage'],
                    description: 'The PigItemType for pig:aPackage'
                }
            },
            additionalProperties: false
        },
        'dcterms:modified': { type: 'string', format: 'date-time' },
        'dcterms:creator': { type: 'string' },
        'dcterms:title': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        'dcterms:description': {
            type: 'array',
            items: { $ref: '#/$defs/languageValue' }
        },
        '@graph': {
            type: 'array',
            minItems: 0,
            items: {
                type: 'object',
                required: ['pig:itemType'],
                properties: {
                    'pig:itemType': {
                        type: 'object',
                        required: ['@id'],
                        properties: {
                            '@id': { type: 'string' }
                        }
                    }
                },
                // Use if-then-else chains to apply only the matching schema based on itemType;
                // test the instances first:
                allOf: [
                    {
                        if: {
                            type: 'object',
                            properties: {
                                'pig:itemType': {
                                    type: 'object',
                                    properties: {
                                        '@id': { const: 'pig:anEntity' }
                                    }
                                }
                            }
                        },
                        then: { $ref: '#/schema/jsonld/AnEntity' }
                    },
                    {
                        if: {
                            type: 'object',
                            properties: {
                                'pig:itemType': {
                                    type: 'object',
                                    properties: {
                                        '@id': { const: 'pig:aRelationship' }
                                    }
                                }
                            }
                        },
                        then: { $ref: '#/schema/jsonld/ARelationship' }
                    },
                    {
                        if: {
                            type: 'object',
                            properties: {
                                'pig:itemType': {
                                    type: 'object',
                                    properties: {
                                        '@id': { const: 'pig:Property' }
                                    }
                                }
                            }
                        },
                        then: { $ref: '#/schema/jsonld/Property' }
                    },
                    {
                        if: {
                            type: 'object',
                            properties: {
                                'pig:itemType': {
                                    type: 'object',
                                    properties: {
                                        '@id': { const: 'pig:Link' }
                                    }
                                }
                            }
                        },
                        then: { $ref: '#/schema/jsonld/Link' }
                    },
                    {
                        if: {
                            type: 'object',
                            properties: {
                                'pig:itemType': {
                                    type: 'object',
                                    properties: {
                                        '@id': { const: 'pig:Entity' }
                                    }
                                }
                            }
                        },
                        then: { $ref: '#/schema/jsonld/Entity' }
                    },
                    {
                        if: {
                            type: 'object',
                            properties: {
                                'pig:itemType': {
                                    type: 'object',
                                    properties: {
                                        '@id': { const: 'pig:Relationship' }
                                    }
                                }
                            }
                        },
                        then: { $ref: '#/schema/jsonld/Relationship' }
                    }
                ]
            }
        }
    },
    required: ['@id', '@context', '@graph'],
    additionalProperties: false,
    $defs: JSONLD_DEFS
};

// Register all schemata before compilation:
ajv.addSchema(PROPERTY_LD_SCHEMA);
ajv.addSchema(LINK_LD_SCHEMA);
ajv.addSchema(ENTITY_LD_SCHEMA);
ajv.addSchema(RELATIONSHIP_LD_SCHEMA);
ajv.addSchema(ANENTITY_LD_SCHEMA);
ajv.addSchema(ARELATIONSHIP_LD_SCHEMA);

// Compile all schemata
const validatePropertyLD = ajv.compile(PROPERTY_LD_SCHEMA);
const validateLinkLD = ajv.compile(LINK_LD_SCHEMA);
const validateEntityLD = ajv.compile(ENTITY_LD_SCHEMA);
const validateRelationshipLD = ajv.compile(RELATIONSHIP_LD_SCHEMA);
const validateAnEntityLD = ajv.compile(ANENTITY_LD_SCHEMA);
const validateARelationshipLD = ajv.compile(ARELATIONSHIP_LD_SCHEMA);
const validatePackageLD = ajv.compile(APACKAGE_LD_SCHEMA);

export const SCH_LD = {
    PROPERTY_LD_SCHEMA,
    validatePropertyLD,
    getValidatePropertyLDErrors() {
        return ajv.errorsText(validatePropertyLD.errors, { separator: '; ' });
    },
    LINK_LD_SCHEMA,
    validateLinkLD,
    getValidateLinkLDErrors() {
        return ajv.errorsText(validateLinkLD.errors, { separator: '; ' });
    },
    ENTITY_LD_SCHEMA,
    validateEntityLD,
    getValidateEntityLDErrors() {
        return ajv.errorsText(validateEntityLD.errors, { separator: '; ' });
    },
    RELATIONSHIP_LD_SCHEMA,
    validateRelationshipLD,
    getValidateRelationshipLDErrors() {
        return ajv.errorsText(validateRelationshipLD.errors, { separator: '; ' });
    },
    ANENTITY_LD_SCHEMA,
    validateAnEntityLD,
    getValidateAnEntityLDErrors() {
        return ajv.errorsText(validateAnEntityLD.errors, { separator: '; ' });
    },
    ARELATIONSHIP_LD_SCHEMA,
    validateARelationshipLD,
    getValidateARelationshipLDErrors() {
        return ajv.errorsText(validateARelationshipLD.errors, { separator: '; ' });
    },
    APACKAGE_LD_SCHEMA,
    validatePackageLD,
    getValidatePackageLDErrors() {
        return ajv.errorsText(validatePackageLD.errors, { separator: '; ' });
    }
};
