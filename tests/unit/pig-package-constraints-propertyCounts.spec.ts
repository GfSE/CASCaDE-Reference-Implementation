import { checkConstraintsForPackage, ConstraintCheckType } from '../../src/utils/schemas/pig/ts/pig-package-constraints';
import { IAPackage, APackage, PigItemType } from '../../src/utils/schemas/pig/ts/pig-metaclasses';

describe('PIG Package Constraints - Property Occurrence Validation (minCount/maxCount)', () => {
    // Helper to create a minimal valid package
    const createPackage = (properties: any[], propertyDefs: any[] = []): IAPackage => {
        return {
            itemType: PigItemType.aPackage,
            id: 'd:test-package',
            title: [{ value: 'Test Package', lang: 'en' }],
            modified: '2026-02-10T00:00:00Z',
            graph: [
                // Entity class
                {
                    itemType: PigItemType.Entity,
                    id: 'o:TestEntity',
                    title: [{ value: 'Test Entity', lang: 'en' }]
                },
                // Property definitions
                ...propertyDefs,
                // Entity instance
                {
                    itemType: PigItemType.anEntity,
                    id: 'd:entity-1',
                    hasClass: 'o:TestEntity',
                    title: [{ value: 'Entity 1', lang: 'en' }],
                    revision: '1',
                    modified: '2025-01-01T00:00:00Z',
                    hasProperty: properties
                }
            ]
        };
    };

    describe('xs:string properties - Language-aware validation', () => {
        describe('minCount validation', () => {
            it('should pass when minCount=1 and one language has one value', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Name',
                            value: { value: 'Engine', lang: 'en' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Name',
                            title: [{ value: 'Name', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 1,
                            maxCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, {check: [ConstraintCheckType.aPropertyHasClass]});
                expect(result.ok).toBe(true);
            });

            it('should pass when minCount=1 and multiple languages each have one value', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Name',
                            value: { value: 'Engine', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Name',
                            value: { value: 'Motor', lang: 'de' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Name',
                            title: [{ value: 'Name', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 1,
                            maxCount: 2
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });

            it('should pass when minCount=2 and one language has exactly 2 values', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Description',
                            value: { value: 'Fast', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Description',
                            value: { value: 'Reliable', lang: 'en' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Description',
                            title: [{ value: 'Description', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 2,
                            maxCount: 3
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass]});
                expect(result.ok).toBe(true);
            });

            it('should pass when minCount=2 and multiple languages each have 2+ values', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'fast', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'powerful', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'schnell', lang: 'de' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'leistungsstark', lang: 'de' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Keyword',
                            title: [{ value: 'Keyword', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 2,
                            maxCount: 3
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });

            it('should fail when minCount=1 but no values present', () => {
                const pkg = createPackage(
                    [],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Name',
                            title: [{ value: 'Name', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(false);
                expect(result.status).toBe(678);
                expect(result.statusText).toContain('no values present');
            });

            it('should fail when minCount=2 but one language has only 1 value', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'fast', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'schnell', lang: 'de' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'leistungsstark', lang: 'de' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Keyword',
                            title: [{ value: 'Keyword', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 2
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(false);
                expect(result.status).toBe(678);
                expect(result.statusText).toContain('too few values for language');
                expect(result.statusText).toContain('en');
            });
        });

        describe('maxCount validation', () => {
            it('should pass when maxCount=2 and each language has <= 2 values', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'fast', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'powerful', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'schnell', lang: 'de' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'leistungsstark', lang: 'de' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Keyword',
                            title: [{ value: 'Keyword', lang: 'en' }],
                            datatype: 'xs:string',
                            maxCount: 2
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });

            it('should fail when maxCount=1 but one language has 2 values', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Name',
                            value: { value: 'Engine', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Name',
                            value: { value: 'Motor', lang: 'en' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Name',
                            title: [{ value: 'Name', lang: 'en' }],
                            datatype: 'xs:string',
                            maxCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(false);
                expect(result.status).toBe(678);
                expect(result.statusText).toContain('too many values for language');
                expect(result.statusText).toContain('en');
            });

            it('should fail when maxCount=2 but one language has 3 values', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'fast', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'powerful', lang: 'en' }
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Keyword',
                            value: { value: 'reliable', lang: 'en' }
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Keyword',
                            title: [{ value: 'Keyword', lang: 'en' }],
                            datatype: 'xs:string',
                            maxCount: 2
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(false);
                expect(result.status).toBe(678);
                expect(result.statusText).toContain('too many values for language');
            });
        });

        describe('Default language handling', () => {
            it('should use "default" language when no lang attribute specified', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Name',
                            value: 'Engine' // no lang attribute
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Name',
                            title: [{ value: 'Name', lang: 'en' }],
                            datatype: 'xs:string',
                            minCount: 1,
                            maxCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });
        });
    });

    describe('Non-string properties - Total count validation', () => {
        describe('Numeric properties (xs:double)', () => {
            it('should pass when count is within minCount and maxCount', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Weight',
                            value: '100.5'
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Weight',
                            value: '105.2'
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Weight',
                            title: [{ value: 'Weight', lang: 'en' }],
                            datatype: 'xs:double',
                            minCount: 1,
                            maxCount: 3
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });

        /*  Similar to another test case at line 176
            it('should fail when count is below minCount', () => {
                const pkg = createPackage(
                    [],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Weight',
                            title: [{ value: 'Weight', lang: 'en' }],
                            datatype: 'xs:double',
                            minCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(false);
                expect(result.status).toBe(678);
                expect(result.statusText).toContain('too few occurrences');
            }); */

            it('should fail when count exceeds maxCount', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Weight',
                            value: '100.5'
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Weight',
                            value: '105.2'
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Weight',
                            value: '98.7'
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Weight',
                            value: '102.1'
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Weight',
                            title: [{ value: 'Weight', lang: 'en' }],
                            datatype: 'xs:double',
                            maxCount: 3
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(false);
                expect(result.status).toBe(678);
                expect(result.statusText).toContain('too many occurrences');
            });
        });

        describe('Integer properties (xs:integer)', () => {
            it('should pass when count equals minCount and maxCount', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Count',
                            value: '42'
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Count',
                            title: [{ value: 'Count', lang: 'en' }],
                            datatype: 'xs:integer',
                            minCount: 1,
                            maxCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });

            it('should pass when multiple occurrences are allowed', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Count',
                            value: '1'
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Count',
                            value: '2'
                        },
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:Count',
                            value: '3'
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:Count',
                            title: [{ value: 'Count', lang: 'en' }],
                            datatype: 'xs:integer',
                            minCount: 2,
                            maxCount: 5
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });
        });

        describe('Boolean properties (xs:boolean)', () => {
            it('should validate count for boolean properties', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:IsActive',
                            value: 'true'
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:IsActive',
                            title: [{ value: 'Is Active', lang: 'en' }],
                            datatype: 'xs:boolean',
                            minCount: 1,
                            maxCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });
        });

        describe('Date properties (xs:date)', () => {
            it('should validate count for date properties', () => {
                const pkg = createPackage(
                    [
                        {
                            itemType: PigItemType.aProperty,
                            hasClass: 'o:CreatedDate',
                            value: '2025-01-01'
                        }
                    ],
                    [
                        {
                            itemType: PigItemType.Property,
                            id: 'o:CreatedDate',
                            title: [{ value: 'Created Date', lang: 'en' }],
                            datatype: 'xs:date',
                            minCount: 1,
                            maxCount: 1
                        }
                    ]
                );

                const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
                expect(result.ok).toBe(true);
            });
        });
    });

    describe('Default values for minCount and maxCount', () => {
        it('should use minCount=0 and maxCount=1 as defaults', () => {
            const pkg = createPackage(
                [
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:OptionalProp',
                        value: 'value'
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:OptionalProp',
                        title: [{ value: 'Optional Property', lang: 'en' }],
                        datatype: 'xs:string'
                        // minCount and maxCount not specified
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(true);
        });

        it('should fail with default maxCount=1 when 2 values provided (non-string)', () => {
            const pkg = createPackage(
                [
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Count',
                        value: '1'
                    },
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Count',
                        value: '2'
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Count',
                        title: [{ value: 'Count', lang: 'en' }],
                        datatype: 'xs:integer'
                        // maxCount defaults to 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(false);
            expect(result.status).toBe(678);
        });
    });

    describe('Mixed properties in same instance', () => {
        it('should validate multiple different properties correctly', () => {
            const pkg = createPackage(
                [
                    // String property with multiple languages
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Name',
                        value: { value: 'Engine', lang: 'en' }
                    },
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Name',
                        value: { value: 'Motor', lang: 'de' }
                    },
                    // Numeric property
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Weight',
                        value: '100.5'
                    },
                    // Integer property
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Count',
                        value: '42'
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Name',
                        title: [{ value: 'Name', lang: 'en' }],
                        datatype: 'xs:string',
                        minCount: 1,
                        maxCount: 2
                    },
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Weight',
                        title: [{ value: 'Weight', lang: 'en' }],
                        datatype: 'xs:double',
                        minCount: 1,
                        maxCount: 1
                    },
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Count',
                        title: [{ value: 'Count', lang: 'en' }],
                        datatype: 'xs:integer',
                        minCount: 1,
                        maxCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(true);
        });
    });

    describe('Edge cases', () => {
        it('should handle minCount=0 (optional property)', () => {
            const pkg = createPackage(
                [], // No properties
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:OptionalName',
                        title: [{ value: 'Optional Name', lang: 'en' }],
                        datatype: 'xs:string',
                        minCount: 0,
                        maxCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(true);
        });

        it('should reject maxCount=0 at schema validation level', () => {
            const pkg = createPackage(
                [],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:ForbiddenProp',
                        title: [{ value: 'Forbidden Property', lang: 'en' }],
                        datatype: 'xs:string',
                        minCount: 0,
                        maxCount: 0  // Should be rejected by schema
                    }
                ]
            );

            // Use setJSONLD to trigger Property instantiation
            // even though pkg is simple JSON, setJSONLD should handle it
            const result = new APackage().setJSONLD(pkg);
            // console.info('Result:', JSON.stringify(result,null,2));

            expect(result.status().ok).toBe(false);
            expect(result.status().status).toBe(679);  // not all graph items could be instantiated

            // ToDo: Return items that failed to instantiate and check that o:ForbiddenProp has a schema check error for maxCount=0
            // expect(result.status().statusText).toContain('maxCount');
            // expect(result.status().statusText).toContain('must be >= 1');
        });

        it('should handle xsd:string (alternative namespace prefix)', () => {
            const pkg = createPackage(
                [
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Name',
                        value: { value: 'Engine', lang: 'en' }
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Name',
                        title: [{ value: 'Name', lang: 'en' }],
                        datatype: 'xsd:string', // using xsd: prefix instead of xs:
                        minCount: 1,
                        maxCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(true);
        });
    });
/*    describe('Edge cases', () => {
        it('should handle minCount=0 (optional property)', () => {
            const pkg = createPackage(
                [], // No properties
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:OptionalName',
                        title: [{ value: 'Optional Name', lang: 'en' }],
                        datatype: 'xs:string',
                        minCount: 0,
                        maxCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(true);
        });

        it('should reject maxCount=0', () => {
            const pkg = createPackage(
                [
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:ForbiddenProp',
                        value: 'should fail'
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:ForbiddenProp',
                        title: [{ value: 'Forbidden Property', lang: 'en' }],
                        datatype: 'xs:string',
                        minCount: 0,
                        maxCount: 0
                    }
                ]
            );

            const result = new APackage().set(pkg);
            expect(result.status().ok).toBe(false);
            expect(result.status().status).toBe(678);
        });

        it('should handle xsd:string (alternative namespace prefix)', () => {
            const pkg = createPackage(
                [
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Name',
                        value: { value: 'Engine', lang: 'en' }
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Name',
                        title: [{ value: 'Name', lang: 'en' }],
                        datatype: 'xsd:string', // using xsd: prefix instead of xs:
                        minCount: 1,
                        maxCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(true);
        });
    });
*/    

    describe('Error message validation', () => {
        it('should provide detailed error for string property minCount violation', () => {
            const pkg = createPackage(
                [],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Name',
                        title: [{ value: 'Name', lang: 'en' }],
                        datatype: 'xs:string',
                        minCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(false);
            expect(result.statusText).toMatch(/d:entity-1/);
            expect(result.statusText).toMatch(/o:Name/);
            expect(result.statusText).toMatch(/no values present/);
        });

        it('should provide detailed error for non-string property maxCount violation', () => {
            const pkg = createPackage(
                [
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Weight',
                        value: '100'
                    },
                    {
                        itemType: PigItemType.aProperty,
                        hasClass: 'o:Weight',
                        value: '200'
                    }
                ],
                [
                    {
                        itemType: PigItemType.Property,
                        id: 'o:Weight',
                        title: [{ value: 'Weight', lang: 'en' }],
                        datatype: 'xs:double',
                        maxCount: 1
                    }
                ]
            );

            const result = checkConstraintsForPackage(pkg, { check: [ConstraintCheckType.aPropertyHasClass] });
            expect(result.ok).toBe(false);
            expect(result.statusText).toMatch(/d:entity-1/);
            expect(result.statusText).toMatch(/o:Weight/);
            expect(result.statusText).toMatch(/too many occurrences/);
        });
    });
});
