/*!
 * Unit tests for PIG metaclasses Turtle (TTL) export
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Note:
 * - The test data is taken from pig-metaclasses-jsonld.spec.ts and imported via setJSONLD(),
 *   then the resulting instances are exported to Turtle via getTTL() and checked for the
 *   expected triples.
 * - Assertions check for the presence of expected Turtle fragments (substrings) rather than
 *   exact whole-string equality, because the exact whitespace/ordering is an implementation
 *   detail that should not make the tests overly brittle.
 */

import { DEF } from '../../src/common/lib/definitions';
import {
    Enumeration, Property, Link, Entity, Relationship,
    AnEntity, ARelationship
} from '../../src/common/schema/pig/ts/pig-metaclasses';
import { getTTL } from '../../src/common/export/ttl/getTTL';

describe('PIG Metaclasses Turtle (TTL) Export', () => {
    // Ensure console flush before test ends
    afterEach(async () => {
        await new Promise(resolve => setImmediate(resolve));
    });

    describe('Property -> getTTL()', () => {
        it(`should export ${DEF.pfxNsDcmi}title property as owl:DatatypeProperty`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsDcmi}title`,
                '@type': 'owl:DatatypeProperty',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Title', '@language': 'en' },
                    { '@value': 'Titel', '@language': 'de' },
                    { '@value': 'Titre', '@language': 'fr' }
                ],
                'sh:datatype': { '@id': 'xs:string' },
                'sh:maxLength': 256
            };

            const prop = new Property().setJSONLD(jsonldInput);
            expect(prop.status().ok).toBe(true);

            const ttl = getTTL(prop);

            expect(ttl).toBeDefined();
            expect(typeof ttl).toBe('string');

            // subject
            expect(ttl).toContain(`${DEF.pfxNsDcmi}title`);
            // rdf:type as owl:DatatypeProperty
            expect(ttl).toContain('a owl:DatatypeProperty');
            // multi-language labels are literals in quotes
            expect(ttl).toContain('"Title"@en');
            expect(ttl).toContain('"Titel"@de');
            expect(ttl).toContain('"Titre"@fr');
        });

        it('should quote numeric SHACL constraints even though Turtle allows unquoted numbers', () => {
            const jsonldInput = {
                '@id': 'o:Volume',
                '@type': 'owl:DatatypeProperty',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Volume' }
                ],
                'sh:datatype': { '@id': 'xs:integer' },
                'sh:minCount': 0,
                'sh:maxCount': 1
            };

            const prop = new Property().setJSONLD(jsonldInput);
            expect(prop.status().ok).toBe(true);

            const ttl = getTTL(prop, { addShapes: true });

            // sh:datatype is a reference, unquoted
            expect(ttl).toContain('sh:datatype xs:integer');
            // sh:minCount / sh:maxCount are numeric literals, but must be quoted
            expect(ttl).toContain('sh:minCount "0"');
            expect(ttl).toContain('sh:maxCount "1"');
        });
    });

    describe('Link -> getTTL()', () => {
        it(`should export ${DEF.pfxNsMeta}Link as owl:ObjectProperty`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}Link`,
                '@type': 'owl:ObjectProperty',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                    { '@id': `${DEF.pfxNsMeta}Entity` },
                    { '@id': `${DEF.pfxNsMeta}Relationship` }
                ],
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'linked with' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'Connects a reified relationship with its source or target. Also connects an organizer to a model element' }
                ]
            };

            const link = new Link().setJSONLD(jsonldInput);
            expect(link.status().ok).toBe(true);

            const ttl = getTTL(link);

            expect(ttl).toContain(`${DEF.pfxNsMeta}Link`);
            expect(ttl).toContain('a owl:ObjectProperty');
            expect(ttl).toContain('rdfs:label "linked with"');
            expect(ttl).toContain('rdfs:range [ owl:unionOf ( cas:Entity cas:Relationship ) ]');
        });
    });

    describe('Enumeration -> getTTL()', () => {
        it('should export SpecIF:Priority enumeratedValues as owl:Class with individuals', () => {
            const jsonldInput = {
                '@id': 'SpecIF:Priority-Enumeration',
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Enumeration` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Enumeration` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Priority', '@language': 'en' }
                ],
                'sh:datatype': { '@id': 'xs:string' },
                [`${DEF.pfxNsMeta}enumeratedValue`]: [
                    {
                        '@id': 'SpecIF:priorityHigh',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'high', '@language': 'en' },
                            { '@value': 'hoch', '@language': 'de' }
                        ]
                    },
                    {
                        '@id': 'SpecIF:priorityMedium',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'medium', '@language': 'en' }
                        ]
                    }
                ]
            };

            const enm = new Enumeration().setJSONLD(jsonldInput);
            expect(enm.status().ok).toBe(true);

            const ttl = getTTL(enm, { addExplicitTypeToAllClasses: true });

            // Enumeration class declaration
            expect(ttl).toContain('SpecIF:Priority-Enumeration');
            expect(ttl).toContain('a owl:Class');
            expect(ttl).toContain('rdfs:subClassOf cas:Enumeration ;');
            expect(ttl).toContain('sh:datatype xs:string');
            // owl:oneOf/anyOf list references the individuals
            expect(ttl).toContain('owl:anyOf (');
            expect(ttl).toContain('SpecIF:priorityHigh');
            expect(ttl).toContain('SpecIF:priorityMedium');
            // individuals are typed as the enumeration class
            expect(ttl).toContain('a SpecIF:Priority-Enumeration');
            // individual labels are literals
            expect(ttl).toContain('rdfs:label "high"@en ,');
            expect(ttl).toContain('"hoch"@de .');
        });
    });

    describe('Entity -> getTTL()', () => {
        it('should export FMC:Actor entity class with icon and enumeratedProperty', () => {
            const jsonldInput = {
                '@id': 'FMC:Actor',
                '@type': 'owl:Class',
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Actor', '@language': 'en' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'An active model element.', '@language': 'en' }
                ],
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                [`${DEF.pfxNsMeta}icon`]: { '@value': '\u25A1' },
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [
                    { '@id': `${DEF.pfxNsMeta}Category` }
                ],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` }
            };

            const entity = new Entity().setJSONLD(jsonldInput);
            expect(entity.status().ok).toBe(true);

            const ttl = getTTL(entity, { addExplicitTypeToAllClasses: true });

            expect(ttl).toContain('FMC:Actor');
            expect(ttl).toContain('a owl:Class');
            expect(ttl).toContain(`rdfs:subClassOf ${DEF.pfxNsMeta}Entity`);
            expect(ttl).toContain(`${DEF.pfxNsMeta}Entity`);
            expect(ttl).toContain('"Actor"@en');
        });
    });

    describe('Relationship -> getTTL()', () => {
        it('should export SpecIF:writes relationship class with source/target links', () => {
            const jsonldInput = {
                '@id': 'SpecIF:writes',
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'writes', '@language': 'en' }
                ],
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                [`${DEF.pfxNsMeta}enumeratedSourceLink`]: [
                    { '@id': 'SpecIF:writes-toSource' }
                ],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [
                    { '@id': 'SpecIF:writes-toTarget' }
                ]
            };

            const rel = new Relationship().setJSONLD(jsonldInput);
            expect(rel.status().ok).toBe(true);

            const ttl = getTTL(rel, { addShapes: true, addExplicitTypeToAllClasses: true });

            expect(ttl).toContain('SpecIF:writes');
            expect(ttl).toContain('a owl:Class');
            expect(ttl).toContain(`rdfs:subClassOf ${DEF.pfxNsMeta}Relationship`);
            expect(ttl).toContain('a sh:NodeShape ;');
            expect(ttl).toContain('sh:targetClass SpecIF:writes ;');
            expect(ttl).toContain('sh:property SpecIF:writes-toSource_shape');
            expect(ttl).toContain('sh:property SpecIF:writes-toTarget_shape');
        });
    });

    describe('AnEntity -> getTTL()', () => {
        it('should export a requirement entity instance with a configurable property', () => {
            const jsonldInput = {
                '@id': 'd:Req-1a8016e2872e78ecadc50feddc00029b',
                '@type': 'IREB:Requirement',
                [`${DEF.pfxNsDcmi}modified`]: '2020-10-17T10:00:00+01:00',
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Data Volume' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': '<p>The data store MUST support a total volume up to 850 GB.</p>' }
                ],
                'SpecIF:Priority': [
                    {
                        '@id': 'SpecIF:priorityHigh',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    }
                ],
                'cas:Category': [
                    {
                        '@value': 'IREB:QualityRequirement',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` }
                    }
                ],
                'd:inBrackets': [
                    {
                        '@value': '( ns:A ns:B )',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` }
                    }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` }
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);
            expect(anEntity.status().ok).toBe(true);

            const ttl = getTTL(anEntity);

            // subject and class (rdf:type is a reference, unquoted)
            expect(ttl).toContain('d:Req-1a8016e2872e78ecadc50feddc00029b');
            expect(ttl).toContain('a IREB:Requirement');
            // title is a literal
            expect(ttl).toContain('rdfs:label "Data Volume"');
            // category is a literal
            expect(ttl).toContain('cas:Category "IREB:QualityRequirement" ;');
            // inBrackets is a literal also, even though it looks like an OWL expression
            expect(ttl).toContain('d:inBrackets "( ns:A ns:B )" ;');
            // dcterms:modified is emitted as a typed literal
            expect(ttl).toContain('dcterms:modified "2020-10-17T10:00:00+01:00"^^xs:dateTime');
            // configurable property referencing the enumerated value 'SpecIF:priorityHigh' is a reference
            expect(ttl).toContain('SpecIF:Priority');
            expect(ttl).toContain('SpecIF:priorityHigh');
        });

        it('should quote a numeric CASCaRA property value as a literal', () => {
            const jsonldInput = {
                '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                '@type': 'FMC:State',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'FiCo-Data' }
                ],
                'o:Volume': [
                    {
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                        '@value': '600'
                    }
                ]
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);
            expect(anEntity.status().ok).toBe(true);

            const ttl = getTTL(anEntity);

            expect(ttl).toContain('d:MEl-50feddc00029b1a8016e2872e78ecadc');
            expect(ttl).toContain('a FMC:State');
            // the numeric property value must be quoted, even though it is numeric
            expect(ttl).toContain('o:Volume "600"');
        });
    });

    describe('ARelationship -> getTTL()', () => {
        it('should export SpecIF:writes relationship instance with source and target links', () => {
            const jsonldInput = {
                '@id': 'd:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                '@type': 'SpecIF:writes',
                [`${DEF.pfxNsDcmi}modified`]: '2020-03-06T09:05:00+01:00',
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': "'FiCo-Application' writes 'FiCo-Data'" }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                'SpecIF:writes-toSource': [
                    {
                        '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aSourceLink` }
                    }
                ],
                'SpecIF:writes-toTarget': [
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    }
                ]
            };

            const aRel = new ARelationship().setJSONLD(jsonldInput);
            expect(aRel.status().ok).toBe(true);

            const ttl = getTTL(aRel);

            expect(ttl).toContain('d:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc');
            expect(ttl).toContain('a SpecIF:writes');
            expect(ttl).toContain('dcterms:modified "2020-03-06T09:05:00+01:00"^^xs:dateTime');
            // source and target links are references (unquoted)
            expect(ttl).toContain('SpecIF:writes-toSource d:MEl-50fbfe8f0029b1a8016ea86245a9d83a');
            expect(ttl).toContain('SpecIF:writes-toTarget d:MEl-50feddc00029b1a8016e2872e78ecadc');
        });
    });
});
