/*!
 * Test suite for PIG package constraints - Value Range Validation
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Limitations:
 * - The following tests feed the consistency checks directly with a JSON data structure
 *   similar from aPackage.get(). Some properties irrelevant in this context are however missing.
 */

import { describe, it, expect } from '@jest/globals';
import { APackage } from '../../src/utils/schemas/pig/ts/pig-metaclasses';
import { checkConstraintsForPackage, ConstraintCheckType } from '../../src/utils/schemas/pig/ts/pig-package-constraints';

describe('PIG Package Constraints - Value Range Validation', () => {

    // ========== String Validation Tests ==========

    describe('String maxLength validation', () => {
        it('should accept string within maxLength', () => {
            const pkg = {
                'id': 'd:test-string-valid',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'o:propName',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'maxLength': 50
                    },
                    {
                        'id': 'o:component',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'd:component-1',
                        'itemType': 'pig:anEntity',
                        'hasClass': 'o:component',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject string exceeding maxLength', () => {
            const pkg = {
                'id': 'd:test-string-too-long',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:name',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'maxLength': 10
                    },
                    {
                        'id': 'ent:component',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:component-1',
                        'itemType': 'pig:anEntity',
                        'hasClass': 'ent:component',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('string length');
            expect(result.statusText).toContain('exceeds maxLength');
        });

        it('should accept language-tagged string within maxLength', () => {
            const pkg = {
                'id': 'd:test-mlstring-valid',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:description',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'maxLength': 100
                    },
                    {
                        'id': 'ent:component',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:component-1',
                        'itemType': 'pig:anEntity',
                        'hasClass': 'ent:component',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });
    });

    describe('String pattern validation', () => {
        it('should accept string matching pattern', () => {
            const pkg = {
                'id': 'd:test-pattern-valid',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:email',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'pattern': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                    },
                    {
                        'id': 'ent:person',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:person-1',
                        'itemType': 'pig:anEntity',
                        'hasClass': 'ent:person',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject string not matching pattern', () => {
            const pkg = {
                'id': 'd:test-pattern-invalid',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:email',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'pattern': '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
                    },
                    {
                        'id': 'ent:person',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:person-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('does not match pattern');
        });

        it('should handle both maxLength and pattern constraints', () => {
            const pkg = {
                'id': 'd:test-pattern-and-length',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:code',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'maxLength': 10,
                        'pattern': '^[A-Z0-9]+$'
                    },
                    {
                        'id': 'ent:product',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:product-1',
                        'itemType': 'pig:anEntity',
                        'hasClass': 'ent:product',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });
    });

    // ========== Integer Validation Tests ==========

    describe('Integer range validation', () => {
        it('should accept integer within range', () => {
            const pkg = {
                'id': 'd:test-int-valid',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:count',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });

        it('should accept integer at minInclusive boundary', () => {
            const pkg = {
                'id': 'd:test-int-min-boundary',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:count',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject integer below minInclusive', () => {
            const pkg = {
                'id': 'd:test-int-too-small',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:count',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('less than minInclusive');
        });

        it('should reject integer above maxInclusive', () => {
            const pkg = {
                'id': 'd:test-int-too-large',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:count',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('exceeds maxInclusive');
        });

        it('should reject non-numeric value for integer property', () => {
            const pkg = {
                'id': 'd:test-int-invalid-value',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:count',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'ent:inventory',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:inventory-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
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
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:temperature',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:double',
                        'minInclusive': -273.15,
                        'maxInclusive': 1000.0
                    },
                    {
                        'id': 'ent:sensor',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:sensor-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });

        it('should reject double below minInclusive', () => {
            const pkg = {
                'id': 'd:test-double-too-small',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:temperature',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:double',
                        'minInclusive': -273.15,
                        'maxInclusive': 1000.0
                    },
                    {
                        'id': 'ent:sensor',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:sensor-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('less than minInclusive');
        });

        it('should reject double above maxInclusive', () => {
            const pkg = {
                'id': 'd:test-double-too-large',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:temperature',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:double',
                        'minInclusive': -273.15,
                        'maxInclusive': 1000.0
                    },
                    {
                        'id': 'ent:sensor',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:sensor-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('exceeds maxInclusive');
        });

        it('should accept double with high precision', () => {
            const pkg = {
                'id': 'd:test-double-precision',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:ratio',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:double',
                        'minInclusive': 0.0,
                        'maxInclusive': 1.0
                    },
                    {
                        'id': 'ent:measurement',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:measurement-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });
    });

    // ========== Edge Cases ==========

    describe('Edge cases and mixed scenarios', () => {
        it('should validate multiple properties with different datatypes', () => {
            const pkg = {
                'id': 'd:test-multiple-properties',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:name',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:string',
                        'maxLength': 50
                    },
                    {
                        'id': 'prop:count',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:integer',
                        'minInclusive': 0,
                        'maxInclusive': 100
                    },
                    {
                        'id': 'prop:ratio',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:double',
                        'minInclusive': 0.0,
                        'maxInclusive': 1.0
                    },
                    {
                        'id': 'ent:product',
                        'itemType': 'pig:Entity'
                    },
                    {
                        'id': 'inst:product-1',
                        'itemType': 'pig:anEntity',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });

        it('should validate aRelationship properties', () => {
            const pkg = {
                'id': 'd:test-relationship-properties',
                'itemType': 'pig:Package',
                'graph': [
                    {
                        'id': 'prop:weight',
                        'itemType': 'pig:Property',
                        'datatype': 'xs:double',
                        'minInclusive': 0.0,
                        'maxInclusive': 1.0
                    },
                    {
                        'id': 'rel:dependency',
                        'itemType': 'pig:Relationship'
                        // some mandatory properties are omitted (no schema test applied)
                    },
                    {
                        'id': 'inst:dependency-1',
                        'itemType': 'pig:aRelationship',
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
                checkConstraints: [ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(true);
        });
    });

    // ========== Enumeration Validation Tests ==========

    describe('Enumeration value validation', () => {
        it('should accept value from eligibleValue list', () => {
            const pkg = {
                "id": "d:test-enum-string-valid",
                "itemType": "pig:aPackage",
                "modified": "2026-02-16T12:00:00Z",
                "context": [
                    {
                        "tag": "o",
                        "uri": "https://product-information-graph.org/v0.2/ontology#"
                    }, {
                        "tag": "d",
                        "uri": "https://product-information-graph.org/examples/09_Very-Simple-Model-FMC-with-Requirements.specif.zip#"
                    }, {
                        "tag": "pig",
                        "uri": "https://product-information-graph.org/v0.2/metamodel#"
                    }, {
                        "tag": "IREB",
                        "uri": "https://cpre.ireb.org/en/downloads-and-resources/glossary#"
                    }
                ],
                "graph": [{
                    "id": "IREB:Priority",
                    "itemType": "pig:Property",
                    "specializes": "pig:Property",
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
                    "eligibleValue": [
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
                    "id": "d:Req-1a8016e2872e78ecadc50feddc00029b",
                    "itemType": "pig:anEntity",
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
                    "hasProperty": [
                        {
                            "idRef": "IREB:priorityHigh",
                            "hasClass": "IREB:Priority",
                            "itemType": "pig:aProperty"
                        }
                    ]
                }]
            } as unknown as APackage;

            // A. Test the constraints directly:
            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
            });
            expect(result.ok).toBe(true);

            // B. Test the constraints including setting and getting:
            const rsp = new APackage().set(pkg, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
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
            expect(pkgOut.itemType).toBe('pig:aPackage');
            expect(pkgOut.modified).toBe('2026-02-16T12:00:00Z');

            // Verify context preservation
            expect(pkgOut.context).toBeDefined();
            expect(Array.isArray(pkgOut.context)).toBe(true);
            expect((pkgOut.context as any[]).length).toBe(4);

            // Verify graph structure
            expect(pkgOut.graph).toBeDefined();
            expect(Array.isArray(pkgOut.graph)).toBe(true);
            expect(pkgOut.graph.length).toBe(2);

            // Verify Property definition (first graph item)
            const propertyDef = pkgOut.graph[0] as any;
            expect(propertyDef.id).toBe('IREB:Priority');
            expect(propertyDef.itemType).toBe('pig:Property');
            expect(propertyDef.datatype).toBe('xs:string');
            expect(propertyDef.specializes).toBe('pig:Property');

            // Verify eligibleValue array
            expect(propertyDef.eligibleValue).toBeDefined();
            expect(Array.isArray(propertyDef.eligibleValue)).toBe(true);
            expect(propertyDef.eligibleValue.length).toBe(3);
            expect(propertyDef.eligibleValue[0].id).toBe('IREB:priorityHigh');
            expect(propertyDef.eligibleValue[1].id).toBe('IREB:priorityMedium');
            expect(propertyDef.eligibleValue[2].id).toBe('IREB:priorityLow');

            // Verify multi-language titles in eligibleValue
            expect(propertyDef.eligibleValue[0].title[0].value).toBe('high');
            expect(propertyDef.eligibleValue[0].title[0].lang).toBe('en');
            expect(propertyDef.eligibleValue[0].title[1].value).toBe('hoch');
            expect(propertyDef.eligibleValue[0].title[1].lang).toBe('de');

            // Verify anEntity instance (second graph item)
            const anEntity = pkgOut.graph[1] as any;
            expect(anEntity.id).toBe('d:Req-1a8016e2872e78ecadc50feddc00029b');
            expect(anEntity.itemType).toBe('pig:anEntity');
            expect(anEntity.hasClass).toBe('IREB:Requirement');
            expect(anEntity.modified).toBe('2020-10-17T10:00:00+01:00');

            // Verify anEntity title and description
            expect(anEntity.title).toBeDefined();
            expect(Array.isArray(anEntity.title)).toBe(true);
            expect(anEntity.title[0].value).toBe('Data Volume');
            expect(anEntity.description[0].value).toContain('850 GB');

            // Verify property instance with enumeration reference
            expect(anEntity.hasProperty).toBeDefined();
            expect(Array.isArray(anEntity.hasProperty)).toBe(true);
            expect(anEntity.hasProperty.length).toBe(1);

            const aProperty = anEntity.hasProperty[0];
            expect(aProperty.itemType).toBe('pig:aProperty');
            expect(aProperty.hasClass).toBe('IREB:Priority');
            expect(aProperty.idRef).toBe('IREB:priorityHigh');
            expect(aProperty.value).toBeUndefined(); // enumeration uses idRef, not value
        });

        it('should reject value not in eligibleValue list', () => {
            const pkg = {
                "graph": [{
                    "id": "SpecIF:Priority",
                    "title": [
                        {
                            "value": "Priority",
                            "lang": "en"
                        }
                    ],
                    "description": [
                        {
                            "value": "Enumerated values for the 'Priority' of the resource.",
                            lang: "en"
                        }
                    ],
                    "specializes": "pig:Property",
                    "itemType": "pig:Property",
                    "datatype": "xs:string",
                    "eligibleValue": [
                        {
                            "id": "SpecIF:priorityHigh",
                            "title": [
                                {
                                    "value": "high",
                                    lang: "en"
                                }
                            ]
                        },
                        {
                            "id": "SpecIF:priorityMedium",
                            "title": [
                                {
                                    "value": "medium",
                                    lang: "en"
                                }
                            ]
                        },
                        {
                            "id": "SpecIF:priorityLow",
                            "title": [
                                {
                                    "value": "low",
                                    lang: "en"
                                }
                            ]
                        }
                    ]
                }, {
                    "id": "d:Req-with-invalid-reference-to-eligible-value",
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
                    "hasProperty": [
                        {
                            "idRef": "SpecIF:prioHi",
                            "hasClass": "SpecIF:Priority"
                        }
                    ],
                    "itemType": "pig:anEntity"
                }]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('not in eligibleValue list');
            expect(result.statusText).toContain("SpecIF:priorityHigh");
        });

        it('should accept numeric value from eligibleValue list with JSON-LD input', () => {
            const pkgJsonLD = {
                "@context": {
                    "pig": "https://product-information-graph.org/v0.2/metamodel#",
                    "o": "https://product-information-graph.org/v0.2/ontology#",
                    "d": "https://product-information-graph.org/examples/fibonacci.zip#",
                    "dcterms": "http://purl.org/dc/terms/",
                    "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
                },
                "@id": "d:test-enum-numeric-jsonld",
                "pig:itemType": { "@id": "pig:aPackage" },
                "dcterms:modified": "2026-02-16T12:00:00Z",
                "@graph": [
                    {
                        "@id": "o:Fibonacci",
                        "pig:itemType": { "@id": "pig:Property" },
                        "pig:specializes": { "@id": "pig:Property" },
                        "dcterms:title": [
                            {
                                "@value": "Fibonacci Numbers",
                                "@language": "en"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "Enumerated Fibonacci sequence values for estimation",
                                "@language": "en"
                            }
                        ],
                        "sh:datatype": "xs:integer",
                        "pig:eligibleValue": [
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
                        "@id": "d:Est-Task-4711",
                        "pig:itemType": { "@id": "pig:anEntity" },
                        "@type": "o:Estimate",
                        "dcterms:modified": "2026-01-15T14:30:00Z",
                        "dcterms:title": [
                            {
                                "@value": "Implement User Authentication",
                                "@language": "en"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "<p>Task requires implementation of OAuth2 authentication</p>",
                                "@language": "en"
                            }
                        ],
                        "o:Fibonacci": [
                            {
                                "pig:itemType": { "@id": "pig:aProperty" },
                                "@id": "o:Fibonacci-8"
                            }
                        ]
                    }
                ]
            };

            // A. Test with JSON-LD input via setJSONLD
            const rsp = new APackage().setJSONLD(pkgJsonLD, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
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
            expect(pkgOut.itemType).toBe('pig:aPackage');
            expect(pkgOut.modified).toBe('2026-02-16T12:00:00Z');

            // Verify graph items
            expect(pkgOut.graph).toBeDefined();
            expect(pkgOut.graph.length).toBe(2);

            // Verify Fibonacci Property definition
            const fibonacciProp = pkgOut.graph[0] as any;
            expect(fibonacciProp.id).toBe('o:Fibonacci');
            expect(fibonacciProp.itemType).toBe('pig:Property');
            expect(fibonacciProp.datatype).toBe('xs:integer');
            expect(fibonacciProp.specializes).toBe('pig:Property');

            // Verify eligibleValue array
            expect(fibonacciProp.eligibleValue).toBeDefined();
            expect(Array.isArray(fibonacciProp.eligibleValue)).toBe(true);
            expect(fibonacciProp.eligibleValue.length).toBe(6);
            expect(fibonacciProp.eligibleValue[0].id).toBe('o:Fibonacci-1');
            expect(fibonacciProp.eligibleValue[0].value).toBe('1');
            expect(fibonacciProp.eligibleValue[4].id).toBe('o:Fibonacci-8');
            expect(fibonacciProp.eligibleValue[4].value).toBe('8');
            expect(fibonacciProp.eligibleValue[5].id).toBe('o:Fibonacci-13');
            expect(fibonacciProp.eligibleValue[5].value).toBe('13');

            // Verify anEntity instance
            const taskInstance = pkgOut.graph[1] as any;
            expect(taskInstance.id).toBe('d:Est-Task-4711');
            expect(taskInstance.itemType).toBe('pig:anEntity');
            expect(taskInstance.hasClass).toBe('o:Estimate');
            expect(taskInstance.title[0].value).toBe('Implement User Authentication');
            expect(taskInstance.description[0].value).toContain('OAuth2');

            // Verify property instance with numeric enumeration reference
            expect(taskInstance.hasProperty).toBeDefined();
            expect(Array.isArray(taskInstance.hasProperty)).toBe(true);
            expect(taskInstance.hasProperty.length).toBe(1);

            const estimateProp = taskInstance.hasProperty[0];
            expect(estimateProp.itemType).toBe('pig:aProperty');
            expect(estimateProp.hasClass).toBe('o:Fibonacci');
            expect(estimateProp.idRef).toBe('o:Fibonacci-8'); // Reference to Fibonacci value
            expect(estimateProp.value).toBeUndefined(); // Enumeration uses idRef, not value

            // B. Verify constraint validation directly
            const directResult = checkConstraintsForPackage(pkgOut, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
            });
            expect(directResult.ok).toBe(true);
        });

        it('should reject numeric value not in eligibleValue list', () => {
            const pkg = {
                "graph": [{
                    "id": "o:Fibonacci",
                    "title": [
                        {
                            "value": "Fibonacci Numbers"
                        }
                    ],
                    "specializes": "pig:Property",
                    "itemType": "pig:Property",
                    "datatype": "xs:integer",
                    "eligibleValue": [
                        {
                            "id": "o:Fibonacci-1",
                            "value": "1"
                        },
                        {
                            "id": "o:Fibonacci-2",
                            "value": "2"
                        },
                        {
                            "id": "o:Fibonacci-3",
                            "value": "3"
                        },
                        {
                            "id": "o:Fibonacci-5",
                            "value": "5"
                        },
                        {
                            "id": "o:Fibonacci-8",
                            "value": "8"
                        }
                    ]
                }, {
                    "id": "d:Est-with-invalid-enumerated-integer",
                    "hasClass": "o:Estimate",
                    "modified": "2020-10-17T10:00:00+01:00",
                    "title": [
                        {
                            "value": "Estimate Task 4711"
                        }
                    ],
                    "hasProperty": [
                        {
                            "idRef": "o:Fibonacci-4",
                            "hasClass": "o:Fibonacci"
                        }
                    ],
                    "itemType": "pig:anEntity"
                }]
            } as unknown as APackage;

            const result = checkConstraintsForPackage(pkg, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
            });

            expect(result.ok).toBe(false);
            expect(result.status).toBe(679);
            expect(result.statusText).toContain('not in eligibleValue list');
            expect(result.statusText).toContain("o:Fibonacci-5");
        });

        it('should accept numeric value from eligibleValue list with XML input', () => {
            const pkgXML = `<?xml version="1.0" encoding="UTF-8"?>
            <pig:aPackage xmlns:pig="https://product-information-graph.org/v0.2/metamodel#"
                          xmlns:o="https://product-information-graph.org/v0.2/ontology#"
                          xmlns:d="https://product-information-graph.org/examples/fibonacci.zip#"
                          xmlns:dcterms="http://purl.org/dc/terms/"
                          id="d:test-enum-numeric-xml">
                <dcterms:modified>2026-02-16T12:00:00Z</dcterms:modified>
                <dcterms:title xml:lang="en">Fibonacci Estimation Example</dcterms:title>
                <graph>
                    <pig:Property id="o:Fibonacci" pig:specializes="pig:Property">
                        <dcterms:title xml:lang="en">Fibonacci Numbers</dcterms:title>
                        <dcterms:description xml:lang="en">Enumerated Fibonacci sequence values for estimation</dcterms:description>
                        <datatype>xs:integer</datatype>
                        <eligibleValue id="o:Fibonacci-1">
                            <value>1</value>
                        </eligibleValue>
                        <eligibleValue id="o:Fibonacci-2">
                            <value>2</value>
                        </eligibleValue>
                        <eligibleValue id="o:Fibonacci-3">
                            <value>3</value>
                        </eligibleValue>
                        <eligibleValue id="o:Fibonacci-5">
                            <value>5</value>
                        </eligibleValue>
                        <eligibleValue id="o:Fibonacci-8">
                            <value>8</value>
                        </eligibleValue>
                        <eligibleValue id="o:Fibonacci-13">
                            <value>13</value>
                        </eligibleValue>
                    </pig:Property>
        
                    <pig:anEntity id="d:Est-Task-4711" rdf:type="o:Estimate">
                        <dcterms:modified>2026-01-15T14:30:00Z</dcterms:modified>
                        <dcterms:title xml:lang="en">Implement User Authentication</dcterms:title>
                        <dcterms:description xml:lang="en"><![CDATA[<p>Task requires implementation of OAuth2 authentication</p>]]></dcterms:description>
                        <pig:aProperty rdf:type="o:Fibonacci">
                            <idRef>o:Fibonacci-8</idRef>
                        </pig:aProperty>
                    </pig:anEntity>
                </graph>
            </pig:aPackage>`;

            // A. Test with XML input via setXML
            const rsp = new APackage().setXML(pkgXML, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
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
            expect(pkgOut.itemType).toBe('pig:aPackage');
            expect(pkgOut.modified).toBe('2026-02-16T12:00:00Z');

            // Verify package title
            expect(pkgOut.title).toBeDefined();
            expect(Array.isArray(pkgOut.title)).toBe(true);
            expect(pkgOut.title[0].value).toBe('Fibonacci Estimation Example');
            expect(pkgOut.title[0].lang).toBe('en');

            // Verify graph items
            expect(pkgOut.graph).toBeDefined();
            expect(Array.isArray(pkgOut.graph)).toBe(true);
            expect(pkgOut.graph.length).toBe(2);

            // Verify Fibonacci Property definition
            const fibonacciProp = pkgOut.graph[0] as any;
            expect(fibonacciProp.id).toBe('o:Fibonacci');
            expect(fibonacciProp.itemType).toBe('pig:Property');
            expect(fibonacciProp.datatype).toBe('xs:integer');
            expect(fibonacciProp.specializes).toBe('pig:Property');

            // Verify Property title and description
            expect(fibonacciProp.title[0].value).toBe('Fibonacci Numbers');
            expect(fibonacciProp.title[0].lang).toBe('en');
            expect(fibonacciProp.description[0].value).toBe('Enumerated Fibonacci sequence values for estimation');

            // Verify eligibleValue array with numeric values
            expect(fibonacciProp.eligibleValue).toBeDefined();
            expect(Array.isArray(fibonacciProp.eligibleValue)).toBe(true);
            expect(fibonacciProp.eligibleValue.length).toBe(6);

            // Check eligible values
            expect(fibonacciProp.eligibleValue[0].id).toBe('o:Fibonacci-1');
            expect(fibonacciProp.eligibleValue[0].value).toBe('1');
            expect(fibonacciProp.eligibleValue[0].title).toBeUndefined(); // Numeric enums have value, not title
            expect(fibonacciProp.eligibleValue[3].id).toBe('o:Fibonacci-5');
            expect(fibonacciProp.eligibleValue[3].value).toBe('5');
            expect(fibonacciProp.eligibleValue[5].id).toBe('o:Fibonacci-13');
            expect(fibonacciProp.eligibleValue[5].value).toBe('13');

            // Verify anEntity instance
            const taskInstance = pkgOut.graph[1] as any;
            expect(taskInstance.id).toBe('d:Est-Task-4711');
            expect(taskInstance.itemType).toBe('pig:anEntity');
            expect(taskInstance.hasClass).toBe('o:Estimate');
            expect(taskInstance.modified).toBe('2026-01-15T14:30:00Z');

            // Verify task title and description
            expect(taskInstance.title[0].value).toBe('Implement User Authentication');
            expect(taskInstance.title[0].lang).toBe('en');
            expect(taskInstance.description[0].value).toContain('OAuth2 authentication');

            // Verify property instance with numeric enumeration reference
            expect(taskInstance.hasProperty).toBeDefined();
            expect(Array.isArray(taskInstance.hasProperty)).toBe(true);
            expect(taskInstance.hasProperty.length).toBe(1);

            const estimateProp = taskInstance.hasProperty[0];
            expect(estimateProp.itemType).toBe('pig:aProperty');
            expect(estimateProp.hasClass).toBe('o:Fibonacci');
            expect(estimateProp.idRef).toBe('o:Fibonacci-8'); // Reference to Fibonacci value
            expect(estimateProp.value).toBeUndefined(); // Enumeration uses idRef, not value

            // B. Verify constraint validation directly
            const directResult = checkConstraintsForPackage(pkgOut, {
                checkConstraints: [ConstraintCheckType.aPropertyHasClass, ConstraintCheckType.ValueRanges]
            });
            expect(directResult.ok).toBe(true);
        });
    });
});
