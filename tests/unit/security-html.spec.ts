/*!
 * JEST Test Suite for HTML Security - XSS Prevention
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import { APackage, AnEntity } from '../../src/utils/schemas/pig/ts/pig-metaclasses';

describe('HTML Security - XSS Prevention', () => {
    describe('Script Injection and Event Handler Prevention', () => {
        test('should remove onHover event and embedded script from description', () => {
            const maliciousPackageJsonLd = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-xss-security',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-02-04T10:00:00Z',
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
                        '@id': 'd:REQ-XSS-001',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-02-04T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Malicious Requirement', '@language': 'en' }
                        ],
                        'dcterms:description': [
                            {
                                '@value': '<div onmouseover="alert(\'XSS Attack!\')">Hover over me!</div><script>console.log("Injected script");</script><p>Normal text content</p>',
                                '@language': 'en'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(maliciousPackageJsonLd, {check: []}); // no constraint checks, here
            if (!pkg.status().ok)
                console.error('status:', pkg.status());
            expect(pkg.status().ok).toBe(true);

            const items = pkg.getAllItems();
            const entityItem = items.find(item => item.id === 'd:REQ-XSS-001');
            
            expect(entityItem).toBeDefined();
            expect(entityItem?.itemType).toBe('pig:anEntity');

            const entity = entityItem as AnEntity;
            const htmlOutput = entity.getHTML();

            // Verify that dangerous content is removed/sanitized
            expect(htmlOutput).toBeDefined();
            expect(htmlOutput).not.toContain('onmouseover');
            expect(htmlOutput).not.toContain('alert');
            expect(htmlOutput).not.toContain('<script>');
            expect(htmlOutput).not.toContain('</script>');
            expect(htmlOutput).not.toContain('console.log');
            expect(htmlOutput).not.toContain('Injected script');

            // Verify that legitimate content is preserved
            expect(htmlOutput).toContain('Hover over me!');
            expect(htmlOutput).toContain('Normal text content');
        });

        test('should sanitize XSS vectors while preserving legitimate object tags', () => {
            const mixedContentPackage = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-mixed-content',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-02-04T10:00:00Z',
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
                        '@id': 'd:REQ-MIXED-CONTENT',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-02-04T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Mixed Content Test', '@language': 'en' }
                        ],
                        'dcterms:description': [
                            {
                                '@value': '<img src="x" onerror="alert(\'XSS\')"><a href="javascript:void(0)" onclick="malicious()">Click me</a><iframe src="evil.com"></iframe><object data="image.png" type="image/png">Valid image</object><object data="video.mp4" type="video/mp4">Valid video</object>',
                                '@language': 'en'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(mixedContentPackage, { check: [] }); // no constraint checks, here
            if (!pkg.status().ok)
                console.error('status:', pkg.status());
            expect(pkg.status().ok).toBe(true);

            const items = pkg.getAllItems();
            const entity = items.find(item => item.id === 'd:REQ-MIXED-CONTENT') as AnEntity;
            
            expect(entity).toBeDefined();

            const htmlOutput = entity.getHTML();

            // Verify XSS vectors are removed
            expect(htmlOutput).not.toContain('onerror');
            expect(htmlOutput).not.toContain('onclick');
            expect(htmlOutput).not.toContain('javascript:');
            expect(htmlOutput).not.toContain('<iframe');
            expect(htmlOutput).not.toContain('</iframe>');
            expect(htmlOutput).not.toContain('malicious()');
            expect(htmlOutput).not.toContain('evil.com');

            // Verify legitimate object tags for media are preserved
            expect(htmlOutput).toContain('<object');
            expect(htmlOutput).toContain('data="image.png"');
            expect(htmlOutput).toContain('type="image/png"');
            expect(htmlOutput).toContain('Valid image');
            expect(htmlOutput).toContain('data="video.mp4"');
            expect(htmlOutput).toContain('type="video/mp4"');
            expect(htmlOutput).toContain('Valid video');
        });

        test('should block malicious object tags with dangerous data sources', () => {
            const maliciousObjectPackage = {
                '@context': {
                    'pig': 'https://product-information-graph.gfse.org/',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'o': 'https://example.org/ontology/',
                    'd': 'https://example.org/data/'
                },
                '@id': 'd:test-malicious-object',
                'pig:itemType': { '@id': 'pig:aPackage' },
                'dcterms:modified': '2025-02-04T10:00:00Z',
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
                        '@id': 'd:REQ-MALICIOUS-OBJ',
                        '@type': 'o:Entity_Requirement',
                        'pig:itemType': { '@id': 'pig:anEntity' },
                        'pig:revision': '1.0',
                        'dcterms:modified': '2025-02-04T10:00:00Z',
                        'dcterms:title': [
                            { '@value': 'Malicious Object Test', '@language': 'en' }
                        ],
                        'dcterms:description': [
                            {
                                '@value': '<object data="malware.swf" type="application/x-shockwave-flash"></object><object data="exploit.pdf" type="application/pdf"></object><object data="safe-image.jpg" type="image/jpeg">Safe image</object>',
                                '@language': 'en'
                            }
                        ]
                    }
                ]
            };

            const pkg = new APackage().setJSONLD(maliciousObjectPackage, { check: [] }); // no constraint checks, here
            if (!pkg.status().ok)
                console.error('status:', pkg.status());
            expect(pkg.status().ok).toBe(true);

            const items = pkg.getAllItems();
            const entity = items.find(item => item.id === 'd:REQ-MALICIOUS-OBJ') as AnEntity;
            
            expect(entity).toBeDefined();

            const htmlOutput = entity.getHTML();

            // Verify dangerous object types are removed
            expect(htmlOutput).not.toContain('application/x-shockwave-flash');
            expect(htmlOutput).not.toContain('malware.swf');
            expect(htmlOutput).not.toContain('application/pdf'); // Optional: PDF might be blocked
            expect(htmlOutput).not.toContain('exploit.pdf');

            // Verify safe media types are preserved
            expect(htmlOutput).toContain('safe-image.jpg');
            expect(htmlOutput).toContain('image/jpeg');
            expect(htmlOutput).toContain('Safe image');
        });
    });
});
