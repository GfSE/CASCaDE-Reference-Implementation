/*!
 * JEST Test Suite for PIG Package Constraint Validation
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { checkConstraintsForPackage } from '../../src/utils/schemas/pig/ts/pig-package-constraints';
import { APackage, IAPackage, PigItemType } from '../../src/utils/schemas/pig/ts/pig-metaclasses';

describe('PIG Package Constraint Validation', () => {
    describe('Positive Tests - Valid Packages', () => {
        test('should validate minimal valid package', () => {
            const validPackageJsonLd = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-001',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        '@type': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_RefersTo',
                        '@type': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Refers To', '@language': 'en' }
                        ],
                        'pig:eligibleEndpoint': [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-001-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Test Requirement', '@language': 'en' }
                        ],
                        'o:Property_Status': [
                            {
                                'pig:itemType': { '@id': 'pig:aProperty' },
                                '@value': 'Draft'
                            }
                        ],
                        'o:Link_RefersTo': [
                            {
                                'pig:itemType': { '@id': 'pig:aTargetLink' },
                                '@id': 'd:REQ-002'
                            }
                        ]
                    },
                    {
                        '@id': 'd:REQ-002-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Another Requirement', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            const items = pkg.setJSONLD(validPackageJsonLd);
            
            expect(pkg.status().ok).toBe(true);
            expect(items.length).toBe(6);

            const result = checkConstraintsForPackage(pkg.get() as IAPackage);
            
            expect(result.ok).toBe(true);
            expect(result.status).toBe(0);
        });

        test('should validate package with relationship containing source and target links', () => {
            const packageWithRelationship = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-002',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Rationale',
                        '@type': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Rationale', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_Source',
                        '@type': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Source', '@language': 'en' }
                        ],
                        'pig:eligibleEndpoint': [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        '@type': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Target', '@language': 'en' }
                        ],
                        'pig:eligibleEndpoint': [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Trace',
                        '@type': 'pig:Relationship',
                        'pig:itemType': { '@id': 'pig:Relationship' },
                        'dcterms:title': [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-003-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-004-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Target Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:TRACE-001-ok',
                        '@type': 'o:Relationship_Trace',
                        'pig:itemType': { '@id': 'pig:aRelationship' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Trace Link', '@language': 'en' }
                        ],
                        'o:Property_Rationale': [
                            {
                                'pig:itemType': { '@id': 'pig:aProperty' },
                                '@value': 'Decomposition'
                            }
                        ],
                        'o:Link_Source': [
                            {
                                'pig:itemType': { '@id': 'pig:aSourceLink' },
                                '@id': 'd:REQ-003-ok'
                            }
                        ],
                        'o:Link_Target': [
                            {
                                'pig:itemType': { '@id': 'pig:aTargetLink' },
                                '@id': 'd:REQ-004-ok'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            const items = pkg.setJSONLD(packageWithRelationship);
            
            expect(pkg.status().ok).toBe(true);
            expect(items.length).toBe(9);

            const result = checkConstraintsForPackage(pkg.get() as IAPackage);
            
            expect(result.ok).toBe(true);
            expect(result.status).toBe(0);
        });
    });

    describe('Negative Tests - Duplicate IDs', () => {
        test('should reject package with items having duplicate IDs', () => {
            const packageWithDuplicateIds = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-duplicate-id',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        '@type': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Entity_duplicateId_nok',
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_duplicateId_nok', // ❌ Duplicate ID
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Another Entity', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithDuplicateIds);

            // check the attribute values upon creation:
         /*   if (pck.status().ok)
                console.error('status:', pck.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(671); // Duplicate ID error code
            
        /*    const result = pkg.get() as IAPackage;
            
            expect(result.ok).toBe(false);
            expect(result.status).toBe(671); // Duplicate ID error code
            expect(result.statusText).toContain('duplicate ID');
            expect(result.statusText).toContain('o:Entity_Requirement'); */
        });

        test('should reject package with an item missing ID', () => {
            const packageWithMissingId = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-missing-id',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        '@type': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        // ❌ Missing @id
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Entity Without ID', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithMissingId);

            // check the attribute values upon creation:
            /*   if (pck.status().ok)
                   console.error('status:', pck.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(670); // Missing ID error code
            
        /*    const result = pkg.get() as IAPackage;
            
            expect(result.ok).toBe(false);
            expect(result.status).toBe(670); // Missing ID error code
            expect(result.statusText).toContain('missing id'); */
        });
    });

    describe('Negative Tests - Invalid aProperty References', () => {
        test('should reject aProperty referencing non-existent class', () => {
            const packageWithInvalidPropertyRef = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-invalid-prop',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-with-NonExistent-Property',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Test Requirement with property having an invalid class', '@language': 'en' }
                        ],
                        'o:Property_NonExistent': [ // ❌ References non-existent Property
                            {
                                'pig:itemType': { '@id': 'pig:aProperty' },
                                '@value': 'Some Value'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithInvalidPropertyRef);

            // check the attribute values upon creation:
            /*   if (pck.status().ok)
                   console.error('status:', pck.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(673); // Invalid hasClass reference
            
        /*    const result = pkg.get() as IAPackage;
            
            expect(result.ok).toBe(false);
            expect(result.status).toBe(673); // Invalid hasClass reference
            expect(result.statusText).toContain('hasProperty[0].hasClass');
            expect(result.statusText).toContain('o:Property_NonExistent');
            expect(result.statusText).toContain('not found in package'); */
        });

        test('should reject aProperty referencing wrong type (Link instead of Property)', () => {
            const packageWithWrongTypeRef = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-type',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Link_RefersTo', // This is a Link, not a Property!
                        '@type': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Refers To', '@language': 'en' }
                        ],
                        'pig:eligibleEndpoint': [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-with-wrong-Property-class',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Test Requirement', '@language': 'en' }
                        ],
                        'o:Link_RefersTo': [ // ❌ Used as Property but it's a Link!
                            {
                                'pig:itemType': { '@id': 'pig:aProperty' },
                                '@value': 'Wrong Property class'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongTypeRef);

            // check the attribute values upon creation:
            /*   if (pck.status().ok)
                   console.error('status:', pck.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(673); // Invalid hasClass type
            
        /*    const result = pkg.get() as IAPackage;
            
            expect(result.ok).toBe(false);
            expect(result.status).toBe(673);
            expect(result.statusText).toContain('hasProperty[0].hasClass');
            expect(result.statusText).toContain('o:Link_RefersTo');
            expect(result.statusText).toContain('expected pig:Property, found pig:Link'); */
        });
    });

    describe('Negative Tests - Invalid aLink References', () => {
        test('should reject aTargetLink referencing non-existent class', () => {
            const packageWithInvalidLinkRef = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-invalid-link',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'pig:Entity',
                        '@type': 'owl:class',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Entity', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'pig:Organizer',
                        'specializes': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Organizer', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Folder',
                        'pig:specializes': 'pig:Organizer',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Folder', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:Folder-with-link-having-invalid-class',
                        '@type': 'o:Entity_Folder',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Test Folder with a target link having an invalid (missing) class', '@language': 'en' }
                        ],
                        'o:Link_NonExistent': [ // ❌ References non-existent Link
                            {
                                'pig:itemType': { '@id': 'pig:aTargetLink' },
                                '@id': 'd:REQ-005-ok'
                            }
                        ]
                    },
                    {
                        '@id': 'd:REQ-005-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Target Requirement', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithInvalidLinkRef);

            // check the attribute values upon creation:
            /*   if (pck.status().ok)
                   console.error('status:', pck.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(675); // Invalid hasClass reference
            
        /*    const result = pkg.get() as IAPackage;
            
            expect(result.ok).toBe(false);
            expect(result.status).toBe(675); // Invalid link hasClass reference
            expect(result.statusText).toContain('hasTargetLink[0].hasClass');
            expect(result.statusText).toContain('o:Link_NonExistent');
            expect(result.statusText).toContain('not found in package'); */
        });

        test('should reject aSourceLink referencing wrong type (Property instead of Link)', () => {
            const packageWithWrongLinkType = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-link-type',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Rationale',
                        '@type': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Rationale', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_Source',
                        '@type': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Source', '@language': 'en' }
                        ],
                        'pig:eligibleEndpoint': [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        '@type': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Target', '@language': 'en' }
                        ],
                        'pig:eligibleEndpoint': [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Refinement',
                        '@type': 'pig:Relationship',
                        'pig:itemType': { '@id': 'pig:Relationship' },
                        'dcterms:title': [
                            { '@value': 'refines', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-006-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-007-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Target Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:TRACE-wrong-SourceLink-class-nok',
                        '@type': 'o:Relationship_Trace',
                        'pig:itemType': { '@id': 'pig:aRelationship' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Trace Link', '@language': 'en' }
                        ],
                        'o:Property_Rationale': [ // ❌ Used as Link but it's a Property!
                            {
                                'pig:itemType': { '@id': 'pig:aSourceLink' },
                                '@id': 'd:REQ-003-ok'
                            }
                        ],
                        'o:Link_Target': [
                            {
                                'pig:itemType': { '@id': 'pig:aTargetLink' },
                                '@id': 'd:REQ-004-ok'
                            }
                        ]
                    }
                ]
            };
 
            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongLinkType);

            // check the attribute values upon creation:
            /*   if (pck.status().ok)
                   console.error('status:', pck.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(675); // Invalid hasClass type
            
        /*    const result = pkg.get() as IAPackage;
            
            expect(result.ok).toBe(false);
            expect(result.status).toBe(675);
            expect(result.statusText).toContain('hasSourceLink[0].hasClass');
            expect(result.statusText).toContain('o:Property_Status');
            expect(result.statusText).toContain('expected pig:Link, found pig:Property'); */
        });
    });
});
