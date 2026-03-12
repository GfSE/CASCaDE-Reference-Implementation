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
    Property, Link, Entity, Relationship,
    AnEntity, ARelationship
} from '../../src/common/schema/pig/ts/pig-metaclasses';

describe('PIG Metaclasses XML Import', () => {
    describe('Property.setXML()', () => {
        it('should import dcterms:title property', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Property id="${DEF.pfxNsDcmi}title" rdf:type="owl:DatatypeProperty">
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
                </${DEF.pfxNsMeta}Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import dcterms:description property', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Property id="${DEF.pfxNsDcmi}description" rdf:type="owl:DatatypeProperty">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Description</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Beschreibung</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Description</${DEF.pfxNsDcmi}title>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </${DEF.pfxNsMeta}Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import SpecIF:Priority property with enumeratedValues', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Property id="SpecIF:Priority" rdf:type="owl:ObjectProperty">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Priority</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Priorität</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Priorité</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">Enumerated values for the 'Priority' of the resource.</${DEF.pfxNsDcmi}description>
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
                </${DEF.pfxNsMeta}Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);

            // Get the property data
            const propData = prop.get();

            // Verify enumeratedValue structure exists
            expect(propData?.enumeratedValue).toBeDefined();
            expect(Array.isArray(propData?.enumeratedValue)).toBe(true);
            expect(propData?.enumeratedValue?.length).toBe(3);

            // Find SpecIF:priorityHigh
            const priorityHigh = propData?.enumeratedValue?.find((ev:any) => ev.id === 'SpecIF:priorityHigh');
            expect(priorityHigh).toBeDefined();

            // Verify title structure
            expect(priorityHigh?.title).toBeDefined();
            expect(Array.isArray(priorityHigh?.title)).toBe(true);

            // Find German title
            const germanTitle = priorityHigh?.title?.find((t:any) => t.lang === 'de');
            expect(germanTitle).toBeDefined();
            expect(germanTitle?.value).toBe('hoch');
        });

        it(`should import ${DEF.pfxNsMeta}Icon property`, () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Property id="${DEF.pfxNsMeta}Icon">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Property</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsDcmi}title>has icon</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Specifies an icon for a model element (entity or relationship).</${DEF.pfxNsDcmi}description>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:minOccurs>0</xs:minOccurs>
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </${DEF.pfxNsMeta}Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });
    });

    describe('Link.setXML()', () => {
        it(`should import ${DEF.pfxNsMeta}Link`, () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Link id="${DEF.pfxNsMeta}Link" rdf:type="owl:ObjectProperty">
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsDcmi}title>linked with</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Connects a reified relationship with its source or target. Also connects an organizer to a model element</${DEF.pfxNsDcmi}description>
                </${DEF.pfxNsMeta}Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}SourceLink`, () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Link id="${DEF.pfxNsMeta}SourceLink">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Link</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsDcmi}title>to source</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Connects the source of a reified relationship.</${DEF.pfxNsDcmi}description>
                </${DEF.pfxNsMeta}Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import SpecIF:writes-toSource', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Link id="SpecIF:writes-toSource">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}SourceLink</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsDcmi}title>SpecIF:writes to source</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Connects the source of SpecIF:writes</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>FMC:Actor</${DEF.pfxNsMeta}enumeratedEndpoint>
                </${DEF.pfxNsMeta}Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}lists`, () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Link id="${DEF.pfxNsMeta}lists">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}TargetLink</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsMeta}enumeratedEndpoint>${DEF.pfxNsMeta}Organizer</${DEF.pfxNsMeta}enumeratedEndpoint>
                    <${DEF.pfxNsDcmi}title>lists</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>Lists an entity, a relationship or a subordinated organizer.</${DEF.pfxNsDcmi}description>
                </${DEF.pfxNsMeta}Link>
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
                <${DEF.pfxNsMeta}Entity id="${DEF.pfxNsMeta}Entity" rdf:type="owl:Class">
                    <${DEF.pfxNsDcmi}title>Entity</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>A PIG meta-model element used for entities (aka resources or artifacts).</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedProperty>${DEF.pfxNsMeta}Category</${DEF.pfxNsMeta}enumeratedProperty>
                    <${DEF.pfxNsMeta}enumeratedProperty>${DEF.pfxNsMeta}Icon</${DEF.pfxNsMeta}enumeratedProperty>
                </${DEF.pfxNsMeta}Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

             // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it(`should import ${DEF.pfxNsMeta}HierarchyRoot`, () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Entity id="${DEF.pfxNsMeta}HierarchyRoot">
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Organizer</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsDcmi}title>Hierarchy Root</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>A subclass of PIG organizer serving as a root for hierarchically organized graph elements.</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>${DEF.pfxNsMeta}lists</${DEF.pfxNsMeta}enumeratedTargetLink>
                </${DEF.pfxNsMeta}Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import FMC:Actor', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Entity id="FMC:Actor">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Actor</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Akteur</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Acteur</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>An 'Actor' is a fundamental model element type representing an active entity, be it an activity, a process step, a function, a system component or a role.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}Icon>&#x25A1;</${DEF.pfxNsMeta}Icon>
                    <${DEF.pfxNsMeta}enumeratedProperty>${DEF.pfxNsMeta}Category</${DEF.pfxNsMeta}enumeratedProperty>
                </${DEF.pfxNsMeta}Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import IREB:Requirement', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Entity id="IREB:Requirement">
                    <${DEF.pfxNsDcmi}title xml:lang="en">Requirement</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">Anforderung</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">Exigence</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>A 'Requirement' is a singular documented physical and functional need that a particular design, product or process must be able to perform.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Entity</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}Icon>&#8623;</${DEF.pfxNsMeta}Icon>
                    <${DEF.pfxNsMeta}enumeratedProperty>SpecIF:Priority</${DEF.pfxNsMeta}enumeratedProperty>
                </${DEF.pfxNsMeta}Entity>
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
                <${DEF.pfxNsMeta}Relationship id="${DEF.pfxNsMeta}Relationship" rdf:type="owl:Class">
                    <${DEF.pfxNsDcmi}title>Relationship</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>A PIG meta-model element used for reified relationships (aka predicates).</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}enumeratedProperty>${DEF.pfxNsMeta}Category</${DEF.pfxNsMeta}enumeratedProperty>
                    <${DEF.pfxNsMeta}enumeratedProperty>${DEF.pfxNsMeta}Icon</${DEF.pfxNsMeta}enumeratedProperty>
                    <${DEF.pfxNsMeta}enumeratedSourceLink>${DEF.pfxNsMeta}SourceLink</${DEF.pfxNsMeta}enumeratedSourceLink>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>${DEF.pfxNsMeta}TargetLink</${DEF.pfxNsMeta}enumeratedTargetLink>
                </${DEF.pfxNsMeta}Relationship>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import SpecIF:writes', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Relationship id="SpecIF:writes">
                    <${DEF.pfxNsDcmi}title xml:lang="en">writes</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">schreibt</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">écrit</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">A [[FMC:Actor]] 'writes' (changes) a [[FMC:State]].</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedSourceLink>SpecIF:writes-toSource</${DEF.pfxNsMeta}enumeratedSourceLink>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>SpecIF:writes-toTarget</${DEF.pfxNsMeta}enumeratedTargetLink>
                </${DEF.pfxNsMeta}Relationship>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}Relationship id="oslc_rm:satisfies">
                    <${DEF.pfxNsDcmi}title xml:lang="en">satisfies</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="de">erfüllt</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}title xml:lang="fr">satisfait</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description xml:lang="en">
                        <p>The object is satisfied by the subject.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}specializes>${DEF.pfxNsMeta}Relationship</${DEF.pfxNsMeta}specializes>
                    <${DEF.pfxNsMeta}enumeratedSourceLink>oslc_rm:satisfies-toSource</${DEF.pfxNsMeta}enumeratedSourceLink>
                    <${DEF.pfxNsMeta}enumeratedTargetLink>oslc_rm:satisfies-toTarget</${DEF.pfxNsMeta}enumeratedTargetLink>
                </${DEF.pfxNsMeta}Relationship>
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
                <${DEF.pfxNsMeta}anEntity id="d:Req-1a8016e2872e78ecadc50feddc00029b" rdf:type="IREB:Requirement">
                    <${DEF.pfxNsDcmi}modified>2020-10-17T10:00:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}title>Data Volume</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>
                        <p>The data store MUST support a total volume up to 850 GB.</p>
                    </${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}aProperty rdf:type="SpecIF:Priority">
                        <value>SpecIF:priorityHigh</value>
                    </${DEF.pfxNsMeta}aProperty>
                </${DEF.pfxNsMeta}anEntity>
            `;

            const anEntity = new AnEntity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);
        });

        it('should import diagram entity with properties and links', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}anEntity id="d:Diagram-aec0df7900010000017001eaf53e8876" rdf:type="${DEF.pfxNsMeta}View">
                    <${DEF.pfxNsDcmi}modified>2020-03-06T08:32:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}title>IT-Integration: FiCo-Application and FiCo-Data</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsMeta}aProperty rdf:type="SpecIF:Diagram">
                        <value>
                            <p class="inline-label">Model Diagram:</p>
                            <p>
                                <object type="image/svg+xml" data="files_and_images/Very-Simple-Model-FMC.svg">Notation: FMC Block Diagram</object>
                            </p>
                        </value>
                    </${DEF.pfxNsMeta}aProperty>
                    <${DEF.pfxNsMeta}aProperty rdf:type="${DEF.pfxNsMeta}Category">
                        <value>FMC Block Diagram</value>
                    </${DEF.pfxNsMeta}aProperty>
                    <${DEF.pfxNsMeta}aTargetLink rdf:type="${DEF.pfxNsMeta}shows">
                        <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
                    </${DEF.pfxNsMeta}aTargetLink>
                    <${DEF.pfxNsMeta}aTargetLink rdf:type="${DEF.pfxNsMeta}shows">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </${DEF.pfxNsMeta}aTargetLink>
                </${DEF.pfxNsMeta}anEntity>
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
                <${DEF.pfxNsMeta}anEntity id="d:MEl-50fbfe8f0029b1a8016ea86245a9d83a" rdf:type="FMC:Actor">
                    <${DEF.pfxNsDcmi}modified>2020-03-06T09:04:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}title>FiCo-Application</${DEF.pfxNsDcmi}title>
                    <${DEF.pfxNsDcmi}description>
                        <p>IT-Application for Finance and Controlling.</p>
                    </${DEF.pfxNsDcmi}description>
                </${DEF.pfxNsMeta}anEntity>
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
                <${DEF.pfxNsMeta}aRelationship id="d:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc" rdf:type="SpecIF:writes">
                    <${DEF.pfxNsDcmi}modified>2020-03-06T09:05:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}description>'FiCo-Application' writes 'FiCo-Data'</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}aSourceLink rdf:type="SpecIF:writes-toSource">
                        <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
                    </${DEF.pfxNsMeta}aSourceLink>
                    <${DEF.pfxNsMeta}aTargetLink rdf:type="SpecIF:writes-toTarget">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </${DEF.pfxNsMeta}aTargetLink>
                </${DEF.pfxNsMeta}aRelationship>
            `;

            const aRel = new ARelationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies relationship', () => {
            const xmlInput = `
                <${DEF.pfxNsMeta}aRelationship id="d:Ssat-50feddc00029b1a8016e2872e78ecadc-1a8016e2872e78ecadc50feddc00029b" rdf:type="oslc_rm:satisfies">
                    <${DEF.pfxNsDcmi}modified>2020-10-17T10:00:00+01:00</${DEF.pfxNsDcmi}modified>
                    <${DEF.pfxNsDcmi}description>'FiCo-Data' satisfies 'Data Volume'</${DEF.pfxNsDcmi}description>
                    <${DEF.pfxNsMeta}aSourceLink rdf:type="oslc_rm:satisfies-toSource">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </${DEF.pfxNsMeta}aSourceLink>
                    <${DEF.pfxNsMeta}aTargetLink rdf:type="oslc_rm:satisfies-toTarget">
                        <idRef>d:Req-1a8016e2872e78ecadc50feddc00029b</idRef>
                    </${DEF.pfxNsMeta}aTargetLink>
                </${DEF.pfxNsMeta}aRelationship>
            `;

            const aRel = new ARelationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });
    });
});
