/*!
 * JEST Test Suite for PIG Package Constraint Validation
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { APackage } from '../../src/utils/schemas/pig/ts/pig-metaclasses';
import { ConstraintCheckType } from '../../src/utils/schemas/pig/ts/pig-package-constraints';

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
                        "@id": "pig:Property",
                        "@type": "owl:DatatypeProperty",
                        'pig:itemType': { '@id': 'pig:Property' },
                        "dcterms:title": [
                            {
                                "@value": "Property"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "A PIG meta-model element used for properties (aka attributes)."
                            }
                        ],
                        "sh:datatype": {
                            "@id": "xs:anyType"
                        }
                    },
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
                        "@id": "pig:Link",
                        "@type": "owl:ObjectProperty",
                        "pig:itemType": { "@id": "pig:Link" },
                        "pig:eligibleEndpoint": [
                            {
                                "@id": "pig:Entity"
                            },
                            {
                                "@id": "pig:Relationship"
                            }
                        ],
                        "dcterms:title": [
                            {
                                "@value": "linked with"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "Connects a reified relationship with its source or target. Also connects an organizer to a model element"
                            }
                        ]
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
                        "@id": "pig:Entity",
                        "@type": "owl:Class",
                        "pig:itemType": { "@id": "pig:Entity" },
                        "dcterms:title": [
                            {
                                "@value": "Entity"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "A PIG meta-model element used for entities (aka resources or artifacts)."
                            }
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

            const pkg = new APackage().setJSONLD(validPackageJsonLd);  // all constraint checks
            const items = pkg.getItems();
            
            expect(pkg.status().ok).toBe(true);
            expect(items.length).toBe(9);

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
                        "@id": "pig:Property",
                        "@type": "owl:DatatypeProperty",
                        "pig:itemType": {
                            "@id": "pig:Property"
                        },
                        "dcterms:title": [
                            {
                                "@value": "Property"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "A PIG meta-model element used for properties (aka attributes)."
                            }
                        ],
                        "sh:datatype": {
                            "@id": "xs:anyType"
                        }
                    },
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
                        "@id": "pig:Link",
                        "@type": "owl:ObjectProperty",
                        "pig:itemType": {
                            "@id": "pig:Link"
                        },
                        "pig:eligibleEndpoint": [
                            {
                                "@id": "pig:Entity"
                            },
                            {
                                "@id": "pig:Relationship"
                            }
                        ],
                        "dcterms:title": [
                            {
                                "@value": "linked with"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "Connects a reified relationship with its source or target. Also connects an organizer to a model element"
                            }
                        ]
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
                        "@id": "pig:Entity",
                        "@type": "owl:Class",
                        "pig:itemType": {
                            "@id": "pig:Entity"
                        },
                        "dcterms:title": [
                            {
                                "@value": "Entity"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "A PIG meta-model element used for entities (aka resources or artifacts)."
                            }
                        ]
                    },
                    {
                        "@id": "pig:Relationship",
                        "@type": "owl:Class",
                        "pig:itemType": {
                            "@id": "pig:Relationship"
                        },
                        "dcterms:title": [
                            {
                                "@value": "Relationship"
                            }
                        ],
                        "dcterms:description": [
                            {
                                "@value": "A PIG meta-model element used for reified relationships (aka predicates)."
                            }
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
            const items = pkg.getItems();
            
            expect(pkg.status().ok).toBe(true);
            expect(items.length).toBe(13);

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
            pkg.setJSONLD(packageWithDuplicateIds,[ConstraintCheckType.UniqueIds]);

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
            expect(pkg.status().status).toBe(611); // Error code for one or more failed item instantiations
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
    describe('Negative Tests - Invalid Entity and Relationship hasClass References', () => {
        test('should reject anEntity with missing hasClass reference', () => {
            const packageWithMissingEntityClass = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-missing-entity-class',
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
                        '@id': 'd:REQ-invalid-class-nok',
                        // ❌ Missing @type (which maps to hasClass)
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Entity without class', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithMissingEntityClass);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(611); // Not all item instantiations succeeded
        });

        test('should reject anEntity with hasClass pointing to non-existent Entity', () => {
            const packageWithInvalidEntityClass = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-invalid-entity-class',
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
                        '@id': 'd:REQ-nonexistent-class-nok',
                        '@type': 'o:Entity_NonExistent', // ❌ References non-existent Entity class
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Entity with invalid class', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithInvalidEntityClass);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(675); // Invalid hasClass reference (not found)
        });

        test('should reject anEntity with hasClass pointing to wrong type (Property instead of Entity)', () => {
            const packageWithWrongEntityClassType = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-entity-class-type',
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
                        '@id': 'd:REQ-wrong-class-type-nok',
                        '@type': 'o:Property_Status', // ❌ References Property instead of Entity
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Entity with Property as class', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongEntityClassType);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(675); // Invalid hasClass type
        });

        test('should reject aRelationship with missing hasClass reference', () => {
            const packageWithMissingRelClass = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-missing-rel-class',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Link_Source',
                        'pig:specializes': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Source', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        'pig:specializes': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Target', '@language': 'en' }
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
                        '@id': 'd:REQ-008-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REL-missing-class-nok',
                        // ❌ Missing @type (which maps to hasClass)
                        'pig:itemType': { '@id': 'pig:aRelationship' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Relationship without class', '@language': 'en' }
                        ],
                        'o:Link_Source': [
                            {
                                'pig:itemType': { '@id': 'pig:aSourceLink' },
                                '@id': 'd:REQ-008-ok'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithMissingRelClass);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(611); // Not all item instantiations succeeded
        });

        test('should reject aRelationship with hasClass pointing to wrong type (Link instead of Relationship)', () => {
            const packageWithWrongRelClassType = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-rel-class-type',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Link_Source',
                        'pig:specializes': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Source', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        'pig:specializes': 'pig:Link',
                        'pig:itemType': { '@id': 'pig:Link' },
                        'dcterms:title': [
                            { '@value': 'Target', '@language': 'en' }
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
                        '@id': 'd:REQ-009-ok',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REL-wrong-class-type-nok',
                        '@type': 'o:Link_Source', // ❌ References Link instead of Relationship
                        'pig:itemType': { '@id': 'pig:aRelationship' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-16T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Relationship with Link as class', '@language': 'en' }
                        ],
                        'o:Link_Source': [
                            {
                                'pig:itemType': { '@id': 'pig:aSourceLink' },
                                '@id': 'd:REQ-009-ok'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongRelClassType);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(611); // Not all item instantiations succeeded
        });
    });
});
