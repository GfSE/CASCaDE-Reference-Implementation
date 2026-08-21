/*!
 * Unit tests for PIG metaclasses XML methods
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Note:
 * - a roundtrip test via setXML() and getXML() and enumerated (enumerated) values
 *   is contained in pig-package-constraints-valueRanges.spec.ts
 */

import { DEF } from '../../src/common/lib/definitions';
import {
    Enumeration, Property, Link, Entity, Relationship,
    AnEntity, ARelationship
} from '../../src/common/schema/pig/ts/pig-metaclasses';

describe('PIG Metaclasses XML Import', () => {
    describe('Property.setXML()', () => {
        it('should import dcterms:title property', () => {
            const xmlInput = `
                <owl:DatatypeProperty id="${DEF.pfxNsDcmi}title" cas:itemType="${DEF.pfxNsMeta}Property">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Title</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Titel</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Titre</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>A name given to the resource. <small>(<i>source: <a href="http://purl.org/dc/elements/1.1/title">DCMI</a></i>)</small></p>
                    </${DEF.pfxNsDcmi}description>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:maxLength value="256"/>
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </owl:DatatypeProperty>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import dcterms:description property', () => {
            const xmlInput = `
                <owl:DatatypeProperty id="${DEF.pfxNsDcmi}description" cas:itemType="${DEF.pfxNsMeta}Property">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Description</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Beschreibung</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Description</${DEF.pfxNsDcmi}title>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </owl:DatatypeProperty>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import SpecIF:Priority property with enumeratedValues', () => {
            const xmlInput = `
                <owl:Class id="SpecIF:Priority-Value" cas:itemType="${DEF.pfxNsMeta}Enumeration">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Priority</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Priorität</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Priorité</${DEF.pfxNsDcmi}title>
                    <skos:definition xml:lang="en">Enumerated values for the 'Priority' of a resource.</skos:definition>
                    <${DEF.pfxNsDcmi}modified>2020-03-26T22:59:00+02:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsMeta}specializes>cas:Enumeration</${DEF.pfxNsMeta}specializes>
                    <xs:simpleType>
                        <xs:restriction base="xs:string"/>
                    </xs:simpleType>
                    <${DEF.pfxNsMeta}enumeratedValue id="SpecIF:priorityHigh">
                        <${DEF.pfxNsDcmi}title xml:lang="en">high</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}title xml:lang="de">hoch</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}title xml:lang="fr">haut</${DEF.pfxNsDcmi}title>
                    </${DEF.pfxNsMeta}enumeratedValue>
                    <${DEF.pfxNsMeta}enumeratedValue id="SpecIF:priorityMedium">
                        <${DEF.pfxNsDcmi}title xml:lang="en">medium</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}title xml:lang="de">mittel</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}title xml:lang="fr">moyen</${DEF.pfxNsDcmi}title>
                    </${DEF.pfxNsMeta}enumeratedValue>
                    <${DEF.pfxNsMeta}enumeratedValue id="SpecIF:priorityLow">
                        <${DEF.pfxNsDcmi}title xml:lang="en">low</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}title xml:lang="de">niedrig</${DEF.pfxNsDcmi}title>
                        <${DEF.pfxNsDcmi}title xml:lang="fr">bas</${DEF.pfxNsDcmi}title>
                    </${DEF.pfxNsMeta}enumeratedValue>
                </owl:Class>
            `;

            const en = new Enumeration().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!en.status().ok)
                console.error('status:', en.status());
            expect(en.status().ok).toBe(true);

            // Get the enumeration data
            const enumData = en.get();

            // Verify enumeratedValue structure exists
            expect(enumData?.enumeratedValue).toBeDefined();
            expect(Array.isArray(enumData?.enumeratedValue)).toBe(true);
            expect(enumData?.enumeratedValue?.length).toBe(3);

            // Find SpecIF:priorityHigh
            const priorityHigh = enumData?.enumeratedValue?.find((ev:any) => ev.id === 'SpecIF:priorityHigh');
            expect(priorityHigh).toBeDefined();

            // Verify title structure
            expect(priorityHigh?.title).toBeDefined();
            expect(Array.isArray(priorityHigh?.title)).toBe(true);

            // Find German title
            const germanTitle = priorityHigh?.title?.find((t:any) => t.lang === 'de');
            expect(germanTitle).toBeDefined();
            expect(germanTitle?.value).toBe('hoch');
        });
    });

    describe('Link.setXML()', () => {
        it(`should import ${DEF.pfxNsMeta}Link`, () => {
            const xmlInput = `
                <owl:ObjectProperty id="${DEF.pfxNsMeta}Link" cas:itemType="${DEF.pfxNsMeta}Link">
                    <${DEF.pfxNsMeta}enumeratedEndpoint>
                        <idRef>${DEF.pfxNsMeta}Entity</idRef>
                        <idRef>${DEF.pfxNsMeta}Relationship</idRef>
                    </${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsDcmi}title>linked with</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Connects a reified relationship with its source or target. Also connects an organizer to a model element</${DEF.pfxNsDcmi}description>
                </owl:ObjectProperty>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}SourceLink`, () => {
            const xmlInput = `
                <owl:ObjectProperty id="${DEF.pfxNsMeta}SourceLink" cas:itemType="${DEF.pfxNsMeta}Link">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Link</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>
                        <idRef>${DEF.pfxNsMeta}Entity</idRef>
                        <idRef>${DEF.pfxNsMeta}Relationship</idRef>
                    </${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsDcmi}title>to source</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Connects the source of a reified relationship.</${DEF.pfxNsDcmi}description>
                </owl:ObjectProperty>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import SpecIF:writes-toSource', () => {
            const xmlInput = `
                <owl:ObjectProperty id="SpecIF:writes-toSource" cas:itemType="${DEF.pfxNsMeta}Link">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}SourceLink</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsDcmi}title>SpecIF:writes to source</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Connects the source of SpecIF:writes</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>
                        <idRef>FMC:Actor</idRef>
                    </${DEF.pfxNsMeta}enumeratedEndpoint>
                </owl:ObjectProperty>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}lists`, () => {
            const xmlInput = `
                <owl:ObjectProperty id="${DEF.pfxNsMeta}lists" cas:itemType="${DEF.pfxNsMeta}Link">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}TargetLink</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>
                        <idRef>${DEF.pfxNsMeta}Entity</idRef>
                        <idRef>${DEF.pfxNsMeta}Relationship</idRef>
                        <idRef>${DEF.pfxNsMeta}Organizer</idRef>
                    </${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsDcmi}title>lists</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Lists an entity, a relationship or a subordinated organizer.</${DEF.pfxNsDcmi}description>
                </owl:ObjectProperty>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });
    });

    describe('Entity.setXML()', () => {
        it(`should import ${DEF.pfxNsMeta}Entity`, () => {
            const xmlInput = `
                <owl:Class id="${DEF.pfxNsMeta}Entity" cas:itemType="${DEF.pfxNsMeta}Entity">
                    <${DEF.pfxNsDcmi}title>Entity</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>A PIG meta-model element used for entities (aka resources or artifacts).</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedProperty>
                        <idRef>${DEF.pfxNsMeta}Category</idRef>
                    </${DEF.pfxNsMeta}enumeratedProperty>
                </owl:Class>
            `;

            const entity = new Entity().setXML(xmlInput);

             // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}HierarchyRoot`, () => {
            const xmlInput = `
                <owl:Class id="${DEF.pfxNsMeta}HierarchyRoot" cas:itemType="${DEF.pfxNsMeta}Entity">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Organizer</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsDcmi}title>Hierarchy Root</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>A subclass of PIG organizer serving as a root for hierarchically organized graph elements.</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>
                        <idRef>${DEF.pfxNsMeta}lists</idRef>
                    </${DEF.pfxNsMeta}enumeratedTargetLink>
                </owl:Class>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import FMC:Actor', () => {
            const xmlInput = `
                <owl:Class id="FMC:Actor" cas:itemType="${DEF.pfxNsMeta}Entity">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Actor</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Akteur</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Acteur</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>An 'Actor' is a fundamental model element type representing an active entity, be it an activity, a process step, a function, a system component or a role.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}icon>&#x25A1;</${DEF.pfxNsMeta}icon>
                    <${DEF.pfxNsMeta}enumeratedProperty>
                        <idRef>${DEF.pfxNsMeta}Category</idRef>
                    </${DEF.pfxNsMeta}enumeratedProperty>
                </owl:Class>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import IREB:Requirement', () => {
            const xmlInput = `
                <owl:Class id="IREB:Requirement" cas:itemType="${DEF.pfxNsMeta}Entity">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Requirement</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Anforderung</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Exigence</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>A 'Requirement' is a singular documented physical and functional need that a particular design, product or process must be able to perform.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedProperty>
                        <idRef>SpecIF:Priority</idRef>
                    </${DEF.pfxNsMeta}enumeratedProperty>
                </owl:Class>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });
    });

    describe('Relationship.setXML()', () => {
        it(`should import ${DEF.pfxNsMeta}Relationship`, () => {
            const xmlInput = `
                <owl:Class id="${DEF.pfxNsMeta}Relationship" cas:itemType="${DEF.pfxNsMeta}Relationship">
                    <${DEF.pfxNsDcmi}title>Relationship</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>A PIG meta-model element used for reified relationships (aka predicates).</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedProperty>
                        <idRef>${DEF.pfxNsMeta}Category</idRef>
                    </${DEF.pfxNsMeta}enumeratedProperty>
                    <${DEF.pfxNsMeta}enumeratedSourceLink>
                        <idRef>${DEF.pfxNsMeta}SourceLink</idRef>
                    </${DEF.pfxNsMeta}enumeratedSourceLink>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>
                        <idRef>${DEF.pfxNsMeta}TargetLink</idRef>
                    </${DEF.pfxNsMeta}enumeratedTargetLink>
                </owl:Class>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import SpecIF:writes', () => {
            const xmlInput = `
                <owl:Class id="SpecIF:writes" cas:itemType="${DEF.pfxNsMeta}Relationship">
                    <${DEF.pfxNsDcmi}title xml:lang="en">writes</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">schreibt</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">écrit</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">A [[FMC:Actor]] 'writes' (changes) a [[FMC:State]].</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedSourceLink>
                        <idRef>SpecIF:writes-toSource</idRef>
                    </${DEF.pfxNsMeta}enumeratedSourceLink>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>
                        <idRef>SpecIF:writes-toTarget</idRef>
                    </${DEF.pfxNsMeta}enumeratedTargetLink>
                </owl:Class>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies', () => {
            const xmlInput = `
                <owl:Class id="oslc_rm:satisfies" cas:itemType="${DEF.pfxNsMeta}Relationship">
                    <${DEF.pfxNsDcmi}title xml:lang="en">satisfies</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">erfüllt</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">satisfait</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>The object is satisfied by the subject.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedSourceLink>
                        <idRef>oslc_rm:satisfies-toSource</idRef>
                    </${DEF.pfxNsMeta}enumeratedSourceLink>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>
                        <idRef>oslc_rm:satisfies-toTarget</idRef>
                    </${DEF.pfxNsMeta}enumeratedTargetLink>
                </owl:Class>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });
    });

    describe('AnEntity.setXML()', () => {
        it('should import requirement entity with property', () => {
            const xmlInput = `
                <IREB:Requirement id="d:Req-1a8016e2872e78ecadc50feddc00029b" cas:itemType="${DEF.pfxNsMeta}anEntity">
                    <${DEF.pfxNsDcmi}modified>2020-10-17T10:00:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}title>Data Volume</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>
                        <p>The data store MUST support a total volume up to 850 GB.</p>
                    </${DEF.pfxNsDcmi}description>
                    <SpecIF:Priority cas:itemType="${DEF.pfxNsMeta}aProperty">
                        <value>SpecIF:priorityHigh</value>
                    </SpecIF:Priority>
                </IREB:Requirement>
            `;

            const anEntity = new AnEntity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);
        });

        it('should import diagram entity with properties and links', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}View id="d:Diagram-aec0df7900010000017001eaf53e8876" cas:itemType="${DEF.pfxNsMeta}anEntity">
                    <${DEF.pfxNsDcmi}modified>2020-03-06T08:32:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}title>IT-Integration: FiCo-Application and FiCo-Data</${DEF.pfxNsDcmi}title>
                    <SpecIF:Diagram cas:itemType="${DEF.pfxNsMeta}aProperty">
                        <value>
                            <p class="inline-label">Model Diagram:</p>
                            <p>
                                <object type="image/svg+xml" data="files_and_images/Very-Simple-Model-FMC.svg">Notation: FMC Block Diagram</object>
                            </p>
                        </value>
                    </SpecIF:Diagram>
                    <${DEF.pfxNsMeta}Category cas:itemType="${DEF.pfxNsMeta}aProperty">
                        <value>FMC Block Diagram</value>
                    </${DEF.pfxNsMeta}Category>
                    <${DEF.pfxNsMeta}shows cas:itemType="${DEF.pfxNsMeta}aTargetLink">
                        <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
                    </${DEF.pfxNsMeta}shows>
                    <${DEF.pfxNsMeta}shows cas:itemType="${DEF.pfxNsMeta}aTargetLink">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </${DEF.pfxNsMeta}shows>
                </${DEF.pfxNsMeta}View>
            `;

            const anEntity = new AnEntity().setXML(xmlInput);
            // console.debug('anEntity', JSON.stringify(anEntity,null,2));

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);

            expect(anEntity.hasProperty?.length).toBe(2);
            expect(anEntity.hasProperty[1].hasClass).toBe(`${DEF.pfxNsMeta}Category`);

        });

        it('should import FMC:Actor entity', () => {
            const xmlInput = `
                <FMC:Actor id="d:MEl-50fbfe8f0029b1a8016ea86245a9d83a" cas:itemType="${DEF.pfxNsMeta}anEntity">
                    <${DEF.pfxNsDcmi}modified>2020-03-06T09:04:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}title>FiCo-Application</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>
                        <p>IT-Application for Finance and Controlling.</p>
                    </${DEF.pfxNsDcmi}description>
                </FMC:Actor>
            `;

            const anEntity = new AnEntity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);
        });
    });

    describe('ARelationship.setXML()', () => {
        it('should import SpecIF:writes relationship', () => {
            const xmlInput = `
                <SpecIF:writes id="d:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc" cas:itemType="${DEF.pfxNsMeta}aRelationship">
                    <${DEF.pfxNsDcmi}modified>2020-03-06T09:05:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}description>'FiCo-Application' writes 'FiCo-Data'</${DEF.pfxNsDcmi}description>
                    <SpecIF:writes-toSource cas:itemType="${DEF.pfxNsMeta}aSourceLink">
                        <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
                    </SpecIF:writes-toSource>
                    <SpecIF:writes-toTarget cas:itemType="${DEF.pfxNsMeta}aTargetLink">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </SpecIF:writes-toTarget>
                </SpecIF:writes>
            `;

            const aRel = new ARelationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies relationship', () => {
            const xmlInput = `
                <oslc_rm:satisfies id="d:Ssat-50feddc00029b1a8016e2872e78ecadc-1a8016e2872e78ecadc50feddc00029b" cas:itemType="${DEF.pfxNsMeta}aRelationship">
                    <${DEF.pfxNsDcmi}modified>2020-10-17T10:00:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}description>'FiCo-Data' satisfies 'Data Volume'</${DEF.pfxNsDcmi}description>
                    <oslc_rm:satisfies-toSource cas:itemType="${DEF.pfxNsMeta}aSourceLink">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </oslc_rm:satisfies-toSource>
                    <oslc_rm:satisfies-toTarget cas:itemType="${DEF.pfxNsMeta}aTargetLink">
                        <idRef>d:Req-1a8016e2872e78ecadc50feddc00029b</idRef>
                    </oslc_rm:satisfies-toTarget>
                </oslc_rm:satisfies>
            `;

            const aRel = new ARelationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });
    });
});
