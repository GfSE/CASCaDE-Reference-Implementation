/*!
 * JEST Test Suite for PIG Package Constraint Validation
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { DEF } from '../../src/common/lib/definitions';
import { APackage } from '../../src/common/schema/pig/ts/pig-metaclasses';
import { ConstraintCheckType } from '../../src/common/schema/pig/ts/pig-package-constraints';

describe('PIG Package Constraint Validation', () => {
    describe('Positive Tests - Valid Packages', () => {
        test('should validate minimal valid package', () => {
            const validPackageJsonLd = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-001',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        "@id": `${DEF.pfxNsMeta}Property`,
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Property"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
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
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        "@id": `${DEF.pfxNsMeta}Link`,
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            {
                                "@id": `${DEF.pfxNsMeta}Entity`
                            },
                            {
                                "@id": `${DEF.pfxNsMeta}Relationship`
                            }
                        ],
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "linked with"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "Connects a reified relationship with its source or target. Also connects an organizer to a model element"
                            }
                        ]
                    },
                    {
                        '@id': 'o:Link_RefersTo',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Refers To', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        "@id": `${DEF.pfxNsMeta}Entity`,
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}itemType`]: { "@id": `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Entity"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "A PIG meta-model element used for entities (aka resources or artifacts)."
                            }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-001-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Test Requirement', '@language': 'en' }
                        ],
                        'o:Property_Status': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                '@value': 'Draft'
                            }
                        ],
                        'o:Link_RefersTo': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` },
                                '@id': 'd:REQ-002'
                            }
                        ]
                    },
                    {
                        '@id': 'd:REQ-002-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Another Requirement', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(validPackageJsonLd);  // all constraint checks
            if (!pkg.status().ok)
                console.error('pkg:', JSON.stringify(pkg, null, 2)); 
            expect(pkg.status().ok).toBe(true);

            const items = pkg.getItems();
            expect(items.length).toBe(9);
        });

        test('should validate package with relationship containing source and target links', () => {
            const packageWithRelationship = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-002',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        "@id": `${DEF.pfxNsMeta}Property`,
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Property"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
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
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Property`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Rationale', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        "@id": `${DEF.pfxNsMeta}Link`,
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            {
                                "@id": `${DEF.pfxNsMeta}Entity`
                            },
                            {
                                "@id": `${DEF.pfxNsMeta}Relationship`
                            }
                        ],
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "linked with"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "Connects a reified relationship with its source or target. Also connects an organizer to a model element"
                            }
                        ]
                    },
                    {
                        '@id': 'o:Link_Source',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        "@id": `${DEF.pfxNsMeta}Entity`,
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Entity"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "A PIG meta-model element used for entities (aka resources or artifacts)."
                            }
                        ]
                    },
                    {
                        "@id": `${DEF.pfxNsMeta}Relationship`,
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            {
                                "@value": "Relationship"
                            }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            {
                                "@value": "A PIG meta-model element used for reified relationships (aka predicates)."
                            }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Trace',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Relationship`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-003-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-004-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:TRACE-001-ok',
                        '@type': 'o:Relationship_Trace',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Trace Link', '@language': 'en' }
                        ],
                        'o:Property_Rationale': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                '@value': 'Decomposition'
                            }
                        ],
                        'o:Link_Source': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aSourceLink` },
                                '@id': 'd:REQ-003-ok'
                            }
                        ],
                        'o:Link_Target': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` },
                                '@id': 'd:REQ-004-ok'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithRelationship);
            if (!pkg.status().ok)
                console.error('pkg:', JSON.stringify(pkg,null,2)); 
            expect(pkg.status().ok).toBe(true);

            const items = pkg.getItems();
            expect(items.length).toBe(13);
        });
    });

    describe('Negative Tests - Duplicate IDs', () => {
        test('should reject package with items having duplicate IDs', () => {
            const packageWithDuplicateIds = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-duplicate-id',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Property`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Entity_duplicateId_nok',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_duplicateId_nok', // ❌ Duplicate ID
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Another Entity', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithDuplicateIds,[ConstraintCheckType.UniqueIds]);

            // check the attribute values upon creation:
         /*   if (!pkg.status().ok)
                console.error('status:', pkg.status()); */
            
            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (673)
            expect(status.statusText).toContain('671'); // Duplicate ID error code
            expect(status.statusText).toContain('o:Entity_duplicateId_nok');
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(671); // Duplicate ID error code
            expect(rsp.statusText).toContain('duplicate ID');
            expect(rsp.statusText).toContain('o:Entity_Requirement'); */
        });

        test('should reject package with an item missing ID', () => {
            const packageWithMissingId = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-missing-id',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Property`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        // ❌ Missing @id
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Entity Without ID', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithMissingId);

            // check the attribute values upon creation:
            /*   if (!pkg.status().ok)
                   console.error('status:', pkg.status()); */
            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(603); // Error code for one or more failed item instantiations
        });
    });

    describe('Negative Tests - Invalid aProperty References', () => {
        test('should reject aProperty referencing non-existent class', () => {
            const packageWithInvalidPropertyRef = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-invalid-prop',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-with-NonExistent-Property',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Test Requirement with property having an invalid class', '@language': 'en' }
                        ],
                        'o:Property_NonExistent': [ // ❌ References non-existent Property
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                '@value': 'Some Value'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithInvalidPropertyRef);

            // check the attribute values upon creation:
            /*   if (!pkg.status().ok)
                   console.error('status:', pkg.status()); */

            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (673)
            expect(status.statusText).toContain('673'); // Invalid hasClass reference
            expect(status.statusText).toContain('o:Property_NonExistent');
            
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
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-type',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Link_RefersTo', // This is a Link, not a Property!
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Refers To', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-with-wrong-Property-class',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Test Requirement', '@language': 'en' }
                        ],
                        'o:Link_RefersTo': [ // ❌ Used as Property but it's a Link!
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                '@value': 'Wrong Property class'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongTypeRef);

            // check the attribute values upon creation:
            /*   if (!pkg.status().ok)
                   console.error('status:', pkg.status()); */

            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (673)
            expect(status.statusText).toContain('673'); // Invalid hasClass reference
            expect(status.statusText).toContain('expected cas:Property, found cas:Link');
            // @ToDo: Change error message to show the name of the property instead of its index ... and then:
            // expect(status.statusText).toContain('o:Link_RefersTo');

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
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-invalid-link',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': `${DEF.pfxNsMeta}Entity`,
                        '@type': 'owl:class',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Entity', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': `${DEF.pfxNsSemi}Organizer`,
                        '@type': 'owl:Class',
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Organizer', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Folder',
                        '@type': 'owl:Class',
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsSemi}Organizer`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Folder', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:Folder-with-link-having-invalid-class',
                        '@type': 'o:Entity_Folder',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Test Folder with a target link having an invalid (missing) class', '@language': 'en' }
                        ],
                        'o:Link_NonExistent': [ // ❌ References non-existent Link
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` },
                                '@id': 'd:REQ-005-ok'
                            }
                        ]
                    },
                    {
                        '@id': 'd:REQ-005-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target Requirement', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithInvalidLinkRef);

            // check the attribute values upon creation:
            /*   if (!pkg.status().ok)
                   console.error('status:', pkg.status()); */
            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (673)
            expect(status.statusText).toContain('673');
            expect(status.statusText).toContain('o:Link_NonExistent');
            
        /*    const rsp = pkg.get() as IAPackage;
            
            expect(rsp.ok).toBe(false);
            expect(rsp.status).toBe(673); // Invalid link hasClass reference
            expect(rsp.statusText).toContain('hasTargetLink[0].hasClass');
            expect(rsp.statusText).toContain('o:Link_NonExistent');
            expect(rsp.statusText).toContain('not found in package'); */
        });

        test('should reject aSourceLink referencing wrong type (Property instead of Link)', () => {
            const packageWithWrongLinkType = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-link-type',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Rationale',
                        '@type': "owl:DatatypeProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Property`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Rationale', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_Source',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'o:Entity_Requirement' }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Refinement',
                        '@type': `${DEF.pfxNsMeta}Relationship`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'refines', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': 'owl:Class',
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-006-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-007-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:TRACE-wrong-SourceLink-class-nok',
                        '@type': 'o:Relationship_Trace',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Trace Link', '@language': 'en' }
                        ],
                        'o:Property_Rationale': [ // ❌ Used as Link but it's a Property!
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aSourceLink` },
                                '@id': 'd:REQ-003-ok'
                            }
                        ],
                        'o:Link_Target': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` },
                                '@id': 'd:REQ-004-ok'
                            }
                        ]
                    }
                ]
            };
 
            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongLinkType);

            // check the attribute values upon creation:
            /*   if (!pkg.status().ok)
                   console.error('status:', pkg.status()); */
            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (673)
            expect(status.statusText).toContain('673');
            expect(status.statusText).toContain('o:Property_Rationale');

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
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-missing-entity-class',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-invalid-class-nok',
                        // ❌ Missing @type (which maps to hasClass)
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Entity without class', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithMissingEntityClass);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(603); // Not all item instantiations succeeded
        });

        test('should reject anEntity with hasClass pointing to non-existent Entity', () => {
            const packageWithInvalidEntityClass = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-invalid-entity-class',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-nonexistent-class-nok',
                        '@type': 'o:Entity_NonExistent', // ❌ References non-existent Entity class
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Entity with invalid class', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithInvalidEntityClass);

            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (675)
            expect(status.statusText).toContain('675'); // Invalid hasClass reference (not found)
            expect(status.statusText).toContain('d:REQ-nonexistent-class-nok');
        });

        test('should reject anEntity with hasClass pointing to wrong type (Property instead of Entity)', () => {
            const packageWithWrongEntityClassType = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-entity-class-type',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        '@type': "owl:DataTypeProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Property`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'd:REQ-wrong-class-type-nok',
                        '@type': 'o:Property_Status', // ❌ References Property instead of Entity
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Entity with Property as class', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongEntityClassType);

            const status = pkg.status();
            expect(status.ok).toBe(false);
            expect(status.status).toBe(603); // Incomplete item instantiation

            // statusText should indicate that the hasClass reference is invalid (673)
            expect(status.statusText).toContain('675');
            expect(status.statusText).toContain('d:REQ-wrong-class-type-nok');
        });

        test('should reject aRelationship with missing hasClass reference', () => {
            const packageWithMissingRelClass = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-missing-rel-class',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Link_Source',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Trace',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Relationship`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-008-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REL-missing-class-nok',
                        // ❌ Missing @type (which maps to hasClass)
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Relationship without class', '@language': 'en' }
                        ],
                        'o:Link_Source': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aSourceLink` },
                                '@id': 'd:REQ-008-ok'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithMissingRelClass);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(603); // Not all item instantiations succeeded
        });

        test('should reject aRelationship with hasClass pointing to wrong type (Link instead of Relationship)', () => {
            const packageWithWrongRelClassType = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-wrong-rel-class-type',
                '@type': `${DEF.pfxNsMeta}Package`,
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Link_Source',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Link_Target',
                        '@type': "owl:ObjectProperty",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Link`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Target', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Trace',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Relationship`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        '@type': "owl:Class",
                        [`${DEF.pfxNsMeta}specializes`]: `${DEF.pfxNsMeta}Entity`,
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-009-ok',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Source Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REL-wrong-class-type-nok',
                        '@type': 'o:Link_Source', // ❌ References Link instead of Relationship
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Relationship with Link as class', '@language': 'en' }
                        ],
                        'o:Link_Source': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aSourceLink` },
                                '@id': 'd:REQ-009-ok'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage();
            pkg.setJSONLD(packageWithWrongRelClassType);

            expect(pkg.status().ok).toBe(false);
            expect(pkg.status().status).toBe(603); // Not all item instantiations succeeded
        });
    });

    describe('Enumerated Arrays: undefined vs empty [] semantics', () => {
        /**
         * Test semantics:
         * - undefined = wildcard, all items allowed
         * - [] = explicit restriction, no items allowed
         * - [...] = only listed items allowed
         */

        describe('enumeratedProperty', () => {
            test('POSITIVE: undefined enumeratedProperty allows any property', () => {
                const packageData = {
                    '@context': {
                        [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                        'dcterms': 'http://purl.org/dc/terms/',
                        'sh': 'http://www.w3.org/ns/shacl#',
                        'o': 'https://example.org/ontology/',
                        'd': 'https://example.org/data/'
                    },
                    '@id': 'd:test-enumerated-undefined',
                    '@type': `${DEF.pfxNsMeta}Package`,
                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                    [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                    '@graph': [
                        {
                            '@id': 'o:Property_Status',
                            '@type': "owl:DatatypeProperty",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Status' }],
                            'sh:datatype': { '@id': 'xs:string' }
                        },
                        {
                            '@id': 'o:Entity_Requirement',
                            '@type': "owl:Class",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                            // ✅ enumeratedProperty is undefined (not present) = all properties allowed
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Requirement' }]
                        },
                        {
                            '@id': 'd:REQ-001',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Test' }],
                            // ✅ Using o:Property_Status even though enumeratedProperty is undefined
                            'o:Property_Status': [
                                {
                                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                    '@value': 'Draft'
                                }
                            ]
                        }
                    ]
                };

                const pkg = new APackage().setJSONLD(packageData);
                expect(pkg.status().ok).toBe(true);
            });

            test('NEGATIVE: empty [] enumeratedProperty rejects any property', () => {
                const packageData = {
                    '@context': {
                        [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                        'dcterms': 'http://purl.org/dc/terms/',
                        'sh': 'http://www.w3.org/ns/shacl#',
                        'o': 'https://example.org/ontology/',
                        'd': 'https://example.org/data/'
                    },
                    '@id': 'd:test-enumerated-empty',
                    '@type': `${DEF.pfxNsMeta}Package`,
                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                    [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                    '@graph': [
                        {
                            '@id': 'o:Property_Status',
                            '@type': "owl:DatatypeProperty",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Status' }],
                            'sh:datatype': { '@id': 'xs:string' }
                        },
                        {
                            '@id': 'o:Entity_Requirement',
                            '@type': "owl:Class",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                            // ❌ enumeratedProperty is [] = no properties allowed
                            [`${DEF.pfxNsMeta}enumeratedProperty`]: [],
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Requirement' }]
                        },
                        {
                            '@id': 'd:REQ-002',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Test' }],
                            // ❌ Using o:Property_Status but enumeratedProperty is []
                            'o:Property_Status': [
                                {
                                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                    '@value': 'Draft'
                                }
                            ]
                        }
                    ]
                };

                const pkg = new APackage().setJSONLD(packageData, { constraintChecks: [ConstraintCheckType.enumeratedProperties] });
                const st = pkg.status();
                expect(st.ok).toBe(false);
                // console.log('Status:', st);
                expect(st.status).toBe(603);
                expect(st.statusText).toContain('(676)'); // Link not in enumerated list of its class
            });

            test('POSITIVE: empty [] enumeratedProperty allows entity with no properties', () => {
                const packageData = {
                    '@context': {
                        [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                        'dcterms': 'http://purl.org/dc/terms/',
                        'o': 'https://example.org/ontology/',
                        'd': 'https://example.org/data/'
                    },
                    '@id': 'd:test-enumerated-empty-ok',
                    '@type': `${DEF.pfxNsMeta}Package`,
                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                    [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                    '@graph': [
                        {
                            '@id': 'o:Entity_Requirement',
                            '@type': "owl:Class",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                            // ✅ enumeratedProperty is [] = no properties allowed
                            [`${DEF.pfxNsMeta}enumeratedProperty`]: [],
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Requirement' }]
                        },
                        {
                            '@id': 'd:REQ-003',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Test' }]
                            // ✅ No properties used, consistent with enumeratedProperty: []
                        }
                    ]
                };

                const pkg = new APackage().setJSONLD(packageData);
                expect(pkg.status().ok).toBe(true);
            });
        });

        describe('enumeratedTargetLink', () => {
            test('POSITIVE: undefined enumeratedTargetLink allows any link', () => {
                const packageData = {
                    '@context': {
                        [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                        'dcterms': 'http://purl.org/dc/terms/',
                        'o': 'https://example.org/ontology/',
                        'd': 'https://example.org/data/'
                    },
                    '@id': 'd:test-link-undefined',
                    '@type': `${DEF.pfxNsMeta}Package`,
                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                    [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                    '@graph': [
                        {
                            '@id': 'o:Link_RefersTo',
                            '@type': "owl:ObjectProperty",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                            [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                                { '@id': `${DEF.pfxNsMeta}Entity` }
                            ],
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Refers To' }]
                        },
                        {
                            '@id': 'o:Entity_Requirement',
                            '@type': "owl:Class",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                            // ✅ enumeratedTargetLink is undefined = all links allowed
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Requirement' }]
                        },
                        {
                            '@id': 'd:REQ-004',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Source' }]
                        },
                        {
                            '@id': 'd:REQ-005',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Target' }],
                            // ✅ Using link even though enumeratedTargetLink is undefined
                            'o:Link_RefersTo': [
                                {
                                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` },
                                    '@id': 'd:REQ-004'
                                }
                            ]
                        }
                    ]
                };

                const pkg = new APackage().setJSONLD(packageData);
                expect(pkg.status().ok).toBe(true);
            });

            test('NEGATIVE: empty [] enumeratedTargetLink rejects any link', () => {
                const packageData = {
                    '@context': {
                        [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                        'dcterms': 'http://purl.org/dc/terms/',
                        'o': 'https://example.org/ontology/',
                        'd': 'https://example.org/data/'
                    },
                    '@id': 'd:test-link-empty',
                    '@type': `${DEF.pfxNsMeta}Package`,
                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                    [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                    '@graph': [
                        {
                            '@id': 'o:Link_RefersTo',
                            '@type': "owl:ObjectProperty",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                            [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                                { '@id': `${DEF.pfxNsMeta}Entity` }
                            ],
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Refers To' }]
                        },
                        {
                            '@id': 'o:Entity_Requirement',
                            '@type': "owl:Class",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                            // ❌ enumeratedTargetLink is [] = no links allowed
                            [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [],
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Requirement' }]
                        },
                        {
                            '@id': 'd:REQ-006',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Source' }]
                        },
                        {
                            '@id': 'd:REQ-007',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Target' }],
                            // ❌ Using link but enumeratedTargetLink is []
                            'o:Link_RefersTo': [
                                {
                                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` },
                                    '@id': 'd:REQ-006'
                                }
                            ]
                        }
                    ]
                };

                const pkg = new APackage().setJSONLD(packageData, { constraintChecks: [ConstraintCheckType.enumeratedLinks] });
                const st = pkg.status();
                expect(st.ok).toBe(false);
                // console.log('Status:', st);
                expect(st.status).toBe(603);
                expect(st.statusText).toContain('(676)'); // Link not in enumerated list of its class
            });

            test('POSITIVE: empty [] enumeratedTargetLink allows entity with no links', () => {
                const packageData = {
                    '@context': {
                        [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                        'dcterms': 'http://purl.org/dc/terms/',
                        'o': 'https://example.org/ontology/',
                        'd': 'https://example.org/data/'
                    },
                    '@id': 'd:test-link-empty-ok',
                    '@type': `${DEF.pfxNsMeta}Package`,
                    [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                    [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                    '@graph': [
                        {
                            '@id': 'o:Entity_Requirement',
                            '@type': "owl:Class",
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                            // ✅ enumeratedTargetLink is [] = no links allowed
                            [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [],
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Requirement' }]
                        },
                        {
                            '@id': 'd:REQ-008',
                            '@type': 'o:Entity_Requirement',
                            [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                            [`${DEF.pfxNsDcmi}modified`]: '2025-01-16T10:00:00Z',
                            [`${DEF.pfxNsDcmi}title`]: [{ '@value': 'Test' }]
                            // ✅ No links used, consistent with enumeratedTargetLink: []
                        }
                    ]
                };

                const pkg = new APackage().setJSONLD(packageData);
                expect(pkg.status().ok).toBe(true);
            });
        });
    });
});
