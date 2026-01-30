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
                        'pig:specializes': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_RefersTo',
                        'pig:specializes': 'pig:Link',
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
                        'pig:specializes': 'pig:Entity',
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

            const pkg = new APackage().setJSONLD(validPackageJsonLd);
            const items = pkg.getAllItems();
            
            expect(pkg.status().ok).toBe(true);
            expect(items.length).toBe(6);

            const rsp = checkConstraintsForPackage(pkg.get() as IAPackage);
            
            expect(rsp.ok).toBe(true);
            expect(rsp.status).toBe(0);
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
                        'pig:specializes': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Rationale', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_Source',
                        'pig:specializes': 'pig:Link',
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
                        'pig:specializes': 'pig:Link',
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
                        'pig:specializes': 'pig:Relationship',
                        'pig:itemType': { '@id': 'pig:Relationship' },
                        'dcterms:title': [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        'pig:specializes': 'pig:Entity',
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

            const pkg = new APackage().setJSONLD(packageWithRelationship);
            const items = pkg.getAllItems();
            
            expect(pkg.status().ok).toBe(true);
            expect(items.length).toBe(9);

            const rsp = checkConstraintsForPackage(pkg.get() as IAPackage);
            
            expect(rsp.ok).toBe(true);
            expect(rsp.status).toBe(0);
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
                        'pig:specializes': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Entity_duplicateId_nok',
                        'pig:specializes': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_duplicateId_nok', // ❌ Duplicate ID
                        'pig:specializes': 'pig:Entity',
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
            
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(671); // Duplicate ID error code
            expect(rsp.statusText).toContain('duplicate ID');
            expect(rsp.statusText).toContain('o:Entity_Requirement'); */
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
                        'pig:specializes': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        // ❌ Missing @id
                        'pig:specializes': 'pig:Entity',
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
            expect(pkg.status().status).toBe(679); // Error code for one or more failed item instantiations
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
                        'pig:specializes': 'pig:Entity',
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
            
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(673); // Invalid hasClass reference
            expect(rsp.statusText).toContain('hasProperty[0].hasClass');
            expect(rsp.statusText).toContain('o:Property_NonExistent');
            expect(rsp.statusText).toContain('not found in package'); */
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
                        'pig:specializes': 'pig:Link',
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
                        'pig:specializes': 'pig:Entity',
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
            
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(673);
            expect(rsp.statusText).toContain('hasProperty[0].hasClass');
            expect(rsp.statusText).toContain('o:Link_RefersTo');
            expect(rsp.statusText).toContain('expected pig:Property, found pig:Link'); */
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
            
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(675); // Invalid link hasClass reference
            expect(rsp.statusText).toContain('hasTargetLink[0].hasClass');
            expect(rsp.statusText).toContain('o:Link_NonExistent');
            expect(rsp.statusText).toContain('not found in package'); */
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
                        'pig:specializes': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Rationale', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_Source',
                        'pig:specializes': 'pig:Link',
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
                        'pig:specializes': 'pig:Link',
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
                        'pig:specializes': 'pig:Entity',
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
            
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(675);
            expect(rsp.statusText).toContain('hasSourceLink[0].hasClass');
            expect(rsp.statusText).toContain('o:Property_Status');
            expect(rsp.statusText).toContain('expected pig:Link, found pig:Property'); */
        });
    });
});
