/*!
 * Unit tests for PIG metaclasses JSON-LD methods
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Note:
 * - a roundtrip test via setJSONLD() and getJSONLD() and enumerated (enumerated) values
 *   is contained in pig-package-constraints-valueRanges.spec.ts
 *
 * ToDo
 * - Some tests are redundant
 * - Test also properties with number, dateTime and anyURI data types
 */

import { DEF } from '../../src/common/lib/definitions';
import {
    Enumeration, Property, Link, Entity, Relationship,
    AnEntity, ARelationship, APackage
} from '../../src/common/schema/pig/ts/pig-metaclasses';
import { getJSONLD } from '../../src/common/export/jsonld/getJSONLD';

describe('PIG Metaclasses JSON-LD Import', () => {
    // Ensure console flush before test ends
    afterEach(async () => {
        await new Promise(resolve => setImmediate(resolve));
    });
/*    // Reliable error logging with synchronous write
    const logResponse = (context: string, response: any) => {
        if (!response.ok) {
            const msg = `\n❌ ${context} FAILED:\n${JSON.stringify(response, null, 2)}\n`;
            process.stderr.write(msg);
        }
    };
*/
    describe('Property.setJSONLD()', () => {
        it(`should import and export ${DEF.pfxNsDcmi}title property`, () => {
            // Attention: There is actually no need for a class defining a title property,
            // because 'title' is a native property.
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
            //    'sh:maxCount': 1,
                'sh:maxLength': 256
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);

            // Get the property data
            const outData = getJSONLD(prop) as any;

        /*    // Debug output - will appear in test output
            process.stderr.write(`\n=== Property Export Test ===\n`);
            process.stderr.write(`Input: ${JSON.stringify(jsonldInput, null, 2)}\n`);
            process.stderr.write(`Output: ${JSON.stringify(outData, null, 2)}\n`);
        */
            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(`${DEF.pfxNsDcmi}title`);
            expect(outData['@type']).toBe('owl:DatatypeProperty');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it(`should import and export ${DEF.pfxNsDcmi}description property`, () => {
            // Attention: There is actually no need for a class defining a description property,
            // because 'description' is a native property.
            const jsonldInput = {
                '@id': `${DEF.pfxNsDcmi}description`,
                '@type': 'owl:DatatypeProperty',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Description', '@language': 'en' },
                    { '@value': 'Beschreibung', '@language': 'de' },
                    { '@value': 'Description', '@language': 'fr' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    {
                        '@value': '<p>An account of the resource. <small>(<i>source: <a href="http://purl.org/dc/elements/1.1/description">DCMI</a></i>)</small></p><p>Descriptive text (reference: Dublin Core) about resource represented as rich text in XHTML content. SHOULD include only content that is valid and suitable inside an XHTML \'div\' element. <small>(<i>source: <a href="http://open-services.net/">OSLC</a></i>)</small></p>',
                        '@language': 'en'
                    }
                ],
                'sh:datatype': { '@id': 'xs:string' },
                'sh:maxCount': 1
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);

            // Get the property data
            const outData = getJSONLD(prop) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(`${DEF.pfxNsDcmi}description`);
            expect(outData['@type']).toBe('owl:DatatypeProperty');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it('should import and export SpecIF:Priority enumeratedValues', () => {
            const jsonldInput = {
                '@id': 'SpecIF:Priority-Enumeration',
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Enumeration` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Enumeration` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Priority', '@language': 'en' },
                    { '@value': 'Priorität', '@language': 'de' },
                    { '@value': 'Priorité', '@language': 'fr' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': "Enumerated values for the 'Priority' of the resource.", '@language': 'en' }
                ],
                'sh:datatype': { '@id': 'xs:string' },
                [`${DEF.pfxNsMeta}enumeratedValue`]: [
                    {
                        '@id': 'SpecIF:priorityHigh',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'high', '@language': 'en' },
                            { '@value': 'hoch', '@language': 'de' },
                            { '@value': 'haut', '@language': 'fr' }
                        ]
                    },
                    {
                        '@id': 'SpecIF:priorityMedium',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'medium', '@language': 'en' },
                            { '@value': 'mittel', '@language': 'de' },
                            { '@value': 'moyen', '@language': 'fr' }
                        ]
                    },
                    {
                        '@id': 'SpecIF:priorityLow',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'low', '@language': 'en' },
                            { '@value': 'niedrig', '@language': 'de' },
                            { '@value': 'bas', '@language': 'fr' }
                        ]
                    }
                ]
            };

            const en = new Enumeration().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!en.status().ok)
                console.error('status:', en.status());
            expect(en.status().ok).toBe(true);

            // Get the property data
            const enumData = en.get();

            // Verify enumeratedValue structure exists
            expect(enumData?.enumeratedValue).toBeDefined();
            expect(Array.isArray(enumData?.enumeratedValue)).toBe(true);
            expect(enumData?.enumeratedValue?.length).toBe(3);

            // Find SpecIF:priorityHigh
            const priorityHigh = enumData?.enumeratedValue?.find((ev: any) => ev.id === 'SpecIF:priorityHigh');
            expect(priorityHigh).toBeDefined();

            // Verify title structure
            expect(priorityHigh?.title).toBeDefined();
            expect(Array.isArray(priorityHigh?.title)).toBe(true);

            // Find German title
            const germanTitle = priorityHigh?.title?.find((t: any) => t.lang === 'de');
            expect(germanTitle).toBeDefined();
            expect(germanTitle?.value).toBe('hoch');

            // Get the property data as JSON-LD
            const outData = getJSONLD(en) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe('SpecIF:Priority-Enumeration');
            expect(outData['@type']).toBe('owl:Class');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it(`should import ${DEF.pfxNsMeta}icon property`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}icon`,
                '@type': 'owl:DatatypeProperty',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'has icon' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'Specifies an icon for a model element (entity or relationship).' }
                ],
                'sh:datatype': { '@id': 'xs:string' },
                'sh:minCount': 0,
                'sh:maxCount': 1
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import SpecIF:Diagram property', () => {
            const jsonldInput = {
                '@id': 'SpecIF:Diagram',
                '@type': 'owl:DatatypeProperty',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Diagram', '@language': 'en' },
                    { '@value': 'Diagramm', '@language': 'de' },
                    { '@value': 'Diagramme', '@language': 'fr' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'A diagram illustrating the resource or a link to a diagram.', '@language': 'en' }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                'sh:datatype': { '@id': 'xs:string' }
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });
    });

    describe('Link.setJSONLD()', () => {
        it(`should import and export ${DEF.pfxNsMeta}Link`, () => {
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

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(link) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(`${DEF.pfxNsMeta}Link`);
            expect(outData['@type']).toBe('owl:ObjectProperty');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it(`should import ${DEF.pfxNsMeta}SourceLink`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}SourceLink`,
                '@type': 'owl:ObjectProperty',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Link` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                    { '@id': `${DEF.pfxNsMeta}Entity` },
                    { '@id': `${DEF.pfxNsMeta}Relationship` }
                ],
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'to source' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'Connects the source of a reified relationship.' }
                ]
            };

            const link = new Link().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import SpecIF:writes-toSource', () => {
            const jsonldInput = {
                '@id': 'SpecIF:writes-toSource',
                '@type': 'owl:ObjectProperty',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}SourceLink` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'SpecIF:writes to source' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'Connects the source of SpecIF:writes' }
                ],
                [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                    { '@id': 'FMC:Actor' }
                ]
            };

            const link = new Link().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}lists`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}lists`,
                '@type': 'owl:ObjectProperty',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}TargetLink` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                    { '@id': `${DEF.pfxNsMeta}Entity` },
                    { '@id': `${DEF.pfxNsMeta}Relationship` },
                    { '@id': `${DEF.pfxNsSemi}Organizer` }
                ],
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'lists' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'Lists an entity, a relationship or a subordinated organizer.' }
                ]
            };

            const link = new Link().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });
    });

    describe('Entity.setJSONLD()', () => {
        it(`should import and export ${DEF.pfxNsMeta}Entity`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}Entity`,
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Entity' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'A PIG meta-model element used for entities (aka resources or artifacts).' }
                ],
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [
                    { '@id': `${DEF.pfxNsMeta}Category` },
                    { '@id': `${DEF.pfxNsMeta}icon` }
                ]
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(entity) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(`${DEF.pfxNsMeta}Entity`);
            expect(outData['@type']).toBe('owl:Class');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it(`should import ${DEF.pfxNsMeta}Root`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}Root`,
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsSemi}Organizer` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Hierarchy Root' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'A subclass of PIG organizer serving as a root for hierarchically organized graph elements.' }
                ],
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [
                    { '@id': `${DEF.pfxNsMeta}lists` }
                ]
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import and export FMC:Actor', () => {
            const jsonldInput = {
                '@id': 'FMC:Actor',
                '@type': 'owl:Class',
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Actor', '@language': 'en' },
                    { '@value': 'Akteur', '@language': 'de' },
                    { '@value': 'Acteur', '@language': 'fr' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    {
                        '@value': "<p>An 'Actor' is a fundamental model element type representing an active entity, be it an activity, a process step, a function, a system component or a role.</p><p>The  particular use or original type is specified with a dcterms:type property of the 'FMC:Actor'. A value of that property should be an ontology-term, such as [[bpmn:processStep]].</p>",
                        '@language': 'en'
                    },
                    {
                        '@value': "<p>Ein 'Akteur' ist ein fundamentaler Modellelementtyp, der eine aktive Entität darstellt, sei es eine Aktivität, ein Prozessschritt, eine Funktion, eine Systemkomponente oder eine Rolle.</p><p>Die spezielle Verwendung oder der ursprüngliche Typ wird mit einer dcterms:type Eigenschaft von 'FMC:Actor' spezifiziert. Die Werte dieser Eigenschaft können Ontologiebegriffe sein, wie z.B. [[bpmn:timer]].</p>",
                        '@language': 'de'
                    },
                    {
                        '@value': "<p>Un 'Acteur' est un type d'élément de modèle fondamental représentant une entité active, qu'il s'agisse d'une activité, d'une étape de processus, d'une fonction, d'un composant de système ou d'un rôle.</p><p>L'utilisation particulière ou le type original est spécifié avec une propriété dcterms:type de 'FMC:Actor'. Les valeurs de cette propriété peuvent être des termes d'ontologie, tels que [[bpmn:timer]].</p>",
                        '@language': 'fr'
                    }
                ],
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                [`${DEF.pfxNsMeta}icon`]: { '@value': '□' },
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [
                    { '@id': `${DEF.pfxNsMeta}Category` }
                ],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` }
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(entity) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe('FMC:Actor');
            expect(outData['@type']).toBe('owl:Class');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it('should import and export IREB:Requirement', () => {
            const jsonldInput = {
                '@id': 'IREB:Requirement',
                '@type': 'owl:Class',
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Requirement', '@language': 'en' },
                    { '@value': 'Anforderung', '@language': 'de' },
                    { '@value': 'Exigence', '@language': 'fr' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    {
                        '@value': "<p>A 'Requirement' is a singular documented physical and functional need that a particular design, product or process must be able to perform. <small>(<i>source: <a href=\"https://en.wikipedia.org/wiki/Requirement\">Wikipedia</a></i>)</small></p><p>Definition:</p><ol><li>A condition or capability needed by a user to solve a problem or achieve an objective.</li><li>A condition or capability that must be met or possessed by a system or system component to satisfy a contract, standard, specification, or other formally imposed documents.</li><li>A documented representation of a condition or capability as in (1) or (2).</li></ol><p>Note: The definition above is the classic one from IEEE Std 610.12 of 1990. Alternatively, we also give a more modern definition:</p><ol><li>A need perceived by a stakeholder.</li><li>A capability or property that a system shall have.</li><li>A documented representation of a need, capability or property.</li></ol>",
                        '@language': 'en'
                    }
                ],
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                [`${DEF.pfxNsMeta}icon`]: { '@value': '↯' },
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [
                    { '@id': 'SpecIF:Priority' }
                ],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` }
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(entity) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe('IREB:Requirement');
            expect(outData['@type']).toBe('owl:Class');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });
    });

    describe('Relationship.setJSONLD()', () => {
        it(`should import and export ${DEF.pfxNsMeta}Relationship`, () => {
            const jsonldInput = {
                '@id': `${DEF.pfxNsMeta}Relationship`,
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Relationship' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': 'A PIG meta-model element used for reified relationships (aka predicates).' }
                ],
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [
                    { '@id': `${DEF.pfxNsMeta}Category` },
                    { '@id': `${DEF.pfxNsMeta}icon` }
                ],
                [`${DEF.pfxNsMeta}enumeratedSourceLink`]: [{ '@id': `${DEF.pfxNsMeta}SourceLink` }],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [{ '@id': `${DEF.pfxNsMeta}TargetLink` }]
            };

            const rel = new Relationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(rel) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(`${DEF.pfxNsMeta}Relationship`);
            expect(outData['@type']).toBe('owl:Class');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it('should import and export SpecIF:writes', () => {
            const jsonldInput = {
                '@id': 'SpecIF:writes',
                '@type': 'owl:Class',
                [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'writes', '@language': 'en' },
                    { '@value': 'schreibt', '@language': 'de' },
                    { '@value': 'écrit', '@language': 'fr' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': "A [[FMC:Actor]] 'writes' (changes) a [[FMC:State]].", '@language': 'en' }
                ],
                [`${DEF.pfxNsMeta}enumeratedProperty`]: [],
                [`${DEF.pfxNsMeta}enumeratedSourceLink`]: [{ '@id': 'SpecIF:writes-toSource' }],
                [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [{ '@id': 'SpecIF:writes-toTarget' }]
            };

            const rel = new Relationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(rel) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe('SpecIF:writes');
            expect(outData['@type']).toBe('owl:Class');

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });
    });

    describe('AnEntity.setJSONLD()', () => {
        it('should import and export requirement entity with property', () => {
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
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` }
                    }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` }
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(anEntity) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(jsonldInput['@id']);
            expect(outData['@type']).toBe(jsonldInput['@type']);

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it('should import and export diagram entity with properties and links', () => {
            const jsonldInput = {
                '@id': 'd:Diagram-aec0df7900010000017001eaf53e8876',
                '@type': `${DEF.pfxNsMeta}View`,
                [`${DEF.pfxNsDcmi}modified`]: '2020-03-06T08:32:00+01:00',
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'IT-Integration: FiCo-Application and FiCo-Data' }
                ],
                'SpecIF:Diagram': [
                    {
                        '@value': '<p class="inline-label">Model Diagram:</p><p><object type="image/svg+xml" data="files_and_images/Very-Simple-Model-FMC.svg">Notation: FMC Block Diagram</object></p>',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` }
                    }
                ],
                [`${DEF.pfxNsMeta}Category`]: [
                    {
                        '@value': 'FMC Block Diagram',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` }
                    }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                [`${DEF.pfxNsMeta}shows`]: [
                    {
                        '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    },
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    },
                    {
                        '@id': 'd:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    },
                    {
                        '@id': 'd:SRea-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    }
                ]
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);

            expect(anEntity.hasProperty?.length).toBe(2);
            expect(anEntity.hasProperty[1].hasClass).toBe(`${DEF.pfxNsMeta}Category`);

            // Get the property data as JSON-LD
            const outData = getJSONLD(anEntity) as any;

            expect(outData).toBeDefined();

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it('should import and export FMC:Actor entity', () => {
            const jsonldInput = {
                '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                '@type': 'FMC:Actor',
                [`${DEF.pfxNsDcmi}modified`]: '2020-03-06T09:04:00+01:00',
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'FiCo-Application' }
                ],
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': '<p>IT-Application for Finance and Controlling.</p>' }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` }
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(anEntity) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(jsonldInput['@id']);
            expect(outData['@type']).toBe(jsonldInput['@type']);

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });
    });

    describe('ARelationship.setJSONLD()', () => {
        it('should import and export SpecIF:writes relationship', () => {
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

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(aRel) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(jsonldInput['@id']);
            expect(outData['@type']).toBe(jsonldInput['@type']);

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });

        it('should import and export oslc_rm:satisfies relationship', () => {
            const jsonldInput = {
                '@id': 'd:Ssat-50feddc00029b1a8016e2872e78ecadc-1a8016e2872e78ecadc50feddc00029b',
                '@type': 'oslc_rm:satisfies',
                [`${DEF.pfxNsDcmi}modified`]: '2020-10-17T10:00:00+01:00',
                [`${DEF.pfxNsDcmi}description`]: [
                    { '@value': "'FiCo-Data' satisfies 'Data Volume'" }
                ],
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                'oslc_rm:satisfies-toSource': [
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aSourceLink` }
                    }
                ],
                'oslc_rm:satisfies-toTarget': [
                    {
                        '@id': 'd:Req-1a8016e2872e78ecadc50feddc00029b',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aTargetLink` }
                    }
                ]
            };

            const aRel = new ARelationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);

            // Get the property data as JSON-LD
            const outData = getJSONLD(aRel) as any;

            expect(outData).toBeDefined();
            expect(outData['@id']).toBe(jsonldInput['@id']);
            expect(outData['@type']).toBe(jsonldInput['@type']);

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });
    });

    describe('APackage.setJSONLD() and getJSONLD() roundtrip', () => {
        it('should import and export a minimal package with entities and relationships', () => {
            // Create a minimal package based on "Very Simple Model (FMC) with Requirements"
            // Contains: 2 entity classes, 1 relationship class, 2 entity instances, 1 relationship instance
            const jsonldInput = {
                '@context': {
                    'o': 'https://product-information-graph.org/v0.2/ontology#',
                    'd': 'https://product-information-graph.org/examples/test#',
                    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
                    'owl': 'http://www.w3.org/2002/07/owl#',
                    'sh': 'http://www.w3.org/ns/shacl#',
                    'xs': 'http://www.w3.org/2001/XMLSchema#',
                    'dcterms': 'http://purl.org/dc/terms/',
                    'FMC': 'http://fmc-modeling.org#',
                    'cas': 'https://product-information-graph.org/v0.2/metamodel#',
                    'SpecIF': 'https://specif.de/v1.2/schema#'
                },
                '@id': 'd:test-package',
                '@type': 'cas:Package',
                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aPackage` },
                [`${DEF.pfxNsDcmi}title`]: [
                    { '@value': 'Test Package for JSON-LD roundtrip' }
                ],
                [`${DEF.pfxNsDcmi}modified`]: '2026-05-14T08:07:52.031Z',
                '@graph': [
                    // Entity class: FMC:Actor
                    {
                        '@id': 'FMC:Actor',
                        '@type': 'owl:Class',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        // in real data there is usually a specialization, but here we skip it to save the declaration
                        // [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Actor', '@language': 'en' }
                        ],
                        'skos:definition': [
                            { '@value': 'An active system component.', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [
                            { '@id': 'SpecIF:writes-toTarget' }
                        ]
                    },
                    // Property class: o:Volume
                    {
                        '@id': 'o:Volume',
                        '@type': 'owl:DatatypeProperty',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Property` },
                        'sh:datatype': { '@id': 'xs:integer' },
                        [`${DEF.pfxNsMeta}unit`]: 'MB',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'Volume' }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            { '@value': 'Storage volume in megabytes' }
                        ]
                    },
                    // Entity class: FMC:State
                    {
                        '@id': 'FMC:State',
                        '@type': 'owl:Class',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        // in real data there is usually a specialization, but here we skip it to save the declaration
                        // [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Entity` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'State', '@language': 'en' }
                        ],
                        'skos:definition': [
                            { '@value': 'A passive system component storing data.', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedProperty`]: [
                            { '@id': 'o:Volume' }
                        ]
                    },
                    // Relationship class: SpecIF:writes
                    {
                        '@id': 'SpecIF:writes',
                        '@type': 'owl:Class',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        // in real data there is usually a specialization, but here we skip it to save the declaration
                        // [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}Relationship` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'writes', '@language': 'en' }
                        ],
                        'skos:definition': [
                            { '@value': 'An Actor writes a State.', '@language': 'en' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedSourceLink`]: [
                            { '@id': 'SpecIF:writes-toSource' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedTargetLink`]: [
                            { '@id': 'SpecIF:writes-toTarget' }
                        ]
                    },
                    // Link class: SpecIF:writes-toSource
                    {
                        '@id': 'SpecIF:writes-toSource',
                        '@type': 'owl:ObjectProperty',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        // in real data there is usually a specialization, but here we skip it to save the declaration
                        // [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}linksSource` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'writes to source' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'FMC:Actor' }
                        ]
                    },
                    // Link class: SpecIF:writes-toTarget
                    {
                        '@id': 'SpecIF:writes-toTarget',
                        '@type': 'owl:ObjectProperty',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}Link` },
                        // in real data there is usually a specialization, but here we skip it to save the declaration
                        // [`${DEF.pfxNsMeta}specializes`]: { '@id': `${DEF.pfxNsMeta}linksTarget` },
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'writes to target' }
                        ],
                        [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [
                            { '@id': 'FMC:State' }
                        ]
                    },
                    // Entity instance 1: FiCo-Application
                    {
                        '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                        '@type': 'FMC:Actor',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsDcmi}modified`]: '2020-03-06T09:05:00+01:00',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'FiCo-Application' }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            { '@value': '<p>IT-Application for Finance and Controlling.</p>' }
                        ]
                    },
                    // Entity instance 2: FiCo-Data
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        '@type': 'FMC:State',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}anEntity` },
                        [`${DEF.pfxNsDcmi}modified`]: '2020-03-06T09:05:00+01:00',
                        [`${DEF.pfxNsDcmi}title`]: [
                            { '@value': 'FiCo-Data' }
                        ],
                        [`${DEF.pfxNsDcmi}description`]: [
                            { '@value': '<p>Finance and Controlling Data.</p>' }
                        ],
                        'o:Volume': [
                            {
                                [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aProperty` },
                                '@value': '600'
                            }
                        ]
                    },
                    // Relationship instance: FiCo-Application writes FiCo-Data
                    {
                        '@id': 'd:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                        '@type': 'SpecIF:writes',
                        [`${DEF.pfxNsMeta}itemType`]: { '@id': `${DEF.pfxNsMeta}aRelationship` },
                        [`${DEF.pfxNsDcmi}modified`]: '2020-03-06T09:05:00+01:00',
                        [`${DEF.pfxNsDcmi}description`]: [
                            { '@value': "'FiCo-Application' writes 'FiCo-Data'" }
                        ],
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
                    }
                ]
            };

            // Import the package
            const pkg = new APackage().setJSONLD(jsonldInput);

            // Debug output
            const pkgStatus = pkg.status();
            if (!pkgStatus.ok)
                console.error(`Package Import Failed: ${JSON.stringify(pkgStatus, null, 2)}\n`);

            expect(pkgStatus.ok).toBe(true);
            expect(pkg.graph.length).toBe(9);

            // Export the package back to JSON-LD
            const outData = getJSONLD(pkg) as any;

        /*    // Debug output
            process.stderr.write(`\n=== Package Roundtrip Test ===\n`);
            process.stderr.write(`Package output: ${JSON.stringify(outData, null, 2)}\n`);
            process.stderr.write(`Input graph items: ${jsonldInput['@graph'].length}\n`);
            process.stderr.write(`Output graph items: ${outData['@graph'].length}\n`);
        */
            expect(outData).toBeDefined();
            expect(outData['@id']).toBe('d:test-package');
            expect(outData['@graph']).toBeDefined();
            expect(outData['@graph'].length).toBe(9);

            // Compare the exported JSON-LD with the original input for exact equality
            expect(outData).toEqual(jsonldInput);
        });
    });
});
