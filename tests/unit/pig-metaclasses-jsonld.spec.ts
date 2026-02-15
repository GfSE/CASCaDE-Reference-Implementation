/*!
 * Unit tests for PIG metaclasses JSON-LD methods
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */

import {
    Property,
    Link,
    Entity,
    Relationship,
    AnEntity,
    ARelationship
} from '../../src/utils/schemas/pig/ts/pig-metaclasses';

describe('PIG Metaclasses JSON-LD Import', () => {
    describe('Property.setJSONLD()', () => {
        it('should import dcterms:title property', () => {
            const jsonldInput = {
                '@id': 'dcterms:title',
                'dcterms:title': [
                    { '@value': 'Title', '@language': 'en' },
                    { '@value': 'Titel', '@language': 'de' },
                    { '@value': 'Titre', '@language': 'fr' }
                ],
                'dcterms:description': [
                    {
                        '@value': '<p>A name given to the resource. <small>(<i>source: <a href="http://purl.org/dc/elements/1.1/title">DCMI</a></i>)</small></p><p>Title (reference: Dublin Core) of the resource represented as rich text in XHTML content. SHOULD include only content that is valid inside an XHTML \'span\' element. <small>(<i>source: <a href="http://open-services.net/">OSLC</a></i>)</small></p>',
                        '@language': 'en'
                    }
                ],
                '@type': 'owl:DatatypeProperty',
                'pig:itemType': { '@id': 'pig:Property' },
                'sh:datatype': { '@id': 'xs:string' },
                'sh:maxCount': 1,
                'sh:maxLength': 256
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import dcterms:description property', () => {
            const jsonldInput = {
                '@id': 'dcterms:description',
                'dcterms:title': [
                    { '@value': 'Description', '@language': 'en' },
                    { '@value': 'Beschreibung', '@language': 'de' },
                    { '@value': 'Description', '@language': 'fr' }
                ],
                'dcterms:description': [
                    {
                        '@value': '<p>An account of the resource. <small>(<i>source: <a href="http://purl.org/dc/elements/1.1/description">DCMI</a></i>)</small></p><p>Descriptive text (reference: Dublin Core) about resource represented as rich text in XHTML content. SHOULD include only content that is valid and suitable inside an XHTML \'div\' element. <small>(<i>source: <a href="http://open-services.net/">OSLC</a></i>)</small></p>',
                        '@language': 'en'
                    }
                ],
                '@type': 'owl:DatatypeProperty',
                'pig:itemType': { '@id': 'pig:Property' },
                'sh:datatype': { '@id': 'xs:string' },
                'sh:maxCount': 1
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import SpecIF:Priority property with eligibleValues', () => {
            const jsonldInput = {
                '@id': 'SpecIF:Priority',
                'dcterms:title': [
                    { '@value': 'Priority', '@language': 'en' },
                    { '@value': 'Priorität', '@language': 'de' },
                    { '@value': 'Priorité', '@language': 'fr' }
                ],
                'dcterms:description': [
                    { '@value': "Enumerated values for the 'Priority' of the resource.", '@language': 'en' }
                ],
                '@type': 'owl:ObjectProperty',
                'pig:itemType': { '@id': 'pig:Property' },
                'sh:datatype': { '@id': 'xs:string' },
                'pig:eligibleValue': [
                    {
                        '@id': 'SpecIF:priorityHigh',
                        'dcterms:title': [
                            { '@value': 'high', '@language': 'en' },
                            { '@value': 'hoch', '@language': 'de' },
                            { '@value': 'haut', '@language': 'fr' }
                        ]
                    },
                    {
                        '@id': 'SpecIF:priorityMedium',
                        'dcterms:title': [
                            { '@value': 'medium', '@language': 'en' },
                            { '@value': 'mittel', '@language': 'de' },
                            { '@value': 'moyen', '@language': 'fr' }
                        ]
                    },
                    {
                        '@id': 'SpecIF:priorityLow',
                        'dcterms:title': [
                            { '@value': 'low', '@language': 'en' },
                            { '@value': 'niedrig', '@language': 'de' },
                            { '@value': 'bas', '@language': 'fr' }
                        ]
                    }
                ]
            };

            const prop = new Property().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);

            // Get the property data
            const propData = prop.get();

            // Verify eligibleValue structure exists
            expect(propData?.eligibleValue).toBeDefined();
            expect(Array.isArray(propData?.eligibleValue)).toBe(true);
            expect(propData?.eligibleValue?.length).toBe(3);

            // Find SpecIF:priorityHigh
            const priorityHigh = propData?.eligibleValue?.find((ev: any) => ev.id === 'SpecIF:priorityHigh');
            expect(priorityHigh).toBeDefined();

            // Verify title structure
            expect(priorityHigh?.title).toBeDefined();
            expect(Array.isArray(priorityHigh?.title)).toBe(true);

            // Find German title
            const germanTitle = priorityHigh?.title?.find((t: any) => t.lang === 'de');
            expect(germanTitle).toBeDefined();
            expect(germanTitle?.value).toBe('hoch');
        });

        it('should import pig:Icon property', () => {
            const jsonldInput = {
                '@id': 'pig:Icon',
                'pig:specializes': { '@id': 'pig:Property' },
                'pig:itemType': { '@id': 'pig:Property' },
                'dcterms:title': [
                    { '@value': 'has icon' }
                ],
                'dcterms:description': [
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
                'dcterms:title': [
                    { '@value': 'Diagram', '@language': 'en' },
                    { '@value': 'Diagramm', '@language': 'de' },
                    { '@value': 'Diagramme', '@language': 'fr' }
                ],
                'dcterms:description': [
                    { '@value': 'A diagram illustrating the resource or a link to a diagram.', '@language': 'en' }
                ],
                '@type': 'owl:DatatypeProperty',
                'pig:itemType': { '@id': 'pig:Property' },
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
        it('should import pig:Link', () => {
            const jsonldInput = {
                '@id': 'pig:Link',
                '@type': 'owl:ObjectProperty',
                'pig:itemType': { '@id': 'pig:Link' },
                'pig:eligibleEndpoint': [
                    { '@id': 'pig:Entity' },
                    { '@id': 'pig:Relationship' }
                ],
                'dcterms:title': [
                    { '@value': 'linked with' }
                ],
                'dcterms:description': [
                    { '@value': 'Connects a reified relationship with its source or target. Also connects an organizer to a model element' }
                ]
            };

            const link = new Link().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import pig:SourceLink', () => {
            const jsonldInput = {
                '@id': 'pig:SourceLink',
                'pig:specializes': { '@id': 'pig:Link' },
                'pig:itemType': { '@id': 'pig:Link' },
                'pig:eligibleEndpoint': [
                    { '@id': 'pig:Entity' },
                    { '@id': 'pig:Relationship' }
                ],
                'dcterms:title': [
                    { '@value': 'to source' }
                ],
                'dcterms:description': [
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
                'pig:itemType': { '@id': 'pig:Link' },
                'pig:specializes': { '@id': 'pig:SourceLink' },
                'dcterms:title': [
                    { '@value': 'SpecIF:writes to source' }
                ],
                'dcterms:description': [
                    { '@value': 'Connects the source of SpecIF:writes' }
                ],
                'pig:eligibleEndpoint': [
                    { '@id': 'FMC:Actor' }
                ]
            };

            const link = new Link().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import pig:lists', () => {
            const jsonldInput = {
                '@id': 'pig:lists',
                'pig:specializes': { '@id': 'pig:TargetLink' },
                'pig:itemType': { '@id': 'pig:Link' },
                'pig:eligibleEndpoint': [
                    { '@id': 'pig:Entity' },
                    { '@id': 'pig:Relationship' },
                    { '@id': 'pig:Organizer' }
                ],
                'dcterms:title': [
                    { '@value': 'lists' }
                ],
                'dcterms:description': [
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
        it('should import pig:Entity', () => {
            const jsonldInput = {
                '@id': 'pig:Entity',
                '@type': 'owl:Class',
                'pig:itemType': { '@id': 'pig:Entity' },
                'dcterms:title': [
                    { '@value': 'Entity' }
                ],
                'dcterms:description': [
                    { '@value': 'A PIG meta-model element used for entities (aka resources or artifacts).' }
                ],
                'pig:eligibleProperty': [
                    { '@id': 'pig:Category' },
                    { '@id': 'pig:Icon' }
                ]
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import pig:HierarchyRoot', () => {
            const jsonldInput = {
                '@id': 'pig:HierarchyRoot',
                'pig:specializes': { '@id': 'pig:Organizer' },
                'pig:itemType': { '@id': 'pig:Entity' },
                'dcterms:title': [
                    { '@value': 'Hierarchy Root' }
                ],
                'dcterms:description': [
                    { '@value': 'A subclass of PIG organizer serving as a root for hierarchically organized graph elements.' }
                ],
                'pig:eligibleProperty': [],
                'pig:eligibleTargetLink': [
                    { '@id': 'pig:lists' }
                ]
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import FMC:Actor', () => {
            const jsonldInput = {
                '@id': 'FMC:Actor',
                'dcterms:title': [
                    { '@value': 'Actor', '@language': 'en' },
                    { '@value': 'Akteur', '@language': 'de' },
                    { '@value': 'Acteur', '@language': 'fr' }
                ],
                'dcterms:description': [
                    {
                        '@value': "<p>An 'Actor' is a fundamental model element type representing an active entity, be it an activity, a process step, a function, a system component or a role.</p><p>The  particular use or original type is specified with a [[dcterms:type]] property of the 'FMC:Actor'. A value of that property should be an ontology-term, such as [[bpmn:processStep]].</p>",
                        '@language': 'en'
                    },
                    {
                        '@value': "<p>Ein 'Akteur' ist ein fundamentaler Modellelementtyp, der eine aktive Entität darstellt, sei es eine Aktivität, ein Prozessschritt, eine Funktion, eine Systemkomponente oder eine Rolle.</p><p>Die spezielle Verwendung oder der ursprüngliche Typ wird mit einer [[dcterms:type]] Eigenschaft von 'FMC:Actor' spezifiziert. Die Werte dieser Eigenschaft können Ontologiebegriffe sein, wie z.B. [[bpmn:timer]].</p>",
                        '@language': 'de'
                    },
                    {
                        '@value': "<p>Un 'Acteur' est un type d'élément de modèle fondamental représentant une entité active, qu'il s'agisse d'une activité, d'une étape de processus, d'une fonction, d'un composant de système ou d'un rôle.</p><p>L'utilisation particulière ou le type original est spécifié avec une propriété [[dcterms:type]] de 'FMC:Actor'. Les valeurs de cette propriété peuvent être des termes d'ontologie, tels que [[bpmn:timer]].</p>",
                        '@language': 'fr'
                    }
                ],
                'pig:specializes': { '@id': 'pig:Entity' },
                'pig:Icon': { '@value': '□' },
                'pig:eligibleProperty': [
                    { '@id': 'pig:Category' }
                ],
                'pig:eligibleTargetLink': [],
                'pig:itemType': { '@id': 'pig:Entity' }
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import IREB:Requirement', () => {
            const jsonldInput = {
                '@id': 'IREB:Requirement',
                'dcterms:title': [
                    { '@value': 'Requirement', '@language': 'en' },
                    { '@value': 'Anforderung', '@language': 'de' },
                    { '@value': 'Exigence', '@language': 'fr' }
                ],
                'dcterms:description': [
                    {
                        '@value': "<p>A 'Requirement' is a singular documented physical and functional need that a particular design, product or process must be able to perform. <small>(<i>source: <a href=\"https://en.wikipedia.org/wiki/Requirement\">Wikipedia</a></i>)</small></p><p>Definition:</p><ol><li>A condition or capability needed by a user to solve a problem or achieve an objective.</li><li>A condition or capability that must be met or possessed by a system or system component to satisfy a contract, standard, specification, or other formally imposed documents.</li><li>A documented representation of a condition or capability as in (1) or (2).</li></ol><p>Note: The definition above is the classic one from IEEE Std 610.12 of 1990. Alternatively, we also give a more modern definition:</p><ol><li>A need perceived by a stakeholder.</li><li>A capability or property that a system shall have.</li><li>A documented representation of a need, capability or property.</li></ol>",
                        '@language': 'en'
                    }
                ],
                'pig:specializes': { '@id': 'pig:Entity' },
                'pig:Icon': { '@value': '↯' },
                'pig:eligibleProperty': [
                    { '@id': 'SpecIF:Priority' }
                ],
                'pig:eligibleTargetLink': [],
                'pig:itemType': { '@id': 'pig:Entity' }
            };

            const entity = new Entity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });
    });

    describe('Relationship.setJSONLD()', () => {
        it('should import pig:Relationship', () => {
            const jsonldInput = {
                '@id': 'pig:Relationship',
                '@type': 'owl:Class',
                'pig:itemType': { '@id': 'pig:Relationship' },
                'dcterms:title': [
                    { '@value': 'Relationship' }
                ],
                'dcterms:description': [
                    { '@value': 'A PIG meta-model element used for reified relationships (aka predicates).' }
                ],
                'pig:eligibleProperty': [
                    { '@id': 'pig:Category' },
                    { '@id': 'pig:Icon' }
                ],
                'pig:eligibleSourceLink': { '@id': 'pig:SourceLink' },
                'pig:eligibleTargetLink': { '@id': 'pig:TargetLink' }
            };

            const rel = new Relationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import SpecIF:writes', () => {
            const jsonldInput = {
                '@id': 'SpecIF:writes',
                'dcterms:title': [
                    { '@value': 'writes', '@language': 'en' },
                    { '@value': 'schreibt', '@language': 'de' },
                    { '@value': 'écrit', '@language': 'fr' }
                ],
                'dcterms:description': [
                    { '@value': "A [[FMC:Actor]] 'writes' (changes) a [[FMC:State]].", '@language': 'en' }
                ],
                'pig:specializes': { '@id': 'pig:Relationship' },
                'pig:eligibleProperty': [],
                'pig:itemType': { '@id': 'pig:Relationship' },
                'pig:eligibleSourceLink': { '@id': 'SpecIF:writes-toSource' },
                'pig:eligibleTargetLink': { '@id': 'SpecIF:writes-toTarget' }
            };

            const rel = new Relationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies', () => {
            const jsonldInput = {
                '@id': 'oslc_rm:satisfies',
                'dcterms:title': [
                    { '@value': 'satisfies', '@language': 'en' },
                    { '@value': 'erfüllt', '@language': 'de' },
                    { '@value': 'satisfait', '@language': 'fr' }
                ],
                'dcterms:description': [
                    {
                        '@value': "<p>The object is satisfied by the subject. <small>(<i>source: <a href=\"http://open-services.net/\">OSLC</a></i>)</small></p><p>SpecIF suggests that the subject is confined to a model element, e.g, a [[FMC:Actor]] or [[FMC:State]], and the object is confined to a [[IREB:Requirement]]. More concretely, an example for this type of statement is 'Component-X <em>satisfies</em> 'Requirement-4711'.</p>",
                        '@language': 'en'
                    }
                ],
                'pig:specializes': { '@id': 'pig:Relationship' },
                'pig:eligibleProperty': [],
                'pig:itemType': { '@id': 'pig:Relationship' },
                'pig:eligibleSourceLink': { '@id': 'oslc_rm:satisfies-toSource' },
                'pig:eligibleTargetLink': { '@id': 'oslc_rm:satisfies-toTarget' }
            };

            const rel = new Relationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });
    });

    describe('AnEntity.setJSONLD()', () => {
        it('should import requirement entity with property', () => {
            const jsonldInput = {
                '@id': 'd:Req-1a8016e2872e78ecadc50feddc00029b',
                '@type': 'IREB:Requirement',
                'dcterms:modified': '2020-10-17T10:00:00+01:00',
                'dcterms:title': [
                    { '@value': 'Data Volume' }
                ],
                'dcterms:description': [
                    { '@value': '<p>The data store MUST support a total volume up to 850 GB.</p>' }
                ],
                'SpecIF:Priority': [
                    {
                        '@id': 'SpecIF:priorityHigh',
                        'pig:itemType': { '@id': 'pig:aProperty' }
                    }
                ],
                'pig:itemType': { '@id': 'pig:anEntity' }
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);
        });

        it('should import diagram entity with properties and links', () => {
            const jsonldInput = {
                '@id': 'd:Diagram-aec0df7900010000017001eaf53e8876',
                '@type': 'pig:View',
                'dcterms:modified': '2020-03-06T08:32:00+01:00',
                'dcterms:title': [
                    { '@value': 'IT-Integration: FiCo-Application and FiCo-Data' }
                ],
                'SpecIF:Diagram': [
                    {
                        '@value': '<p class="inline-label">Model Diagram:</p><p><object type="image/svg+xml" data="files_and_images/Very-Simple-Model-FMC.svg">Notation: FMC Block Diagram</object></p>',
                        'pig:itemType': { '@id': 'pig:aProperty' }
                    }
                ],
                'pig:Category': [
                    {
                        '@value': 'FMC Block Diagram',
                        'pig:itemType': { '@id': 'pig:aProperty' }
                    }
                ],
                'pig:itemType': { '@id': 'pig:anEntity' },
                'pig:shows': [
                    {
                        '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                        'pig:itemType': { '@id': 'pig:aTargetLink' }
                    },
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        'pig:itemType': { '@id': 'pig:aTargetLink' }
                    },
                    {
                        '@id': 'd:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                        'pig:itemType': { '@id': 'pig:aTargetLink' }
                    },
                    {
                        '@id': 'd:SRea-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                        'pig:itemType': { '@id': 'pig:aTargetLink' }
                    }
                ]
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);

            expect(anEntity.hasProperty?.length).toBe(2);
            expect(anEntity.hasProperty[1].hasClass).toBe('pig:Category');
        });

        it('should import FMC:Actor entity', () => {
            const jsonldInput = {
                '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                '@type': 'FMC:Actor',
                'dcterms:modified': '2020-03-06T09:04:00+01:00',
                'dcterms:title': [
                    { '@value': 'FiCo-Application' }
                ],
                'dcterms:description': [
                    { '@value': '<p>IT-Application for Finance and Controlling.</p>' }
                ],
                'pig:itemType': { '@id': 'pig:anEntity' }
            };

            const anEntity = new AnEntity().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);
        });
    });

    describe('ARelationship.setJSONLD()', () => {
        it('should import SpecIF:writes relationship', () => {
            const jsonldInput = {
                '@id': 'd:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc',
                '@type': 'SpecIF:writes',
                'dcterms:modified': '2020-03-06T09:05:00+01:00',
                'dcterms:description': [
                    { '@value': "'FiCo-Application' writes 'FiCo-Data'" }
                ],
                'pig:itemType': { '@id': 'pig:aRelationship' },
                'SpecIF:writes-toSource': [
                    {
                        '@id': 'd:MEl-50fbfe8f0029b1a8016ea86245a9d83a',
                        'pig:itemType': { '@id': 'pig:aSourceLink' }
                    }
                ],
                'SpecIF:writes-toTarget': [
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        'pig:itemType': { '@id': 'pig:aTargetLink' }
                    }
                ]
            };

            const aRel = new ARelationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies relationship', () => {
            const jsonldInput = {
                '@id': 'd:Ssat-50feddc00029b1a8016e2872e78ecadc-1a8016e2872e78ecadc50feddc00029b',
                '@type': 'oslc_rm:satisfies',
                'dcterms:modified': '2020-10-17T10:00:00+01:00',
                'dcterms:description': [
                    { '@value': "'FiCo-Data' satisfies 'Data Volume'" }
                ],
                'pig:itemType': { '@id': 'pig:aRelationship' },
                'oslc_rm:satisfies-toSource': [
                    {
                        '@id': 'd:MEl-50feddc00029b1a8016e2872e78ecadc',
                        'pig:itemType': { '@id': 'pig:aSourceLink' }
                    }
                ],
                'oslc_rm:satisfies-toTarget': [
                    {
                        '@id': 'd:Req-1a8016e2872e78ecadc50feddc00029b',
                        'pig:itemType': { '@id': 'pig:aTargetLink' }
                    }
                ]
            };

            const aRel = new ARelationship().setJSONLD(jsonldInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });
    });
});
