/*!
 * JEST Test Suite for PIG Package getHTML() Method
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { DEF } from '../../src/common/lib/definitions';
import { APackage } from '../../src/common/schema/pig/ts/pig-metaclasses';
import { ConstraintCheckType } from '../../src/common/schema/pig/ts/pig-package-constraints';

describe('PIG Package getHTML() Method', () => {
    describe('Valid Package with Single Entity', () => {
        test('should return array of HTML strings with package metadata and entity', () => {
            const validPackageWithEntity = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-package-html',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Test Package', '@language': 'en' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'A test package for HTML generation', '@language': 'en' }
                ],
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                [`${DEF.pfxNsDcmi}creator`]: 'Test Creator',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-001',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                        [`${DEF.pfxNsDcmi}creator`]: 'John Doe',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'System shall be secure', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            { '@value': 'The system must implement security measures', '@language': 'en' }
                        ],
                        'o:Property_Status': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                '@value': 'Draft'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD( validPackageWithEntity,
                { checkConstraints: [ConstraintCheckType.UniqueIds, ConstraintCheckType.aPropertyHasClass] }
            );
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();
            // console.debug('Generated HTML List:', htmlList);

            // Should return an array
            expect(Array.isArray(htmlList)).toBe(true);

            // Should have 2 elements: package metadata + 1 entity
            expect(htmlList.length).toBe(2);

            // First element: Package metadata
            const packageHTML = htmlList[0];
            expect(typeof packageHTML).toBe('string');
            expect(packageHTML).toContain('meta-aPackage');
            expect(packageHTML).toContain('Test Package');
            expect(packageHTML).toContain('A test package for HTML generation');
            expect(packageHTML).toContain('d:test-package-html');
            expect(packageHTML).toContain('Test Creator');
            expect(packageHTML).toContain('Items in Graph');
            expect(packageHTML).toContain('3'); // 1 Property + 1 Entity + 1 anEntity
            
            // Should NOT contain context
            expect(packageHTML).not.toContain('@context');
            expect(packageHTML).not.toContain('https://product-information-graph.gfse.org/');

            // Second element: Entity HTML
            const entityHTML = htmlList[1];
            expect(typeof entityHTML).toBe('string');
            expect(entityHTML).toContain('meta-anEntity');
            expect(entityHTML).toContain('System shall be secure');
            expect(entityHTML).toContain('The system must implement security measures');
            expect(entityHTML).toContain('d:REQ-001');
            expect(entityHTML).toContain('o:Entity_Requirement');
            expect(entityHTML).toContain('1.0'); // revision
            expect(entityHTML).toContain('John Doe');
            expect(entityHTML).toContain('o:Property_Status');
            expect(entityHTML).toContain('Draft');
        });

        test('should return only package metadata when no entities present', () => {
            const packageWithoutEntities = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/'
                },
                '@id': 'd:package-no-entities',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Empty Package', '@language': 'en' }
                ],
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Name',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Name', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithoutEntities, {checkConstraints: [ConstraintCheckType.UniqueIds, ConstraintCheckType.aPropertyHasClass]});
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();

            // Should have only 1 element (package metadata)
            expect(htmlList.length).toBe(1);
            
            const packageHTML = htmlList[0];
            expect(packageHTML).toContain('Empty Package');
            expect(packageHTML).toContain('Items in Graph');
            expect(packageHTML).toContain('1'); // Only 1 Property
        });

        test('should ignore non-entity items (Property, Link, Relationship)', () => {
            const packageWithMixedItems = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:package-mixed',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Mixed Package', '@language': 'en' }
                ],
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Status',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Status', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    },
                    {
                        '@id': 'o:Link_RefersTo',
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
                        '@id': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'o:Relationship_Trace',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-002',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Test Entity', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithMixedItems, {checkConstraints: [ConstraintCheckType.UniqueIds, ConstraintCheckType.aPropertyHasClass]});
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();
            // console.debug('Generated HTML List for Mixed Package:', htmlList);

            // Package metadata + 1 entity (ignoring Property, Link, Entity class, Relationship)
            expect(htmlList.length).toBe(2);
            
            expect(htmlList[0]).toContain('Mixed Package');
            expect(htmlList[1]).toContain('d:REQ-002');
            expect(htmlList[1]).toContain('Test Entity');
        });
    });

    describe('Package with empty graph', () => {
        test('should be accepted', () => {
            const invalidPackage = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                },
                '@id': 'd:invalid-package',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                '@graph': [] // Empty graph
            };

            const pkg = new APackage().setJSONLD(invalidPackage, {checkConstraints: [ConstraintCheckType.UniqueIds, ConstraintCheckType.aPropertyHasClass]});
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();

            expect(htmlList.length).toBe(1);
        });
    });

    describe('Multiple Entities', () => {
        test('should return HTML for all entities in package', () => {
            const packageWithMultipleEntities = {
                '@context': {
                    [DEF.pfxNsMeta.slice(0, -1)]: 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:package-multiple',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Multi-Entity Package', '@language': 'en' }
                ],
                [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-001',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T10:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'First Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-002',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '1.1',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T11:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Second Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-003',
                        '@type': 'o:Entity_Requirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsMeta}revision`]: '2.0',
                        [`${DEF.pfxNsDcmi}modified`]: '2025-01-30T12:00:00Z',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Third Requirement', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithMultipleEntities, {checkConstraints: [ConstraintCheckType.UniqueIds, ConstraintCheckType.aPropertyHasClass]});
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();

            // 1 package metadata + 3 entities
            expect(htmlList.length).toBe(4);
            
            // Check package metadata
            expect(htmlList[0]).toContain('Multi-Entity Package');
            expect(htmlList[0]).toContain('Items in Graph');
            expect(htmlList[0]).toContain('4'); // 1 Entity class + 3 anEntity instances
            
            // Check entities
            expect(htmlList[1]).toContain('First Requirement');
            expect(htmlList[1]).toContain('d:REQ-001');
            expect(htmlList[1]).toContain('1.0');
            
            expect(htmlList[2]).toContain('Second Requirement');
            expect(htmlList[2]).toContain('d:REQ-002');
            expect(htmlList[2]).toContain('1.1');
            
            expect(htmlList[3]).toContain('Third Requirement');
            expect(htmlList[3]).toContain('d:REQ-003');
            expect(htmlList[3]).toContain('2.0');
        });
    });
});
