/*!
 * JEST Test Suite for PIG Package getHTML() Method
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { APackage } from '../../src/utils/schemas/pig/ts/pig-metaclasses';

describe('PIG Package getHTML() Method', () => {
    describe('Valid Package with Single Entity', () => {
        test('should return array of HTML strings with package metadata and entity', () => {
            const validPackageWithEntity = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-package-html',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:title': [
                    { '@value': 'Test Package', '@language': 'en' }
                ],
                'dcterms:description': [
                    { '@value': 'A test package for HTML generation', '@language': 'en' }
                ],
                'dcterms:modified': '2025-01-30T10:00:00Z',
                'dcterms:creator': 'Test Creator',
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
                        '@id': 'o:Entity_Requirement',
                        'pig:specializes': 'pig:Entity',
                        'pig:itemType': { '@id': 'pig:Entity' },
                        'dcterms:title': [
                            { '@value': 'Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-001',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-30T10:00:00Z',
                        'dcterms:creator': 'John Doe',
                        'dcterms:title': [
                            { '@value': 'System shall be secure', '@language': 'en' }
                        ],
                        'dcterms:description': [
                            { '@value': 'The system must implement security measures', '@language': 'en' }
                        ],
                        'o:Property_Status': [
                            {
                                'pig:itemType': { '@id': 'pig:aProperty' },
                                '@value': 'Draft'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(validPackageWithEntity);
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();

            // Should return an array
            expect(Array.isArray(htmlList)).toBe(true);

            // Should have 2 elements: package metadata + 1 entity
            expect(htmlList.length).toBe(2);

            // First element: Package metadata
            const packageHTML = htmlList[0];
            expect(typeof packageHTML).toBe('string');
            expect(packageHTML).toContain('pig-package-metadata');
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
            expect(entityHTML).toContain('pig-entity');
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
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/'
                },
                '@id': 'd:package-no-entities',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:title': [
                    { '@value': 'Empty Package', '@language': 'en' }
                ],
                'dcterms:modified': '2025-01-30T10:00:00Z',
                '@graph': [
                    {
                        '@id': 'o:Property_Name',
                        'pig:specializes': 'pig:Property',
                        'pig:itemType': { '@id': 'pig:Property' },
                        'dcterms:title': [
                            { '@value': 'Name', '@language': 'en' }
                        ],
                        'sh:datatype': { '@id': 'xs:string' }
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithoutEntities);
            
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
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:package-mixed',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:title': [
                    { '@value': 'Mixed Package', '@language': 'en' }
                ],
                'dcterms:modified': '2025-01-30T10:00:00Z',
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
                        '@id': 'o:Relationship_Trace',
                        'pig:specializes': 'pig:Relationship',
                        'pig:itemType': { '@id': 'pig:Relationship' },
                        'dcterms:title': [
                            { '@value': 'Trace', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-002',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-30T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Test Entity', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithMixedItems);
            
            expect(pkg.status().ok).toBe(true);

            const htmlList = pkg.getHTML();

            // Package metadata + 1 entity (ignoring Property, Link, Entity class, Relationship)
            expect(htmlList.length).toBe(2);
            
            expect(htmlList[0]).toContain('Mixed Package');
            expect(htmlList[1]).toContain('d:REQ-002');
            expect(htmlList[1]).toContain('Test Entity');
        });
    });

    describe('Invalid Package', () => {
        test('should return error HTML for invalid package', () => {
            const invalidPackage = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/'
                },
                '@id': 'd:invalid-package',
                'pig:itemType': { '@id': 'pig:aPackage' },
                '@graph': [] // Empty graph - invalid!
            };

            const pkg = new APackage().setJSONLD(invalidPackage);
            
            expect(pkg.status().ok).toBe(false);

            const htmlList = pkg.getHTML();

            expect(htmlList.length).toBe(1);
            expect(htmlList[0]).toContain('pig-error');
            expect(htmlList[0]).toContain('Invalid package');
        });
    });

    describe('Multiple Entities', () => {
        test('should return HTML for all entities in package', () => {
            const packageWithMultipleEntities = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:package-multiple',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:title': [
                    { '@value': 'Multi-Entity Package', '@language': 'en' }
                ],
                'dcterms:modified': '2025-01-30T10:00:00Z',
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
                        '@id': 'd:REQ-001',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-01-30T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'First Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-002',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.1',
                        'dcterms:modified': '2025-01-30T11:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Second Requirement', '@language': 'en' }
                        ]
                    },
                    {
                        '@id': 'd:REQ-003',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '2.0',
                        'dcterms:modified': '2025-01-30T12:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Third Requirement', '@language': 'en' }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(packageWithMultipleEntities);
            
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
