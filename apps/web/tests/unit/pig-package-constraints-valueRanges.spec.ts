/*!
 * Test suite for PIG package constraints - Value Range Validation
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Limitations:
 * - Some of the following tests feed the consistency checks directly with a JSON data structure
 *   similar from aPackage.get(). Some properties irrelevant in this context are however missing.
 *   So it is possible that some of the items would not pass the schema check! 
 */

import { DEF } from '../../src/common/lib/definitions';
import { describe, it, expect } from '@jest/globals';
import { PigItemType, APackage } from '../../src/common/schema/pig/ts/pig-metaclasses';
import { checkConstraintsForPackage, ConstraintCheckType } from '../../src/common/schema/pig/ts/pig-package-constraints';

describe('PIG Package Constraints - Value Range Validation', () => {

    // ========== String Validation Tests ==========

    describe('String maxLength validation', () => {
        it('should accept string within maxLength', () => {
            const pkg = {
                'id': 'd:test-string-valid',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'o:propName',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'maxLength': 50
                    },
                    {
                        'id': 'o:component',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'd:component-1',
                        'hasClass': 'o:component',
                        'itemType': PigItemType.anEntity,
                        'hasProperty': [
                            {
                                'hasClass': 'o:propName',
                                'value': 'Valid Name'
                            }
                        ]
                    }
                ],
                modified: "2026-02-16T12:00:00Z"
            } as unknown as APackage;

            // Test just the constaints:
            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject string exceeding maxLength', () => {
            const pkg = {
                'id': 'd:test-string-too-long',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:name',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'maxLength': 10
                    },
                    {
                        'id': 'ent:component',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:component-1',
                        'hasClass': 'ent:component',
                        'itemType': PigItemType.anEntity,
                        'hasProperty': [
                            {
                                'hasClass': 'prop:name',
                                'value': 'This is a very long name that exceeds the limit'
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('string length');
            expect(result.statusText).toContain('exceeds maxLength');
        });

        it('should accept language-tagged string within maxLength', () => {
            const pkg = {
                'id': 'd:test-mlstring-valid',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:description',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'maxLength': 100
                    },
                    {
                        'id': 'ent:component',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:component-1',
                        'hasClass': 'ent:component',
                        'itemType': PigItemType.anEntity,
                        'hasProperty': [
                            {
                                'hasClass': 'prop:description',
                                'value': {
                                    'text': 'A valid description',
                                    'lang': 'en'
                                }
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });
    });

    describe('String pattern validation', () => {
        it('should accept string matching pattern', () => {
            const pkg = {
                'id': 'd:test-pattern-valid',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:email',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'pattern': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                    },
                    {
                        'id': 'ent:person',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:person-1',
                        'hasClass': 'ent:person',
                        'itemType': PigItemType.anEntity,
                        'hasProperty': [
                            {
                                'hasClass': 'prop:email',
                                'value': 'test@example.com'
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject string not matching pattern', () => {
            const pkg = {
                'id': 'd:test-pattern-invalid',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:email',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'pattern': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                    },
                    {
                        'id': 'ent:person',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:person-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:person',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:email',
                                'value': 'invalid-email'
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('does not match pattern');
        });

        it('should handle both maxLength and pattern constraints', () => {
            const pkg = {
                'id': 'd:test-pattern-and-length',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:code',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'maxLength': 10,
                        'pattern': '^[A-Z0-9]+$'
                    },
                    {
                        'id': 'ent:product',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:product-1',
                        'hasClass': 'ent:product',
                        'itemType': PigItemType.anEntity,
                        'hasProperty': [
                            {
                                'hasClass': 'prop:code',
                                'value': 'ABC123'
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });
    });

    // ========== Integer Validation Tests ==========

    describe('Integer range validation', () => {
        it('should accept integer within range', () => {
            const pkg = {
                'id': 'd:test-int-valid',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:count',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:inventory',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:count',
                                'value': 50
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });

        it('should accept integer at minInclusive boundary', () => {
            const pkg = {
                'id': 'd:test-int-min-boundary',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:count',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:inventory',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:count',
                                'value': 0
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject integer below minInclusive', () => {
            const pkg = {
                'id': 'd:test-int-too-small',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:count',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:inventory',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:count',
                                'value': -10
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('less than minInclusive');
        });

        it('should reject integer above maxInclusive', () => {
            const pkg = {
                'id': 'd:test-int-too-large',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:count',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:inventory',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:count',
                                'value': 150
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('exceeds maxInclusive');
        });

        it('should reject non-numeric value for integer property', () => {
            const pkg = {
                'id': 'd:test-int-invalid-value',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:count',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:inventory',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:count',
                                'value': 'not-a-number'
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('not a valid number');
        });
    });

    // ========== Double Validation Tests ==========

    describe('Double range validation', () => {
        it('should accept double within range', () => {
            const pkg = {
                'id': 'd:test-double-valid',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:temperature',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:double',
                        'minInclusive': -273.15,
                        'maxInclusive': 1000.0
                    },
                    {
                        'id': 'ent:sensor',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:sensor-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:sensor',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:temperature',
                                'value': 23.5
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject double below minInclusive', () => {
            const pkg = {
                'id': 'd:test-double-too-small',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:temperature',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:double',
                        'minInclusive': -273.15,
                        'maxInclusive': 1000.0
                    },
                    {
                        'id': 'ent:sensor',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:sensor-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:sensor',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:temperature',
                                'value': -300.0
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('less than minInclusive');
        });

        it('should reject double above maxInclusive', () => {
            const pkg = {
                'id': 'd:test-double-too-large',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:temperature',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:double',
                        'minInclusive': -273.15,
                        'maxInclusive': 1000.0
                    },
                    {
                        'id': 'ent:sensor',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:sensor-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:sensor',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:temperature',
                                'value': 1500.0
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('exceeds maxInclusive');
        });

        it('should accept double with high precision', () => {
            const pkg = {
                'id': 'd:test-double-precision',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:ratio',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:double',
                        'minInclusive': 0.0,
                        'maxInclusive': 1.0
                    },
                    {
                        'id': 'ent:measurement',
                        'hasClass': 'owl:Class',
                        'itemType': PigItemType.Entity
                    },
                    {
                        'id': 'inst:measurement-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:measurement',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:ratio',
                                'value': 0.123456789
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });
    });

    // ========== Edge Cases ==========

    describe('Edge cases and mixed scenarios', () => {
        it('should validate multiple properties with different datatypes', () => {
            const pkg = {
                'id': 'd:test-multiple-properties',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:name',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:string',
                        'maxLength': 50
                    },
                    {
                        'id': 'prop:count',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'prop:ratio',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:double',
                        'minInclusive': 0.0,
                        'maxInclusive': 1.0
                    },
                    {
                        'id': 'ent:product',
                        'hasClass': 'owl:Class',
                    },
                    {
                        'id': 'inst:product-1',
                        'itemType': PigItemType.anEntity,
                        'hasClass': 'ent:product',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:name',
                                'value': 'Valid Product'
                            },
                            {
                                'hasClass': 'prop:count',
                                'value': 50
                            },
                            {
                                'hasClass': 'prop:ratio',
                                'value': 0.75
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });

        it('should validate aRelationship properties', () => {
            const pkg = {
                'id': 'd:test-relationship-properties',
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                'graph': [
                    {
                        'id': 'prop:weight',
                        'hasClass': 'owl:DatatypeProperty',
                        'itemType': PigItemType.Property,
                        'datatype': 'xs:double',
                        'minInclusive': 0.0,
                        'maxInclusive': 1.0
                    },
                    {
                        'id': 'rel:dependency',
                        'itemType': PigItemType.Relationship
                        // some mandatory properties are omitted (no schema test applied)
                    },
                    {
                        'id': 'inst:dependency-1',
                        'itemType': PigItemType.aRelationship,
                        'hasClass': 'rel:dependency',
                        'hasProperty': [
                            {
                                'hasClass': 'prop:weight',
                                'value': "0.8"
                            }
                        ]
                    }
                ]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            expect(result.ok).toBe(true);
        });
    });

    // ========== Enumeration Validation Tests ==========

    describe('Enumeration value validation', () => {
        function getStringEnumPackage(testVal: string): APackage {
            return {
                "id": "d:test-enum-string-valid",
                'hasClass': PigItemType.Package,
                'itemType': PigItemType.aPackage,
                "modified": "2026-02-16T12:00:00Z",
                "context": [
                    {
                        "tag": "o",
                        "uri": "https://product-information-graph.org/v0.2/ontology#"
                    }, {
                        "tag": "d",
                        "uri": "https://product-information-graph.org/examples/09_Very-Simple-Model-FMC-with-Requirements.specif.zip#"
                    }, {
                        "tag": "cas",
                        "uri": "https://product-information-graph.org/v0.2/metamodel#"
                    }, {
                        "tag": "IREB",
                        "uri": "https://cpre.ireb.org/en/downloads-and-resources/glossary#"
                    }
                ],
                "graph": [{
                    "id": `${DEF.pfxNsSemi}Priority-Values`,
                    "hasClass": 'owl:Class',
                    "itemType": PigItemType.Enumeration,
                    "specializes": PigItemType.Enumeration,
                    "title": [
                        {
                            "value": "Priority",
                            "lang": "en"
                        },
                        {
                            "value": "Priorität",
                            "lang": "de"
                        }
                    ],
                    "description": [
                        {
                            "value": "Enumerated values for the 'Priority' of the resource.",
                            "lang": "en"
                        }
                    ],
                    "datatype": "xs:string",
                    "enumeratedValue": [
                        {
                            "id": "IREB:priorityHigh",
                            "title": [
                                {
                                    "value": "high",
                                    "lang": "en"
                                },
                                {
                                    "value": "hoch",
                                    "lang": "de"
                                }
                            ]
                        },
                        {
                            "id": "IREB:priorityMedium",
                            "title": [
                                {
                                    "value": "medium",
                                    "lang": "en"
                                },
                                {
                                    "value": "mittel",
                                    "lang": "de"
                                }
                            ]
                        },
                        {
                            "id": "IREB:priorityLow",
                            "title": [
                                {
                                    "value": "low",
                                    "lang": "en"
                                },
                                {
                                    "value": "niedrig",
                                    "lang": "de"
                                }
                            ]
                        }
                    ]
                }, {
                    "id": `${DEF.pfxNsSemi}hasPriority`,
                    "itemType": PigItemType.Link,
                    "hasClass": "owl:ObjectProperty",
                    "specializes": `${DEF.pfxNsSemi}TargetLink`,
                    "modified": "2020-10-17T10:00:00+01:00",
                    "title": [
                        {
                            "value": "Priority"
                        }
                    ],
                    "enumeratedEndpoint": [
                        `${DEF.pfxNsSemi}Priority-Values`
                    ]
                }, {
                    "id": "d:Req-1a8016e2872e78ecadc50feddc00029b",
                    "itemType": PigItemType.anEntity,
                    "hasClass": "IREB:Requirement",
                    "modified": "2020-10-17T10:00:00+01:00",
                    "title": [
                        {
                            "value": "Data Volume"
                        }
                    ],
                    "description": [
                        {
                            "value": "<p>The data store MUST support a total volume up to 850 GB.</p>"
                        }
                    ],
                    "hasTargetLink": [
                        {
                            "idRef": testVal,
                            "hasClass": `${DEF.pfxNsSemi}hasPriority`,
                            "itemType": PigItemType.aTargetLink
                        }
                    ]
                }]
            } as unknown as APackage;
        }

        it('should accept string value from enumeratedValue list', () => {
            const pkg = getStringEnumPackage("IREB:priorityHigh");

            // A. Test the constraints directly:
            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });
            if (!result.ok) {
                console.error(`Package ${pkg.id}:`, result.statusText ?? result.status);
            }
            expect(result.status).toBe(0);

            // B. Test the constraints including setting and getting:
            const rsp = new APackage().set(pkg, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });
            const st = rsp.status();
            if (!st.ok) {
                console.error(`Package ${pkg.id}:`, st.statusText ?? st.status);
            }
            expect(st.ok).toBe(true);

            const pkgOut = rsp.get();

            // console.debug('#1',pkgOut);

            // Verify complete package structure
            expect(pkgOut).toBeDefined();
            expect(pkgOut.id).toBe('d:test-enum-string-valid');
            expect(pkgOut.itemType).toBe(PigItemType.aPackage);
            expect(pkgOut.modified).toBe('2026-02-16T12:00:00Z');

            // Verify context preservation
            expect(pkgOut.context).toBeDefined();
            expect(Array.isArray(pkgOut.context)).toBe(true);
            expect((pkgOut.context as any[]).length).toBe(4);

            // Verify graph structure
            expect(pkgOut.graph).toBeDefined();
            expect(Array.isArray(pkgOut.graph)).toBe(true);
            expect(pkgOut.graph.length).toBe(3);

            // Verify Property definition (first graph item)
            const propertyDef = pkgOut.graph[0] as any;
            expect(propertyDef.id).toBe(`${DEF.pfxNsSemi}Priority-Values`);
            expect(propertyDef.itemType).toBe(PigItemType.Enumeration);
            expect(propertyDef.datatype).toBe('xs:string');
            expect(propertyDef.specializes).toBe(PigItemType.Enumeration);

            // Verify enumeratedValue array
            expect(propertyDef.enumeratedValue).toBeDefined();
            expect(Array.isArray(propertyDef.enumeratedValue)).toBe(true);
            expect(propertyDef.enumeratedValue.length).toBe(3);
            expect(propertyDef.enumeratedValue[0].id).toBe('IREB:priorityHigh');
            expect(propertyDef.enumeratedValue[1].id).toBe('IREB:priorityMedium');
            expect(propertyDef.enumeratedValue[2].id).toBe('IREB:priorityLow');

            // Verify multi-language titles in enumeratedValue
            expect(propertyDef.enumeratedValue[0].title[0].value).toBe('high');
            expect(propertyDef.enumeratedValue[0].title[0].lang).toBe('en');
            expect(propertyDef.enumeratedValue[0].title[1].value).toBe('hoch');
            expect(propertyDef.enumeratedValue[0].title[1].lang).toBe('de');

            // Verify anEntity instance (third graph item)
            const anEntity = pkgOut.graph[2] as any;
            expect(anEntity.id).toBe('d:Req-1a8016e2872e78ecadc50feddc00029b');
            expect(anEntity.itemType).toBe(PigItemType.anEntity);
            expect(anEntity.hasClass).toBe('IREB:Requirement');
            expect(anEntity.modified).toBe('2020-10-17T10:00:00+01:00');

            // Verify anEntity title and description
            expect(anEntity.title).toBeDefined();
            expect(Array.isArray(anEntity.title)).toBe(true);
            expect(anEntity.title[0].value).toBe('Data Volume');
            expect(anEntity.description[0].value).toContain('850 GB');

            // Verify property instance with enumeration reference
            expect(anEntity.hasProperty).toBeUndefined();
            expect(anEntity.hasTargetLink).toBeDefined();
            expect(Array.isArray(anEntity.hasTargetLink)).toBe(true);
            expect(anEntity.hasTargetLink.length).toBe(1);

            const aLink = anEntity.hasTargetLink[0];
            expect(aLink.itemType).toBe(PigItemType.aTargetLink);
            expect(aLink.hasClass).toBe(`${DEF.pfxNsSemi}hasPriority`);
            expect(aLink.idRef).toBe('IREB:priorityHigh');
            expect(aLink.value).toBeUndefined(); // enumeration uses idRef, not value
        });

        it('should reject string value not in enumeratedValue list', () => {
            const pkg = getStringEnumPackage("IREB:unknown");

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            // console.info(result);
            expect(result.ok).toBe(false);
            expect(result.status).toBe(677);
            expect(result.statusText).toContain("has no enumerated value 'IREB:unknown'");
        });

        function getNumberEnumPackage(testVal: string) {
            return {
                "@context": {
                    "cas": "https://product-information-graph.org/v0.2/metamodel#",
                    "o": "https://product-information-graph.org/v0.2/ontology#",
                    "d": "https://product-information-graph.org/examples/fibonacci.zip#",
                    "dcterms": "http://purl.org/dc/terms/",
                    "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
                },
                "@id": "d:test-enum-numeric-jsonld",
                "@type": PigItemType.Package,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': PigItemType.aPackage },
                [`${DEF.pfxNsDcmi}modified`]: "2026-02-16T12:00:00Z",
                "@graph": [
                    {
                        "@id": "o:Fibonacci-Values",
                        "@type": "owl:Class",
                        [`${DEF.pfxNsMeta}itemType`]: { "@id": PigItemType.Enumeration },
                        [`${DEF.pfxNsMeta}specializes`]: { "@id": PigItemType.Enumeration },
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Fibonacci Numbers",
                                "@language": "en"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "Enumerated Fibonacci sequence values for estimation",
                                "@language": "en"
                            }
                        ],
                        "sh:datatype": "xs:integer",
                        [`${DEF.pfxNsMeta}enumeratedValue`]: [
                            {
                                "@id": "o:Fibonacci-1",
                                "@value": "1"
                            },
                            {
                                "@id": "o:Fibonacci-2",
                                "@value": "2"
                            },
                            {
                                "@id": "o:Fibonacci-3",
                                "@value": "3"
                            },
                            {
                                "@id": "o:Fibonacci-5",
                                "@value": "5"
                            },
                            {
                                "@id": "o:Fibonacci-8",
                                "@value": "8"
                            },
                            {
                                "@id": "o:Fibonacci-13",
                                "@value": "13"
                            }
                        ]
                    },
                    {
                        "@id": "o:hasEstimate",
                        "@type": "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: {
                            "@id": `${DEF.pfxNsSemi}TargetLink`
                        },
                        [`${DEF.pfxNsMeta}itemType`]: {
                            "@id": `${DEF.pfxNsMeta}Link`
                        },
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            {
                                "@id": "o:Fibonacci-Values"
                            }
                        ],
                        "dcterms:title": [
                            {
                                "@value": "Estimate"
                            }
                        ],
                        "skos:definition": [
                            {
                                "@value": "Assigns a Fibonacci number to an entity."
                            }
                        ]
                    },
                    {
                        "@id": "d:Task-4711",
                        "@type": "o:Estimate",
                        [`${DEF.pfxNsMeta}itemType`]: { "@id": `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsDcmi}modified`]: "2026-01-15T14:30:00Z",
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Implement User Authentication",
                                "@language": "en"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "<p>Task requires implementation of OAuth2 authentication</p>",
                                "@language": "en"
                            }
                        ],
                        [`o:hasEstimate`]: [
                            {
                                "@id": testVal,
                                [`${DEF.pfxNsMeta}itemType`]: {
                                    "@id": `${DEF.pfxNsMeta}aTargetLink`
                                }
                            }
                        ]
                    }
                ]
            };
        }
        it('should accept numeric value from enumeratedValue list with JSON-LD input', () => {
            const pkgJsonLD = getNumberEnumPackage("o:Fibonacci-8");

            // A. Test with JSON-LD input via setJSONLD
            // console.debug('pkgJsonLD:', pkgJsonLD);
            const rsp = new APackage().setJSONLD(pkgJsonLD, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            const st = rsp.status();
            if (!st.ok) {
                console.error(`Package ${pkgJsonLD['@id']}:`, st.statusText ?? st.status);
            }
            expect(st.ok).toBe(true);

            const pkgOut = rsp.get();

            // Verify package structure
            expect(pkgOut).toBeDefined();
            expect(pkgOut.id).toBe('d:test-enum-numeric-jsonld');
            expect(pkgOut.itemType).toBe(`${DEF.pfxNsMeta}aPackage`);
            expect(pkgOut.modified).toBe('2026-02-16T12:00:00Z');

            // Verify graph items
            expect(pkgOut.graph).toBeDefined();
            expect(pkgOut.graph.length).toBe(3);

            // Verify Fibonacci Property definition
            const en = pkgOut.graph[0] as any;
            expect(en.id).toBe('o:Fibonacci-Values');
            expect(en.itemType).toBe(`${DEF.pfxNsMeta}Enumeration`);
            expect(en.datatype).toBe('xs:integer');
            expect(en.specializes).toBe(`${DEF.pfxNsMeta}Enumeration`);

            // Verify enumeratedValue array
            expect(en.enumeratedValue).toBeDefined();
            expect(Array.isArray(en.enumeratedValue)).toBe(true);
            expect(en.enumeratedValue.length).toBe(6);
            expect(en.enumeratedValue[0].id).toBe('o:Fibonacci-1');
            expect(en.enumeratedValue[0].value).toBe('1');
            expect(en.enumeratedValue[4].id).toBe('o:Fibonacci-8');
            expect(en.enumeratedValue[4].value).toBe('8');
            expect(en.enumeratedValue[5].id).toBe('o:Fibonacci-13');
            expect(en.enumeratedValue[5].value).toBe('13');

            // Verify anEntity instance
            const taskInstance = pkgOut.graph[2] as any;
            expect(taskInstance.id).toBe('d:Task-4711');
            expect(taskInstance.itemType).toBe(`${DEF.pfxNsMeta}anEntity`);
            expect(taskInstance.hasClass).toBe('o:Estimate');
            expect(taskInstance.title[0].value).toBe('Implement User Authentication');
            expect(taskInstance.description[0].value).toContain('OAuth2');

            // Verify property instance with numeric enumeration reference
            expect(taskInstance.hasTargetLink).toBeDefined();
            expect(Array.isArray(taskInstance.hasTargetLink)).toBe(true);
            expect(taskInstance.hasTargetLink.length).toBe(1);

            const taskLink = taskInstance.hasTargetLink[0];
            expect(taskLink.itemType).toBe(`${DEF.pfxNsMeta}aTargetLink`);
            expect(taskLink.hasClass).toBe(`o:hasEstimate`);
            expect(taskLink.idRef).toBe('o:Fibonacci-8'); // Reference to Fibonacci value
            expect(taskLink.value).toBeUndefined(); // Enumeration uses idRef, not value

            // B. Verify constraint validation directly
            const directResult = checkConstraintsForPackage(pkgOut, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });
            expect(directResult.ok).toBe(true);
        });

        it('should reject numeric value not in enumeratedValue list', () => {
            const pkgJsonLD = getNumberEnumPackage("o:Fibonacci-4");

            const rsp = new APackage().setJSONLD(pkgJsonLD, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            const st = rsp.status();
            // console.info(`Package ${pkgJsonLD['@id']}:`, st.statusText ?? st.status);
            expect(st.ok).toBe(false);
            expect(st.status).toBe(611);
            expect(st.statusText).toContain("has no enumerated value 'o:Fibonacci-4'");
        });

        it('should accept numeric value from enumeratedValue list with XML input', () => {
            const pkgXML = `<?xml version="1.0" encoding="UTF-8"?>
            <${DEF.pfxNsMeta}aPackage xmlns:pig="https://product-information-graph.org/v0.2/metamodel#"
                          xmlns:o="https://product-information-graph.org/v0.2/ontology#"
                          xmlns:d="https://product-information-graph.org/examples/fibonacci.zip#"
                          xmlns:dcterms="http://purl.org/dc/terms/"
                          id="d:test-enum-numeric-xml">
                <${DEF.pfxNsMeta}hasClass>${DEF.pfxNsMeta}Package</${DEF.pfxNsMeta}hasClass>
                <${DEF.pfxNsMeta}itemType>${DEF.pfxNsMeta}aPackage</${DEF.pfxNsMeta}itemType>
                <${DEF.pfxNsDcmi}modified>2026-02-16T12:00:00Z</${DEF.pfxNsDcmi}modified>
                <${DEF.pfxNsDcmi}title xml:lang="en">Fibonacci Estimation Example</${DEF.pfxNsDcmi}title>
                <graph>
                    <${DEF.pfxNsMeta}Enumeration id="o:Fibonacci-Values" ${DEF.pfxNsMeta}specializes="${DEF.pfxNsMeta}Enumeration">
                        <${DEF.pfxNsDcmi}title xml:lang="en">Fibonacci Numbers</${DEF.pfxNsDcmi}title>
                        <skos:definition xml:lang="en">Enumerated Fibonacci sequence values for estimation</skos:definition>
                        <${DEF.pfxNsMeta}hasClass>owl:Class</${DEF.pfxNsMeta}hasClass>
                        <${DEF.pfxNsMeta}itemType>${DEF.pfxNsMeta}Enumeration</${DEF.pfxNsMeta}itemType>
                        <datatype>xs:integer</datatype>
                        <enumeratedValue id="o:Fibonacci-1">
                            <value>1</value>
                        </enumeratedValue>
                        <enumeratedValue id="o:Fibonacci-2">
                            <value>2</value>
                        </enumeratedValue>
                        <enumeratedValue id="o:Fibonacci-3">
                            <value>3</value>
                        </enumeratedValue>
                        <enumeratedValue id="o:Fibonacci-5">
                            <value>5</value>
                        </enumeratedValue>
                        <enumeratedValue id="o:Fibonacci-8">
                            <value>8</value>
                        </enumeratedValue>
                        <enumeratedValue id="o:Fibonacci-13">
                            <value>13</value>
                        </enumeratedValue>
                    </${DEF.pfxNsMeta}Enumeration>

                    <${DEF.pfxNsMeta}Link id="o:hasEstimate" ${DEF.pfxNsMeta}hasClass="owl:ObjectProperty">
                        <${DEF.pfxNsDcmi}title xml:lang="en">Estimate</${DEF.pfxNsDcmi}title>
                        <skos:definition xml:lang="en">Assigns a Fibonacci number to an entity.</skos:definition>
                        <!-- <${DEF.pfxNsMeta}enumeratedEndpoint rdf:resource="o:Fibonacci-Values" /> -->
                        <${DEF.pfxNsMeta}enumeratedEndpoint>o:Fibonacci-Values</${DEF.pfxNsMeta}enumeratedEndpoint>
                    </${DEF.pfxNsMeta}Link>
        
                    <${DEF.pfxNsMeta}anEntity id="d:Est-Task-4711" rdf:type="o:Estimate">
                        <${DEF.pfxNsMeta}hasClass>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}hasClass>
                        <${DEF.pfxNsMeta}itemType>${DEF.pfxNsMeta}anEntity</${DEF.pfxNsMeta}itemType>
                        <${DEF.pfxNsDcmi}modified>2026-01-15T14:30:00Z</${DEF.pfxNsDcmi}modified>
                        <${DEF.pfxNsDcmi}title xml:lang="en">Implement User Authentication</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}description xml:lang="en"><![CDATA[<p>Task requires implementation of OAuth2 authentication</p>]]></${DEF.pfxNsDcmi}description>
                        <${DEF.pfxNsMeta}aTargetLink rdf:type="o:hasEstimate">
                            <idRef>o:Fibonacci-8</idRef>
                        </${DEF.pfxNsMeta}aTargetLink>
                    </${DEF.pfxNsMeta}anEntity>
                </graph>
            </${DEF.pfxNsMeta}aPackage>`;

            // A. Test with XML input via setXML
            const rsp = new APackage().setXML(pkgXML, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });

            const st = rsp.status();
            if (!st.ok) {
                console.error(`Package d:test-enum-numeric-xml:`, st.statusText ?? st.status);
            }
            expect(st.ok).toBe(true);

            const pkgOut = rsp.get();

            // Verify package structure
            expect(pkgOut).toBeDefined();
            expect(pkgOut.id).toBe('d:test-enum-numeric-xml');
            expect(pkgOut.itemType).toBe(PigItemType.aPackage);
            expect(pkgOut.hasClass).toBe(PigItemType.Package);
            expect(pkgOut.modified).toBe('2026-02-16T12:00:00Z');

            // Verify package title
            expect(pkgOut.title).toBeDefined();
            expect(Array.isArray(pkgOut.title)).toBe(true);

            // Jest continues only if 'title' is defined (as checked above),
            // but the ts compiler doesn't know that, so we use an if clause to avoid an error:
            if (pkgOut.title) {
                expect(pkgOut.title.length).toBe(1);
                expect(pkgOut.title[0].value).toBe('Fibonacci Estimation Example');
                expect(pkgOut.title[0].lang).toBe('en');
            }

            // Verify graph items
            expect(pkgOut.graph).toBeDefined();
            expect(Array.isArray(pkgOut.graph)).toBe(true);
            expect(pkgOut.graph.length).toBe(3);

            // Verify Fibonacci Enumeration definition
            const en = pkgOut.graph[0] as any;
            expect(en.id).toBe('o:Fibonacci-Values');
            expect(en.itemType).toBe(PigItemType.Enumeration);
            expect(en.hasClass).toBe('owl:Class');
            expect(en.datatype).toBe('xs:integer');
            expect(en.specializes).toBe(PigItemType.Enumeration);

            // Verify Property title and description
            expect(en.title[0].value).toBe('Fibonacci Numbers');
            expect(en.title[0].lang).toBe('en');
            expect(en.definition[0].value).toBe('Enumerated Fibonacci sequence values for estimation');

            // Verify enumeratedValue array with numeric values
            expect(en.enumeratedValue).toBeDefined();
            expect(Array.isArray(en.enumeratedValue)).toBe(true);
            expect(en.enumeratedValue.length).toBe(6);

            // Check enumerated values
            expect(en.enumeratedValue[0].id).toBe('o:Fibonacci-1');
            expect(en.enumeratedValue[0].value).toBe('1');
            expect(en.enumeratedValue[0].title).toBeUndefined(); // Numeric enums have value, not title
            expect(en.enumeratedValue[3].id).toBe('o:Fibonacci-5');
            expect(en.enumeratedValue[3].value).toBe('5');
            expect(en.enumeratedValue[5].id).toBe('o:Fibonacci-13');
            expect(en.enumeratedValue[5].value).toBe('13');

            // Verify anEntity instance
            const taskInstance = pkgOut.graph[2] as any;
            expect(taskInstance.id).toBe('d:Est-Task-4711');
            expect(taskInstance.itemType).toBe(PigItemType.anEntity);
            expect(taskInstance.hasClass).toBe(PigItemType.Entity);
            expect(taskInstance.modified).toBe('2026-01-15T14:30:00Z');

            // Verify task title and description
            expect(taskInstance.title[0].value).toBe('Implement User Authentication');
            expect(taskInstance.title[0].lang).toBe('en');
            expect(taskInstance.description[0].value).toContain('OAuth2 authentication');

            // Verify target link instance with numeric enumeration reference
            expect(taskInstance.hasTargetLink).toBeDefined();
            expect(Array.isArray(taskInstance.hasTargetLink)).toBe(true);
            expect(taskInstance.hasTargetLink.length).toBe(1);

            const taskLink = taskInstance.hasTargetLink[0];
            expect(taskLink.itemType).toBe(PigItemType.aTargetLink);
            expect(taskLink.hasClass).toBe(`o:hasEstimate`);
            expect(taskLink.idRef).toBe('o:Fibonacci-8'); // Reference to Fibonacci value
            expect(taskLink.value).toBeUndefined(); // Enumeration uses idRef, not value
            // Verify constraint validation directly
            const directResult = checkConstraintsForPackage(pkgOut, {
                checkConstraints: [ConstraintCheckType.aLinkHasClass, ConstraintCheckType.ValueRanges, ConstraintCheckType.enumeratedValues]
            });
            expect(directResult.ok).toBe(true);
        });
    });
});
