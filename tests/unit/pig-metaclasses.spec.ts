/** Product Information Graph (PIG) Unit Tests - verification of the concrete classes in the PIG schema
*   Dependencies: pig-metaclasses.ts
*   Authors: chrissaenz@psg-inc.net, oskar.dungern@gfse.org
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - Testing and verification of the concrete children in the PIG metaclasses,
*       will provide test coverage for the abstract classes they inherit from.
*/

import { LIB } from '../../src/utils/lib/helpers';
import { JsonObject } from '../../src/utils/lib/helpers';
import { XsDataType, PigItemType, PigItemTypeValue,
    IProperty, IAProperty, IReference, IEntity, IAnEntity, IRelationship, IARelationship,
        Property, AProperty, Reference, Entity, AnEntity, Relationship, ARelationship, AReference } from '../../src/utils/schemas/pig/pig-metaclasses';

describe("PIG Metaclasses", () => {
    let propertyClass_input: IProperty;
    let propertyClass_input_JSONLD: any;
    let property_input: IAProperty;
    let referenceClass_input: IReference;
    let referenceClass_input_JSONLD: any;
    let entityClass_input: IEntity;
    let entity1_input: IAnEntity;
//    let entity2_input: IAnEntity;
    let relationshipClass_input: IRelationship;
    let relationship_input: IARelationship;
    let anEntity_with_ref_input: IAnEntity;
    let anEntity_with_ref_input_JSONLD: any;

    beforeAll(() => {

        // Property with class:
        propertyClass_input = {
            id: "dcterms:type",
            hasClass: "owl:DatatypeProperty",
            itemType: PigItemType.Property,
            title: [{ value: "The type or category", lang: "en" }],
            description: [{ value: "This is a class for a property named dcterms:type used by anEntity or aRelationship", lang: "en" }],

            datatype: XsDataType.String,
            minCount: 0,
            maxCount: 1,
            maxLength: 20,
            defaultValue: "default_category"
        };
        propertyClass_input_JSONLD = {
            ['@id']: "dcterms:type",
            ["@type"]: { ['@id']: "owl:DatatypeProperty" },
            ['pig:itemType']: { ['@id']: PigItemType.Property },
            ['dcterms:title']: [{ ['@value']: "The type or category", ['@language']: "en" }],
            ['dcterms:description']: [{ ['@value']: "This is a class for a property named dcterms:type used by anEntity or aRelationship", ['@language']: "en" }],

            ['sh:datatype']: { ['@id']: XsDataType.String },
            ['sh:minCount']: 0,
            ['sh:maxCount']: 1,
            ['sh:maxLength']: 20,
            ['sh:defaultValue']: "default_category"
        };
        property_input = {
            itemType: PigItemType.aProperty,
            hasClass: "dcterms:type",
            value: "A category"   // usually a property belongs to a certain entity or relationship
        };

        // Reference with class:
        referenceClass_input = {
            id: "pig:shows",
            itemType: PigItemType.Reference,
            specializes: "pig:eligibleReference",
            title: [{ value: "shows", lang: "en" }],
            description: [{ value: "This is a class for a reference used by anEntity", lang: "en" }],

            eligibleTarget: ["o:Entity_Diagram"]
        };
        referenceClass_input_JSONLD = {
            ['@id']: "pig:shows",
            ['pig:specializes']: { ['@id']: "pig:eligibleReference" },
            ['pig:itemType']: { ['@id']: PigItemType.Reference },
            ['dcterms:title']: [{ ['@value']: "shows", ['@language']: "en" }],
            ['dcterms:description']: [{ ['@value']: "This is a class for a reference used by anEntity", ['@language']: "en" }],

            ['pig:eligibleTarget']: [{ ['@id']: "o:Entity_Diagram" }]
        };

        // Entity with class:
        entityClass_input = {
            id: "o:Entity_Diagram",
            itemType: PigItemType.Entity,
            specializes: "pig:Entity",
            title: [{ value: "Title of Entity Class 1" }],  // if there is just one language, lang can be omitted
            description: [{ value: "Description of o:Entity_Diagram" }],

            icon: { value: "&#x2662;" },
            eligibleReference: [],
            eligibleProperty: ["dcterms:type"]
        };

        entity1_input = {
            id: "d:anEntity_1",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: '2025-12-15T00:00:00Z',
            creator: "test_user",
            title: [{ value: "Title of anEntity 1", lang: "en" }],
            description: [{ value: "Description of d:anEntity_1", lang: "en" }],

            hasClass: "o:Entity_Diagram",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of d:anEntity_1"
            }]
        };
    /*    entity2_input = {
            id: "d:anEntity_2",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: '2025-12-16T00:00:00Z',
            creator: "test_user",
            title: [{ value: "Title of Entity 2", lang: "en" }],
            description: [{ value: "Description of d:anEntity_2", lang: "en" }],

            hasClass: "o:Entity_Diagram",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of d:anEntity_2"
            }]
        }; */

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
                hasClass: "dcterms:type",
                value: "Category (notation) of d:anEntity_Diagram"
            }],
            hasTarget: [{
                itemType: PigItemType.aReference,
                hasClass: "pig:shows",
                idRef: "d:anEntity_ModelElement"
            }]
        };
        anEntity_with_ref_input_JSONLD = {
            ['@id']: "d:anEntity_Diagram",
            ['@type']: { ['@id']: "o:Entity_Diagram" },
            ['pig:revision']: "v1.0",
            ['pig:itemType']: { ['@id']: PigItemType.anEntity },
            ['dcterms:modified']: '2025-12-20T00:00:00Z',
            ['dcterms:creator']: "test_user",
            ['dcterms:title']: [{ ['@value']: "a Diagram", ['@language']: "en" }],
            ['dcterms:description']: [{ ['@value']: "An Entity instance that has a reference to another Entity instance", ['@language']: "en" }],
            ["dcterms:type"]: [{
                ['pig:itemType']: { ['@id']: PigItemType.aProperty },
                ['@value']: "Category (notation) of d:anEntity_Diagram"
            }],
            ["pig:shows"]: [{
                ['pig:itemType']: { ['@id']: PigItemType.aReference },
                ['@id']: "d:anEntity_ModelElement"
            }]
        };

        // Relationship with class:
        relationshipClass_input = {
            id: "o:Relationship",
            itemType: PigItemType.Relationship,
            specializes: "pig:Relationship",
            title: [{ value: "Title of RelationshipClass", lang: "en" }],
            description: [{ value: "Description of o:Relationship", lang: "en" }],

            eligibleSource: ["o:Entity_Diagram"],
            eligibleTarget: ["o:Entity_Diagram"],
            eligibleProperty: ["dcterms:type"]
        };
        relationship_input = {
            id: "d:aRelationship_1",
            itemType: PigItemType.aRelationship,
            hasClass: "o:Relationship",
            revision: "v1.0",
            modified: '2025-12-17T00:00:00Z',
            creator: "test_user",
            title: [{ value: "Title of d:aRelationship_1", lang: "en" }],
            description: [{ value: "Description of d:aRelationship_1", lang: "en" }],

            hasSource: [{ "itemType": "pig:aReference", "hasClass": "o:relates", "idRef": "d:anEntity_1" }],
            hasTarget: [{ "itemType": "pig:aReference", "hasClass": "o:relates", "idRef": "d:anEntity_2" }],
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:title",
                value: "Name for d:aRelationship_1"
            }]
        };
    });

    test("Test class pig:Property", () => {
        const inst = new Property().set(propertyClass_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);
        expect(inst.id).toBe("dcterms:type");
        expect(inst.title).toEqual(propertyClass_input.title);
        expect(inst.description).toEqual(propertyClass_input.description);

        expect(inst.itemType).toBe(PigItemType.Property);
        expect(inst.datatype).toBe(XsDataType.String);
        expect(inst.minCount).toBe(0);
        expect(inst.maxCount).toBe(1);
        expect(inst.maxLength).toBe(20);
        expect(inst.defaultValue).toBe("default_category");

        // check the output as JSON:
        const propertyClass_output = inst.get();
    //    console.debug('pig:Property output:', propertyClass_output);
        expect(propertyClass_output).toEqual(propertyClass_input);

        // check the output as JSON-LD:
        const propertyClass_output_JSONLD = inst.getJSONLD();
        expect(propertyClass_output_JSONLD).toEqual(propertyClass_input_JSONLD);

        // input JSON-LD to JSON conversion check;
        // no access to other items is necessary in case of Property (class):
        const test_PC_fromJSONLD = new Property().setJSONLD(propertyClass_input_JSONLD);
        expect(test_PC_fromJSONLD.get()).toEqual(propertyClass_input);

        // check with bad data type:
        const bad_input = Object.assign({}, propertyClass_input, { datatype: "badType" as XsDataType });
        const test_PC_bad = new Property().set(bad_input);
        expect(test_PC_bad.status().ok).toBe(false);
        //expect(test_PC_bad.status().statusText || '').toContain('Invalid datatype');
        //expect(test_PC_bad.status().statusText || '').toMatch(/invalid datatype/i);
    });

    test("Test class pig:Reference", () => {
        const inst = new Reference().set(referenceClass_input);
        // console.debug('pig:Reference input:', referenceClass_input);
        // console.debug('pig:Reference item:', inst);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);
        expect(inst.id).toBe("pig:shows");
        expect(inst.title).toEqual([{ value: "shows", lang: "en" }]);
        expect(inst.description).toEqual([{ value: "This is a class for a reference used by anEntity", lang: "en" }]);

        expect(inst.itemType).toBe(PigItemType.Reference);
        expect(inst.eligibleTarget).toStrictEqual(['o:Entity_Diagram']);

        // check the output as JSON:
        const refClass_output = inst.get();
        //    console.debug('pig:Reference output:', referenceClass_output);
        expect(refClass_output).toEqual(referenceClass_input);

        // check the output as JSON-LD:
        const refClass_output_JSONLD = inst.getJSONLD();
        expect(refClass_output_JSONLD).toEqual(referenceClass_input_JSONLD);

        // input JSON-LD to JSON conversion check
        // no access to other items is necessary in case of Reference (class):
        const test_RfC_fromJSONLD = new Reference().setJSONLD(referenceClass_input_JSONLD);
        expect(test_RfC_fromJSONLD.get()).toEqual(referenceClass_input);
    });

    test("Test instance pig:aProperty", () => {
        // NOTE: aProperty needs to reference PropertClass but there is no validation in either class to ensure that
        // either of them exists.
        const inst = new AProperty().set(property_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values:
    //    expect(inst.itemType).toBe(PigItemType.aProperty);
        expect(inst.hasClass).toBe('dcterms:type');
        expect(inst.value).toBe("A category");  // usually a property belongs to a certain entity or relationship

    });

    test("Test class pig:Entity", () => {
        const inst = new Entity().set(entityClass_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values:
        expect(inst.id).toBe('o:Entity_Diagram');
        expect(inst.title).toEqual([{ value: 'Title of Entity Class 1' }]);
        expect(inst.description).toEqual([{ value: 'Description of o:Entity_Diagram' }]);

        expect(inst.itemType).toBe(PigItemType.Entity);
        expect(inst.eligibleProperty).toStrictEqual(["dcterms:type"]);

        // check the output:
        const entityClass_output = inst.get();
        expect(entityClass_output).toEqual(entityClass_input);

    });

    test("Test class pig:Relationship", () => {
        // NOTE: Relationship needs to reference two Entity objects but there is no validation in either class to ensure that
        // either of them exists.
        const inst = new Relationship().set(relationshipClass_input);

        // check the attribute values upon creation:
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values:
    //    expect(inst.validate(relationshipClass_input)).toBe(0);

        expect(inst.id).toBe('o:Relationship');
        expect(inst.title).toEqual([{ value: 'Title of RelationshipClass', lang: "en" }]);
        expect(inst.description).toEqual([{ value: 'Description of o:Relationship', lang: "en" }]);

        expect(inst.itemType).toBe(PigItemType.Relationship);
        expect(inst.eligibleTarget).toStrictEqual(['o:Entity_Diagram']);
        expect(inst.eligibleSource).toStrictEqual(['o:Entity_Diagram']);
        expect(inst.eligibleProperty).toStrictEqual(["dcterms:type"]);

        // check the output:
        const relationshipClass_output = inst.get();
        expect(relationshipClass_output).toEqual(relationshipClass_input);

    });

    test('Error when itemType is invalid, no exception thrown', () => {
        expect(() => {
            // do not add a completly bad input to avoid a TS error:
            const inst = new Property().set(Object.assign({}, propertyClass_input, { itemType: 'bad' }));
            expect(inst.status().ok).toBe(false);
        }).not.toThrow();
    });
    /* Synchronous Exception (Function or Constructor)
    test('throws when itemType is invalid', () => {
        expect(() => {
            // do not add a completly bad input to avoid a TS error:
            new Property().set(Object.assign({}, propertyClass_input, {itemType: 'bad'}));
        }).toThrow(); // checks only that an exception is thrown

        // more detailed checking: Message, Regex oder Error-Konstruktor
        expect(() => new Property().set(badInput as any)).toThrow('Expected');
        expect(() => new Property().set(badInput as any)).toThrow(/Expected 'Property'/);
    }); */

    test("Test instance pig:anEntity with hasTarget using set()", () => {
        const inst = new AnEntity().set(anEntity_with_ref_input);
        if (!inst.status().ok)
            console.error('status:', inst.status());
        expect(inst.status().ok).toBe(true);

        // check the attribute values upon creation:
        expect(inst.id).toBe('d:anEntity_Diagram');

        // check hasProperty:
        expect(inst.hasProperty).toHaveLength(1);
        expect(inst.hasProperty[0]).toBeInstanceOf(AProperty);
        expect(inst.hasProperty[0].hasClass).toBe('dcterms:type');
        expect(inst.hasProperty[0].value).toBe("Category (notation) of d:anEntity_Diagram");
     //   expect(inst.hasProperty[0].value).toBe(anEntity_with_ref_input.hasProperty[0].value);
        expect(inst.hasProperty[0].itemType).toBe(PigItemType.aProperty);

        // check hasTarget:
        expect(inst.hasTarget).toHaveLength(1);
        expect(inst.hasTarget[0]).toBeInstanceOf(AReference);
        expect(inst.hasTarget[0].hasClass).toBe('pig:shows');
        expect(inst.hasTarget[0].idRef).toBe('d:anEntity_ModelElement');
        expect(inst.hasTarget[0].itemType).toBe(PigItemType.aReference);

        // check the output as JSON native:
        const anEntity_output = inst.get();
        console.debug('pig:anEntity.get():', anEntity_output);
        // Due to possible different order of properties, use toMatchObject for partial deep comparison;
        // succeeds if the properties of the latter are found in the former with the same values:
        expect(anEntity_output).toMatchObject(anEntity_with_ref_input);
        expect(anEntity_with_ref_input).toMatchObject(anEntity_output);

        // check the output as JSON-LD:
        const anEntity_output_JSONLD = inst.getJSONLD();
        console.debug('pig:anEntity.getJSONLD():', anEntity_output_JSONLD);
        // Due to possible different order of properties, use toMatchObject for partial deep comparison;
        // succeeds if the properties of the latter are found in the former with the same values:
        expect(anEntity_output_JSONLD).toMatchObject(anEntity_with_ref_input_JSONLD);
        expect(anEntity_with_ref_input_JSONLD).toMatchObject(anEntity_output_JSONLD);

    });
    test("Test instance pig:anEntity with hasTarget using setJSONLD()", () => {
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
