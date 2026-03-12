/** Product Information Graph (PIG) Unit Tests - verification of the concrete classes in the PIG schema
 *  Dependencies: pig-metaclasses.ts
 *  Authors: chrissaenz@psg-inc.net, oskar.dungern@gfse.org
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Link-Implementation/issues)
 *
 *  Design Decisions:
 *  - Testing and verification of the concrete children in the PIG metaclasses,
 *    will provide test coverage for the abstract classes they inherit from.
 * 
 *  Note:
 *  - a roundtrip test via set() and get() and enumerated (enumerated) values
 *    is contained in pig-package-constraints-valueRanges.spec.ts
 *
 *  Authors: oskar.dungern@gfse.org
 */

import { DEF } from '../../src/common/lib/definitions';
import { XsDataType, PigItemType,
    IProperty, IAProperty, ILink, IEntity, IAnEntity, IRelationship, IARelationship,
    Property, AProperty, Link, Entity, AnEntity, Relationship, ARelationship, /* ASourceLink,*/ ATargetLink
} from '../../src/common/schema/pig/ts/pig-metaclasses';

describe("PIG Metaclasses", () => {
    let Property_input: IProperty;
    let Property_input_JSONLD: any;
    let aProperty_input: IAProperty;
    let Link_shows_input: ILink;
    let Link_shows_input_JSONLD: any;
    let entityClass_Diagram_input: IEntity;
    let entityClass_ModelElement_input: IEntity;
    let anEntity_actor_input: IAnEntity;
    let anEntity_state_input: IAnEntity;
    let Link_mutates_toActor: ILink;
    let Link_mutates_toState: ILink;
    let Relationship_mutates_input: IRelationship;
    let aRelationship_mutates_input: IARelationship;
    let anEntity_with_ref_input: IAnEntity;
    let anEntity_with_ref_input_JSONLD: any;

    beforeAll(() => {

        // Property with class:
        Property_input = {
            id: `${DEF.pfxNsDcmi}type`,
            hasClass: "owl:DatatypeProperty",
            itemType: PigItemType.Property,
            title: [{ value: "The type or category", lang: "en" }],
            description: [{ value: `This is a class for a property named ${DEF.pfxNsDcmi}type used by anEntity or aRelationship`, lang: "en" }],

            datatype: XsDataType.String,
            minCount: 0,
            maxCount: 1,
            maxLength: 20,
            defaultValue: "default_category"
        };
        Property_input_JSONLD = {
            ['@id']: `${DEF.pfxNsDcmi}type`,
            ["@type"]: { ['@id']: "owl:DatatypeProperty" },
            [`${DEF.pfxNsMeta}itemType`]: { ['@id']: PigItemType.Property },
            [`${DEF.pfxNsDcmi}title`]: [{ ['@value']: "The type or category", ['@language']: "en" }],
            [`${DEF.pfxNsDcmi}description`]: [{ ['@value']: `This is a class for a property named ${DEF.pfxNsDcmi}type used by anEntity or aRelationship`, ['@language']: "en" }],
            ['sh:datatype']: { ['@id']: XsDataType.String },
            ['sh:minCount']: 0,
            ['sh:maxCount']: 1,
            ['sh:maxLength']: 20,
            ['sh:defaultValue']: "default_category"
        };
        aProperty_input = {
            itemType: PigItemType.aProperty,
            hasClass: `${DEF.pfxNsDcmi}type`,
            value: "A category"   // usually a property belongs to a certain entity or relationship
        };

        // Link class:
        Link_shows_input = {
            id: `${DEF.pfxNsMeta}shows`,
            itemType: PigItemType.Link,
            specializes: PigItemType.Link,
            title: [{ value: "shows", lang: "en" }],
            description: [{ value: "This is a class for a reference used by anEntity", lang: "en" }],

            enumeratedEndpoint: ["o:Entity_Diagram"]
        };
        Link_shows_input_JSONLD = {
            ['@id']: `${DEF.pfxNsMeta}shows`,
            [`${DEF.pfxNsMeta}specializes`]: { ['@id']: PigItemType.Link },
            [`${DEF.pfxNsMeta}itemType`]: { ['@id']: PigItemType.Link },
            [`${DEF.pfxNsDcmi}title`]: [{ ['@value']: "shows", ['@language']: "en" }],
            [`${DEF.pfxNsDcmi}description`]: [{ ['@value']: "This is a class for a reference used by anEntity", ['@language']: "en" }],

            [`${DEF.pfxNsMeta}enumeratedEndpoint`]: [{ ['@id']: "o:Entity_Diagram" }]
        };

        // Entity with class:
        entityClass_Diagram_input = {
            id: "o:Entity_Diagram",
            itemType: PigItemType.Entity,
            specializes: PigItemType.Entity,
            title: [{ value: "Title of o:Entity_Diagram" }],  // if there is just one language, lang can be omitted
            description: [{ value: "Description of o:Entity_Diagram" }],

            icon: { value: "&#x2662;" },
            enumeratedTargetLink: [`${DEF.pfxNsMeta}shows`],
            enumeratedProperty: [`${DEF.pfxNsDcmi}type`]
        };
        entityClass_ModelElement_input = {
            id: "o:Entity_ModelElement",
            itemType: PigItemType.Entity,
            specializes: PigItemType.Entity,
            title: [{ value: "Title of Entity o:Entity_ModelElement" }],  // if there is just one language, lang can be omitted
            description: [{ value: "Description of o:Entity_ModelElement" }],

            icon: { value: "&#x2662;" },
            enumeratedProperty: [`${DEF.pfxNsDcmi}type`]
        };

        anEntity_actor_input = {
            id: "d:anEntity_Actor",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: '2025-12-15T00:00:00Z',
            creator: "test_user",
            title: [{ value: "Title of d:anEntity_Actor", lang: "en" }],
            description: [{ value: "Description of d:anEntity_Actor", lang: "en" }],

            hasClass: "o:Entity_Actor",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: `${DEF.pfxNsDcmi}type`,
                value: "Category of d:anEntity_Actor"
            }]
        };
        anEntity_state_input = {
            id: "d:anEntity_State",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: '2025-12-16T00:00:00Z',
            creator: "test_user",
            title: [{ value: "Title of d:anEntity_State"}],
            description: [{ value: "Description of d:anEntity_State"}],

            hasClass: "o:Entity_State",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: `${DEF.pfxNsDcmi}type`,
                value: "Category of d:anEntity_State"
            }]
        };

        // An entity input with reference (not reusing entity1_input):
        anEntity_with_ref_input = {
            id: "d:anEntity_Diagram",
            hasClass: "o:Entity_Diagram",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: '2025-12-20T00:00:00Z',
            creator: "test_user",
            title: [{ value: "a Diagram", lang: "en" }],
            description: [{ value: "An Entity instance that has a reference to another Entity instance", lang: "en" }],
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: `${DEF.pfxNsDcmi}type`,
                value: "Category (notation) of d:anEntity_Diagram"
            }],
            hasTargetLink: [{
                itemType: PigItemType.aTargetLink,
                hasClass: `${DEF.pfxNsMeta}shows`,
                idRef: "d:anEntity_ModelElement"
            }]
        };
        anEntity_with_ref_input_JSONLD = {
            ['@id']: "d:anEntity_Diagram",
            ['@type']: { ['@id']: "o:Entity_Diagram" },
            [`${DEF.pfxNsMeta}revision`]: "v1.0",
            [`${DEF.pfxNsMeta}itemType`]: { ['@id']: PigItemType.anEntity },
            [`${DEF.pfxNsDcmi}modified`]: '2025-12-20T00:00:00Z',
            [`${DEF.pfxNsDcmi}creator`]: "test_user",
            [`${DEF.pfxNsDcmi}title`]: [{ ['@value']: "a Diagram", ['@language']: "en" }],
            [`${DEF.pfxNsDcmi}description`]: [{ ['@value']: "An Entity instance that has a reference to another Entity instance", ['@language']: "en" }],
            [`${DEF.pfxNsDcmi}type`]: [{
                [`${DEF.pfxNsMeta}itemType`]: { ['@id']: PigItemType.aProperty },
                ['@value']: "Category (notation) of d:anEntity_Diagram"
            }],
            [`${DEF.pfxNsMeta}shows`]: [{
                [`${DEF.pfxNsMeta}itemType`]: { ['@id']: PigItemType.aTargetLink },
                ['@id']: "d:anEntity_ModelElement"
            }]
        };

        // Relationship with class:
        Link_mutates_toActor = {
            id: "o:Link_mutates_toActor",
            itemType: PigItemType.Link,
            specializes: PigItemType.Link,
            title: [{ value: "to actor", lang: "en" }],
            description: [{ value: "This is a class for a link to the source of o:Relationship_mutates", lang: "en" }],

            enumeratedEndpoint: ["o:Entity_Actor"]
        };
        Link_mutates_toState = {
            id: "o:Link_mutates_toState",
            itemType: PigItemType.Link,
            specializes: PigItemType.Link,
            title: [{ value: "to state" }],
            description: [{ value: "This is a class for a link to the target of o:Relationship_mutates" }],

            enumeratedEndpoint: ["o:Entity_State"]
        };
        Relationship_mutates_input = {
            id: "o:Relationship_mutates",
            itemType: PigItemType.Relationship,
            specializes: PigItemType.Relationship,
            title: [{ value: "Title of o:Relationship_mutates", lang: "en" }],
            description: [{ value: "Description of o:Relationship_mutates", lang: "en" }],

            enumeratedProperty: [`${DEF.pfxNsDcmi}type`],
            enumeratedSourceLink: "o:Link_mutates_toActor",
            enumeratedTargetLink: "o:Link_mutates_toState"
        };
        aRelationship_mutates_input = {
            id: "d:aRelationship_mutates_1",
            itemType: PigItemType.aRelationship,
            hasClass: "o:Relationship_mutates",
            revision: "v1.0",
            modified: '2025-12-17T00:00:00Z',
            creator: "test_user",
            title: [{ value: "Title of d:aRelationship_mutates_1", lang: "en" }],
            description: [{ value: "Description of d:aRelationship_mutates_1", lang: "en" }],

            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: `${DEF.pfxNsDcmi}type`,
                value: "Category of d:aRelationship_mutates_1"
            }],
            hasSourceLink: [{ "itemType": `${DEF.pfxNsMeta}aSourceLink`, "hasClass": "o:Link_mutates_toActor", "idRef": "d:anEntity_Actor" }],
            hasTargetLink: [{ "itemType": `${DEF.pfxNsMeta}aTargetLink`, "hasClass": "o:Link_mutates_toState", "idRef": "d:anEntity_State" }]
        };
    });

    test(`Test class ${DEF.pfxNsMeta}Property`, () => {
        const inst = new Property().set(Property_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);
        expect(inst.id).toBe(`${DEF.pfxNsDcmi}type`);
        expect(inst.title).toEqual(Property_input.title);
        expect(inst.description).toEqual(Property_input.description);

        expect(inst.itemType).toBe(PigItemType.Property);
        expect(inst.datatype).toBe(XsDataType.String);
        expect(inst.minCount).toBe(0);
        expect(inst.maxCount).toBe(1);
        expect(inst.maxLength).toBe(20);
        expect(inst.defaultValue).toBe("default_category");

        // check the output as JSON:
        const propertyClass_output = inst.get();
    //    console.debug('pig:Property output:', propertyClass_output);
        expect(propertyClass_output).toEqual(Property_input);

        // check the output as JSON-LD:
        const propertyClass_output_JSONLD = inst.getJSONLD();
        expect(propertyClass_output_JSONLD).toEqual(Property_input_JSONLD);

        // input JSON-LD to JSON conversion check;
        // no access to other items is necessary in case of Property (class):
        const test_PC_fromJSONLD = new Property().setJSONLD(Property_input_JSONLD);
        expect(test_PC_fromJSONLD.get()).toEqual(Property_input);

        // check with bad data type:
        const bad_input = Object.assign({}, Property_input, { datatype: "badType" as XsDataType });
        const test_PC_bad = new Property().set(bad_input);
        expect(test_PC_bad.status().ok).toBe(false);
        //expect(test_PC_bad.status().statusText || '').toContain('Invalid datatype');
        //expect(test_PC_bad.status().statusText || '').toMatch(/invalid datatype/i);
    });

    test(`Test class ${DEF.pfxNsMeta}Link`, () => {
        const inst = new Link().set(Link_shows_input);
        // console.debug('pig:Link input:', linkClass_input);
        // console.debug('pig:Link item:', inst);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);
        expect(inst.id).toBe(`${DEF.pfxNsMeta}shows`);
        expect(inst.title).toEqual([{ value: "shows", lang: "en" }]);
        expect(inst.description).toEqual([{ value: "This is a class for a reference used by anEntity", lang: "en" }]);

        expect(inst.itemType).toBe(PigItemType.Link);
        expect(inst.enumeratedEndpoint).toStrictEqual(['o:Entity_Diagram']);

        // check the output as JSON:
        const refClass_output = inst.get();
        //    console.debug('pig:Link output:', referenceClass_output);
        expect(refClass_output).toEqual(Link_shows_input);

        // check the output as JSON-LD:
        const linkClass_output_JSONLD = inst.getJSONLD();
        expect(linkClass_output_JSONLD).toEqual(Link_shows_input_JSONLD);

        // input JSON-LD to JSON conversion check
        // no access to other items is necessary in case of Link (class):
        const test_RfC_fromJSONLD = new Link().setJSONLD(Link_shows_input_JSONLD);
        expect(test_RfC_fromJSONLD.get()).toEqual(Link_shows_input);
    });

    test(`Test instance ${DEF.pfxNsMeta}aProperty`, () => {
        // NOTE: aProperty needs to reference PropertClass but there is no validation in either class to ensure that
        // either of them exists.
        const inst = new AProperty().set(aProperty_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values:
    //    expect(inst.itemType).toBe(PigItemType.aProperty);
        expect(inst.hasClass).toBe(`${DEF.pfxNsDcmi}type`);
        expect(inst.value).toBe("A category");  // usually a property belongs to a certain entity or relationship

    });

    test(`Test class ${DEF.pfxNsMeta}Entity`, () => {
        const inst = new Entity().set(entityClass_Diagram_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values:
        expect(inst.id).toBe('o:Entity_Diagram');
        expect(inst.title).toEqual([{ value: 'Title of o:Entity_Diagram' }]);
        expect(inst.description).toEqual([{ value: 'Description of o:Entity_Diagram' }]);

        expect(inst.itemType).toBe(PigItemType.Entity);
        expect(inst.enumeratedProperty).toStrictEqual([`${DEF.pfxNsDcmi}type`]);

        // check the output:
        const entityClass_output = inst.get();
        expect(entityClass_output).toEqual(entityClass_Diagram_input);

    });

    test(`Test class ${DEF.pfxNsMeta}Relationship`, () => {
        const linkToActor = new Link().set(Link_mutates_toActor);
        if (!linkToActor.status().ok)
            console.error('status:', linkToActor.status());
        expect(linkToActor.status().ok).toBe(true);

        // NOTE: Relationship needs to reference two Entity objects but there is no validation in either class to ensure that
        // either of them exists.
        const inst = new Relationship().set(Relationship_mutates_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values:
    //    expect(inst.validate(Relationship_mutates_input)).toBe(0);

        expect(inst.id).toBe('o:Relationship_mutates');
        expect(inst.title).toEqual([{ value: 'Title of o:Relationship_mutates', lang: "en" }]);
        expect(inst.description).toEqual([{ value: 'Description of o:Relationship_mutates', lang: "en" }]);

        expect(inst.itemType).toBe(PigItemType.Relationship);
        expect(inst.enumeratedSourceLink).toBe('o:Link_mutates_toActor');
        expect(inst.enumeratedTargetLink).toBe('o:Link_mutates_toState');
        expect(inst.enumeratedProperty).toStrictEqual([`${DEF.pfxNsDcmi}type`]);

        // check the output:
        const relationshipClass_output = inst.get();
        expect(relationshipClass_output).toEqual(Relationship_mutates_input);

    });

    test('Error when itemType is invalid, no exception thrown', () => {
        expect(() => {
            // do not add a completly bad input to avoid a TS error:
            const inst = new Property().set(Object.assign({}, Property_input, { itemType: 'bad' }));
            expect(inst.status().ok).toBe(false);
        }).not.toThrow();
    });
    /* Synchronous Exception (Function or Constructor)
    test('throws when itemType is invalid', () => {
        expect(() => {
            // do not add a completly bad input to avoid a TS error:
            new Property().set(Object.assign({}, Property_input, {itemType: 'bad'}));
        }).toThrow(); // checks only that an exception is thrown

        // more detailed checking: Message, Regex oder Error-Konstruktor
        expect(() => new Property().set(badInput as any)).toThrow('Expected');
        expect(() => new Property().set(badInput as any)).toThrow(/Expected 'Property'/);
    }); */

    test(`Test instance ${DEF.pfxNsMeta}anEntity with hasTargetLink using set()`, () => {
        const inst = new AnEntity().set(anEntity_with_ref_input);
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values upon creation:
        expect(inst.id).toBe('d:anEntity_Diagram');

        // check hasProperty:
        expect(inst.hasProperty).toHaveLength(1);
        expect(inst.hasProperty[0]).toBeInstanceOf(AProperty);
        expect(inst.hasProperty[0].hasClass).toBe(`${DEF.pfxNsDcmi}type`);
        expect(inst.hasProperty[0].value).toBe("Category (notation) of d:anEntity_Diagram");
     //   expect(inst.hasProperty[0].value).toBe(anEntity_with_ref_input.hasProperty[0].value);
        expect(inst.hasProperty[0].itemType).toBe(PigItemType.aProperty);

        // check hasTarget:
        expect(inst.hasTargetLink).toHaveLength(1);
        expect(inst.hasTargetLink[0]).toBeInstanceOf(ATargetLink);
        expect(inst.hasTargetLink[0].hasClass).toBe(`${DEF.pfxNsMeta}shows`);
        expect(inst.hasTargetLink[0].idRef).toBe('d:anEntity_ModelElement');
        expect(inst.hasTargetLink[0].itemType).toBe(PigItemType.aTargetLink);

        // check the output as JSON native:
        const anEntity_output = inst.get();
        // console.debug('pig:anEntity.get():', anEntity_output);
        // Due to possible different order of properties, use toMatchObject for partial deep comparison;
        // succeeds if the properties of the latter are found in the former with the same values:
        expect(anEntity_output).toMatchObject(anEntity_with_ref_input);
        expect(anEntity_with_ref_input).toMatchObject(anEntity_output);

        // check the output as JSON-LD:
        const anEntity_output_JSONLD = inst.getJSONLD();
        // console.debug('pig:anEntity.getJSONLD():', anEntity_output_JSONLD);
        // Due to possible different order of properties, use toMatchObject for partial deep comparison;
        // succeeds if the properties of the latter are found in the former with the same values:
        expect(anEntity_output_JSONLD).toMatchObject(anEntity_with_ref_input_JSONLD);
        expect(anEntity_with_ref_input_JSONLD).toMatchObject(anEntity_output_JSONLD);

    });
    test(`Test 2 instances ${DEF.pfxNsMeta}anEntity with ${DEF.pfxNsMeta}aRelationship using set()`, () => {
        const actor = new AnEntity().set(anEntity_actor_input);
        if (!actor.status().ok)
            console.error('status:', actor.status());
        expect(actor.status().ok).toBe(true);
        const state = new AnEntity().set(anEntity_state_input);
        if (!state.status().ok)
            console.error('status:', state.status());
        expect(state.status().ok).toBe(true);
        const mutates = new ARelationship().set(aRelationship_mutates_input);
        if (!mutates.status().ok)
            console.error('status:', mutates.status());
        expect(mutates.status().ok).toBe(true);
    });

    test(`Test instance ${DEF.pfxNsMeta}anEntity with hasTargetLink using setJSONLD()`, () => {
        // input JSON-LD to JSON conversion check:
        const inst = new AnEntity().setJSONLD(anEntity_with_ref_input_JSONLD);
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        const anEntity_output = inst.get();
        expect(anEntity_output).toMatchObject(anEntity_with_ref_input);
        expect(anEntity_with_ref_input).toMatchObject(anEntity_output);
        // expect(inst.get()).toEqual(anEntity_with_ref_input);
    });

    /* ToDo: ... more tests to come */
});
