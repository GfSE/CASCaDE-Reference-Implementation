/*!
 * Unit tests for PIG metaclasses XML methods
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

describe('PIG Metaclasses XML Import', () => {
    describe('Property.setXML()', () => {
        it('should import dcterms:title property', () => {
            const xmlInput = `
                <pig:Property id="dcterms:title" rdf:type="owl:DatatypeProperty">
                    <dcterms:title xml:lang="en">Title</dcterms:title>
                    <dcterms:title xml:lang="de">Titel</dcterms:title>
                    <dcterms:title xml:lang="fr">Titre</dcterms:title>
                    <dcterms:description xml:lang="en">
                        <p>A name given to the resource. <small>(<i>source: <a href="http://purl.org/dc/elements/1.1/title">DCMI</a></i>)</small></p>
                    </dcterms:description>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:maxLength value="256"/>
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </pig:Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import dcterms:description property', () => {
            const xmlInput = `
                <pig:Property id="dcterms:description" rdf:type="owl:DatatypeProperty">
                    <dcterms:title xml:lang="en">Description</dcterms:title>
                    <dcterms:title xml:lang="de">Beschreibung</dcterms:title>
                    <dcterms:title xml:lang="fr">Description</dcterms:title>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </pig:Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });

        it('should import SpecIF:Priority property with eligibleValues', () => {
            const xmlInput = `
                <pig:Property id="SpecIF:Priority" rdf:type="owl:ObjectProperty">
                    <dcterms:title xml:lang="en">Priority</dcterms:title>
                    <dcterms:title xml:lang="de">Priorität</dcterms:title>
                    <dcterms:title xml:lang="fr">Priorité</dcterms:title>
                    <dcterms:description xml:lang="en">Enumerated values for the 'Priority' of the resource.</dcterms:description>
                    <xs:simpleType>
                        <xs:restriction base="xs:string"/>
                    </xs:simpleType>
                    <pig:eligibleValue id="SpecIF:priorityHigh">
                        <dcterms:title xml:lang="en">high</dcterms:title>
                        <dcterms:title xml:lang="de">hoch</dcterms:title>
                        <dcterms:title xml:lang="fr">haut</dcterms:title>
                    </pig:eligibleValue>
                    <pig:eligibleValue id="SpecIF:priorityMedium">
                        <dcterms:title xml:lang="en">medium</dcterms:title>
                        <dcterms:title xml:lang="de">mittel</dcterms:title>
                        <dcterms:title xml:lang="fr">moyen</dcterms:title>
                    </pig:eligibleValue>
                    <pig:eligibleValue id="SpecIF:priorityLow">
                        <dcterms:title xml:lang="en">low</dcterms:title>
                        <dcterms:title xml:lang="de">niedrig</dcterms:title>
                        <dcterms:title xml:lang="fr">bas</dcterms:title>
                    </pig:eligibleValue>
                </pig:Property>
            `;

            const prop = new Property().setXML(xmlInput);

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
            const priorityHigh = propData?.eligibleValue?.find((ev:any) => ev.id === 'SpecIF:priorityHigh');
            expect(priorityHigh).toBeDefined();

            // Verify title structure
            expect(priorityHigh?.title).toBeDefined();
            expect(Array.isArray(priorityHigh?.title)).toBe(true);

            // Find German title
            const germanTitle = priorityHigh?.title?.find((t:any) => t.lang === 'de');
            expect(germanTitle).toBeDefined();
            expect(germanTitle?.value).toBe('hoch');
        });

        it('should import pig:icon property', () => {
            const xmlInput = `
                <pig:Property id="pig:icon">
                    <pig:specializes>pig:Property</pig:specializes>
                    <dcterms:title>has icon</dcterms:title>
                    <dcterms:description>Specifies an icon for a model element (entity or relationship).</dcterms:description>
                    <xs:simpleType>
                        <xs:restriction base="xs:string">
                            <xs:minOccurs>0</xs:minOccurs>
                            <xs:maxOccurs>1</xs:maxOccurs>
                        </xs:restriction>
                    </xs:simpleType>
                </pig:Property>
            `;

            const prop = new Property().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!prop.status().ok)
                console.error('status:', prop.status());
            expect(prop.status().ok).toBe(true);
        });
    });

    describe('Link.setXML()', () => {
        it('should import pig:Link', () => {
            const xmlInput = `
                <pig:Link id="pig:Link" rdf:type="owl:ObjectProperty">
                    <pig:eligibleEndpoint>pig:Entity</pig:eligibleEndpoint>
                    <pig:eligibleEndpoint>pig:Relationship</pig:eligibleEndpoint>
                    <dcterms:title>linked with</dcterms:title>
                    <dcterms:description>Connects a reified relationship with its source or target. Also connects an organizer to a model element</dcterms:description>
                </pig:Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import pig:SourceLink', () => {
            const xmlInput = `
                <pig:Link id="pig:SourceLink">
                    <pig:specializes>pig:Link</pig:specializes>
                    <pig:eligibleEndpoint>pig:Entity</pig:eligibleEndpoint>
                    <pig:eligibleEndpoint>pig:Relationship</pig:eligibleEndpoint>
                    <dcterms:title>to source</dcterms:title>
                    <dcterms:description>Connects the source of a reified relationship.</dcterms:description>
                </pig:Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import SpecIF:writes-toSource', () => {
            const xmlInput = `
                <pig:Link id="SpecIF:writes-toSource">
                    <pig:specializes>pig:SourceLink</pig:specializes>
                    <dcterms:title>SpecIF:writes to source</dcterms:title>
                    <dcterms:description>Connects the source of SpecIF:writes</dcterms:description>
                    <pig:eligibleEndpoint>FMC:Actor</pig:eligibleEndpoint>
                </pig:Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });

        it('should import pig:lists', () => {
            const xmlInput = `
                <pig:Link id="pig:lists">
                    <pig:specializes>pig:TargetLink</pig:specializes>
                    <pig:eligibleEndpoint>pig:Entity</pig:eligibleEndpoint>
                    <pig:eligibleEndpoint>pig:Relationship</pig:eligibleEndpoint>
                    <pig:eligibleEndpoint>pig:Organizer</pig:eligibleEndpoint>
                    <dcterms:title>lists</dcterms:title>
                    <dcterms:description>Lists an entity, a relationship or a subordinated organizer.</dcterms:description>
                </pig:Link>
            `;

            const link = new Link().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!link.status().ok)
                console.error('status:', link.status());
            expect(link.status().ok).toBe(true);
        });
    });

    describe('Entity.setXML()', () => {
        it('should import pig:Entity', () => {
            const xmlInput = `
                <pig:Entity id="pig:Entity" rdf:type="owl:Class">
                    <dcterms:title>Entity</dcterms:title>
                    <dcterms:description>A PIG meta-model element used for entities (aka resources or artifacts).</dcterms:description>
                    <pig:eligibleProperty>pig:category</pig:eligibleProperty>
                    <pig:eligibleProperty>pig:icon</pig:eligibleProperty>
                </pig:Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

             // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import pig:HierarchyRoot', () => {
            const xmlInput = `
                <pig:Entity id="pig:HierarchyRoot">
                    <pig:specializes>pig:Organizer</pig:specializes>
                    <dcterms:title>Hierarchy Root</dcterms:title>
                    <dcterms:description>A subclass of PIG organizer serving as a root for hierarchically organized graph elements.</dcterms:description>
                    <pig:eligibleTargetLink>pig:lists</pig:eligibleTargetLink>
                </pig:Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import FMC:Actor', () => {
            const xmlInput = `
                <pig:Entity id="FMC:Actor">
                    <dcterms:title xml:lang="en">Actor</dcterms:title>
                    <dcterms:title xml:lang="de">Akteur</dcterms:title>
                    <dcterms:title xml:lang="fr">Acteur</dcterms:title>
                    <dcterms:description xml:lang="en">
                        <p>An 'Actor' is a fundamental model element type representing an active entity, be it an activity, a process step, a function, a system component or a role.</p>
                    </dcterms:description>
                    <pig:specializes>pig:Entity</pig:specializes>
                    <pig:icon>&#x25A1;</pig:icon>
                    <pig:eligibleProperty>pig:category</pig:eligibleProperty>
                </pig:Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });

        it('should import IREB:Requirement', () => {
            const xmlInput = `
                <pig:Entity id="IREB:Requirement">
                    <dcterms:title xml:lang="en">Requirement</dcterms:title>
                    <dcterms:title xml:lang="de">Anforderung</dcterms:title>
                    <dcterms:title xml:lang="fr">Exigence</dcterms:title>
                    <dcterms:description xml:lang="en">
                        <p>A 'Requirement' is a singular documented physical and functional need that a particular design, product or process must be able to perform.</p>
                    </dcterms:description>
                    <pig:specializes>pig:Entity</pig:specializes>
                    <pig:icon>&#8623;</pig:icon>
                    <pig:eligibleProperty>SpecIF:Priority</pig:eligibleProperty>
                </pig:Entity>
            `;

            const entity = new Entity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!entity.status().ok)
                console.error('status:', entity.status());
            expect(entity.status().ok).toBe(true);
        });
    });

    describe('Relationship.setXML()', () => {
        it('should import pig:Relationship', () => {
            const xmlInput = `
                <pig:Relationship id="pig:Relationship" rdf:type="owl:Class">
                    <dcterms:title>Relationship</dcterms:title>
                    <dcterms:description>A PIG meta-model element used for reified relationships (aka predicates).</dcterms:description>
                    <pig:eligibleProperty>pig:category</pig:eligibleProperty>
                    <pig:eligibleProperty>pig:icon</pig:eligibleProperty>
                    <pig:eligibleSourceLink>pig:SourceLink</pig:eligibleSourceLink>
                    <pig:eligibleTargetLink>pig:TargetLink</pig:eligibleTargetLink>
                </pig:Relationship>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import SpecIF:writes', () => {
            const xmlInput = `
                <pig:Relationship id="SpecIF:writes">
                    <dcterms:title xml:lang="en">writes</dcterms:title>
                    <dcterms:title xml:lang="de">schreibt</dcterms:title>
                    <dcterms:title xml:lang="fr">écrit</dcterms:title>
                    <dcterms:description xml:lang="en">A [[FMC:Actor]] 'writes' (changes) a [[FMC:State]].</dcterms:description>
                    <pig:specializes>pig:Relationship</pig:specializes>
                    <pig:eligibleSourceLink>SpecIF:writes-toSource</pig:eligibleSourceLink>
                    <pig:eligibleTargetLink>SpecIF:writes-toTarget</pig:eligibleTargetLink>
                </pig:Relationship>
            `;

            const rel = new Relationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!rel.status().ok)
                console.error('status:', rel.status());
            expect(rel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies', () => {
            const xmlInput = `
                <pig:Relationship id="oslc_rm:satisfies">
                    <dcterms:title xml:lang="en">satisfies</dcterms:title>
                    <dcterms:title xml:lang="de">erfüllt</dcterms:title>
                    <dcterms:title xml:lang="fr">satisfait</dcterms:title>
                    <dcterms:description xml:lang="en">
                        <p>The object is satisfied by the subject.</p>
                    </dcterms:description>
                    <pig:specializes>pig:Relationship</pig:specializes>
                    <pig:eligibleSourceLink>oslc_rm:satisfies-toSource</pig:eligibleSourceLink>
                    <pig:eligibleTargetLink>oslc_rm:satisfies-toTarget</pig:eligibleTargetLink>
                </pig:Relationship>
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
                <pig:anEntity id="d:Req-1a8016e2872e78ecadc50feddc00029b" rdf:type="IREB:Requirement">
                    <dcterms:modified>2020-10-17T10:00:00+01:00</dcterms:modified>
                    <dcterms:title>Data Volume</dcterms:title>
                    <dcterms:description>
                        <p>The data store MUST support a total volume up to 850 GB.</p>
                    </dcterms:description>
                    <pig:aProperty rdf:type="SpecIF:Priority">
                        <value>SpecIF:priorityHigh</value>
                    </pig:aProperty>
                </pig:anEntity>
            `;

            const anEntity = new AnEntity().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);
        });

        it('should import diagram entity with properties and links', () => {
            const xmlInput = `
                <pig:anEntity id="d:Diagram-aec0df7900010000017001eaf53e8876" rdf:type="pig:View">
                    <dcterms:modified>2020-03-06T08:32:00+01:00</dcterms:modified>
                    <dcterms:title>IT-Integration: FiCo-Application and FiCo-Data</dcterms:title>
                    <pig:aProperty rdf:type="SpecIF:Diagram">
                        <value>
                            <p class="inline-label">Model Diagram:</p>
                            <p>
                                <object type="image/svg+xml" data="files_and_images/Very-Simple-Model-FMC.svg">Notation: FMC Block Diagram</object>
                            </p>
                        </value>
                    </pig:aProperty>
                    <pig:aProperty rdf:type="pig:category">
                        <value>FMC Block Diagram</value>
                    </pig:aProperty>
                    <pig:aTargetLink rdf:type="pig:shows">
                        <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
                    </pig:aTargetLink>
                    <pig:aTargetLink rdf:type="pig:shows">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </pig:aTargetLink>
                </pig:anEntity>
            `;

            const anEntity = new AnEntity().setXML(xmlInput);
            // console.debug('anEntity', JSON.stringify(anEntity,null,2));

            // check the attribute values upon creation:
            if (!anEntity.status().ok)
                console.error('status:', anEntity.status());
            expect(anEntity.status().ok).toBe(true);

            expect(anEntity.hasProperty?.length).toBe(2);
            expect(anEntity.hasProperty[1].hasClass).toBe('pig:category');

        });

        it('should import FMC:Actor entity', () => {
            const xmlInput = `
                <pig:anEntity id="d:MEl-50fbfe8f0029b1a8016ea86245a9d83a" rdf:type="FMC:Actor">
                    <dcterms:modified>2020-03-06T09:04:00+01:00</dcterms:modified>
                    <dcterms:title>FiCo-Application</dcterms:title>
                    <dcterms:description>
                        <p>IT-Application for Finance and Controlling.</p>
                    </dcterms:description>
                </pig:anEntity>
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
                <pig:aRelationship id="d:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc" rdf:type="SpecIF:writes">
                    <dcterms:modified>2020-03-06T09:05:00+01:00</dcterms:modified>
                    <dcterms:description>'FiCo-Application' writes 'FiCo-Data'</dcterms:description>
                    <pig:aSourceLink rdf:type="SpecIF:writes-toSource">
                        <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
                    </pig:aSourceLink>
                    <pig:aTargetLink rdf:type="SpecIF:writes-toTarget">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </pig:aTargetLink>
                </pig:aRelationship>
            `;

            const aRel = new ARelationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });

        it('should import oslc_rm:satisfies relationship', () => {
            const xmlInput = `
                <pig:aRelationship id="d:Ssat-50feddc00029b1a8016e2872e78ecadc-1a8016e2872e78ecadc50feddc00029b" rdf:type="oslc_rm:satisfies">
                    <dcterms:modified>2020-10-17T10:00:00+01:00</dcterms:modified>
                    <dcterms:description>'FiCo-Data' satisfies 'Data Volume'</dcterms:description>
                    <pig:aSourceLink rdf:type="oslc_rm:satisfies-toSource">
                        <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
                    </pig:aSourceLink>
                    <pig:aTargetLink rdf:type="oslc_rm:satisfies-toTarget">
                        <idRef>d:Req-1a8016e2872e78ecadc50feddc00029b</idRef>
                    </pig:aTargetLink>
                </pig:aRelationship>
            `;

            const aRel = new ARelationship().setXML(xmlInput);

            // check the attribute values upon creation:
            if (!aRel.status().ok)
                console.error('status:', aRel.status());
            expect(aRel.status().ok).toBe(true);
        });
    });
});
