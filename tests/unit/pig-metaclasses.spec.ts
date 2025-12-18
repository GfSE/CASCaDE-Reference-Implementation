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
        Property, AProperty, Reference, Entity, AnEntity, Relationship, ARelationship } from '../../src/utils/schemas/pig/pig-metaclasses';

describe("PIG Metaclasses", () => {
    let propertyClass_input: IProperty;
    let propertyClass_input_JSONLD: any;
    let property_input: IAProperty;
    let referenceClass_input: IReference;
    let referenceClass_input_JSONLD: any;
    let entityClass_input: IEntity;
    let entity1_input: IAnEntity;
    let entity2_input: IAnEntity;
    let relationshipClass_input: IRelationship;
    let relationship_input: IARelationship;

    beforeAll(() => {

        // Property with class:
        propertyClass_input = {
            id: "dcterms:type",
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
            title: [{ value: "shows", lang: "en" }],
            description: [{ value: "This is a class for a reference used by anEntity", lang: "en" }],

            eligibleTarget: ["o:Entity_1"]
        };
        referenceClass_input_JSONLD = {
            ['@id']: "pig:shows",
            ['pig:itemType']: { ['@id']: PigItemType.Reference },
            ['dcterms:title']: [{ ['@value']: "shows", ['@language']: "en" }],
            ['dcterms:description']: [{ ['@value']: "This is a class for a reference used by anEntity", ['@language']: "en" }],

            ['pig:eligibleTarget']: [{ ['@id']: "o:Entity_1" }]
        };

        // Entity with class:
        entityClass_input = {
            id: "o:Entity_1",
            itemType: PigItemType.Entity,
            title: [{ value: "Title of Entity Class 1" }],  // if there is just one language, lang can be omitted
            description: [{ value: "Description of o:Entity_1" }],

            icon: { value: "&#x2662;" },
            eligibleReference: [],
            eligibleProperty: ["dcterms:type"]
        };

        entity1_input = {
            id: "d:anEntity_1",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: new Date(),
            creator: "test_user",
            title: [{ value: "Title of anEntity 1", lang: "en" }],
            description: [{ value: "Description of d:anEntity_1", lang: "en" }],

            hasClass: "o:Entity_1",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of anEntity_1"
            }]
        };
        entity2_input = {
            id: "d:anEntity_2",
            revision: "v1.0",
            itemType: PigItemType.anEntity,
            modified: new Date(),
            creator: "test_user",
            title: [{ value: "Title of Entity 2", lang: "en" }],
            description: [{ value: "Description of d:anEntity_2", lang: "en" }],

            hasClass: "o:Entity_1",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of d:anEntity_2"
            }]
        };

        // Relationship with class:
        relationshipClass_input = {
            id: "o:Relationship",
            itemType: PigItemType.Relationship,
            title: [{ value: "Title of RelationshipClass", lang: "en" }],
            description: [{ value: "Description of o:Relationship", lang: "en" }],

            eligibleSource: ["o:Entity_1"],
            eligibleTarget: ["o:Entity_1"],
            eligibleProperty: ["dcterms:type"]
        };
        relationship_input = {
            id: "d:aRelationship_1",
            itemType: PigItemType.aRelationship,
            hasClass: "o:Relationship",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: [{ value: "Title of d:aRelationship_1", lang: "en" }],
            description: [{ value: "Description of d:aRelationship_1", lang: "en" }],

            hasSource: { "itemType": "pig:aReference", "hasClass": "o:relates", "element": "d:anEntity_1" },
            hasTarget: { "itemType": "pig:aReference", "hasClass": "o:relates", "element": "d:anEntity_2" },
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:title",
                value: "Name for Relationship_1"
            }]
        };
        
    });

    test("Test class pig:Property", () => {
        const test_PC = new Property().set(propertyClass_input);

        // check the attribute values upon creation:
        expect(test_PC.status().ok).toBe(true);
        expect(test_PC.id).toBe("dcterms:type");
        expect(test_PC.title).toEqual([{ value: "The type or category", lang: "en" }]);
        expect(test_PC.description).toEqual([{ value: "This is a class for a property named dcterms:type used by anEntity or aRelationship", lang: "en" }]);

        expect(test_PC.itemType).toBe(PigItemType.Property);
        expect(test_PC.datatype).toBe(XsDataType.String);
        expect(test_PC.minCount).toBe(0);
        expect(test_PC.maxCount).toBe(1);
        expect(test_PC.maxLength).toBe(20);
        expect(test_PC.defaultValue).toBe("default_category");

        // check the output as JSON:
        const propertyClass_output = test_PC.get();
    //    console.debug('pig:Property output:', propertyClass_output);
        expect(propertyClass_output).toEqual(propertyClass_input);

        // check the output as JSON-LD:
        const propertyClass_output_JSONLD = test_PC.getJSONLD();
        expect(propertyClass_output_JSONLD).toEqual(propertyClass_input_JSONLD);

        // input JSON-LD to JSON conversion check;
        // no access to other items is necessary in case of Property (class):
        const test_PC_fromJSONLD = new Property().setJSONLD(propertyClass_input_JSONLD);
        expect(test_PC_fromJSONLD.get()).toEqual(propertyClass_input);

        // ckeck with bad data type:
        const bad_input = Object.assign({}, propertyClass_input, { datatype: "bad_type" as XsDataType });
        const test_PC_bad = new Property().set(bad_input);
        expect(test_PC_bad.status().ok).toBe(false);
        //expect(test_PC_bad.status().statusText || '').toContain('Invalid datatype');
        expect(test_PC_bad.status().statusText || '').toMatch(/invalid datatype/i);
    });

    test("Test class pig:Reference", () => {
        const test_RfC = new Reference().set(referenceClass_input);
        // console.debug('pig:Reference input:', referenceClass_input);
        // console.debug('pig:Reference item:', test_RfC);

        // check the attribute values upon creation:
        //if (!test_RfC.status().ok)
        //    console.error('status:', test_RfC.status());
        expect(test_RfC.status().ok).toBe(true);
        expect(test_RfC.id).toBe("pig:shows");
        expect(test_RfC.title).toEqual([{ value: "shows", lang: "en" }]);
        expect(test_RfC.description).toEqual([{ value: "This is a class for a reference used by anEntity", lang: "en" }]);

        expect(test_RfC.itemType).toBe(PigItemType.Reference);
        expect(test_RfC.eligibleTarget).toStrictEqual(['o:Entity_1']);

        // check the output as JSON:
        const refClass_output = test_RfC.get();
        //    console.debug('pig:Reference output:', referenceClass_output);
        expect(refClass_output).toEqual(referenceClass_input);

        // check the output as JSON-LD:
        const refClass_output_JSONLD = test_RfC.getJSONLD();
        expect(refClass_output_JSONLD).toEqual(referenceClass_input_JSONLD);

        // input JSON-LD to JSON conversion check
        // no access to other items is necessary in case of Reference (class):
        const test_RfC_fromJSONLD = new Reference().setJSONLD(referenceClass_input_JSONLD);
        expect(test_RfC_fromJSONLD.get()).toEqual(referenceClass_input);
    });

    test("Test instance pig:aProperty", () => {
        // NOTE: aProperty needs to reference PropertClass but there is no validation in either class to ensure that
        // either of them exists.
        const test_P = new AProperty().set(property_input);

        // check the attribute values:
    //    expect(test_P.itemType).toBe(PigItemType.aProperty);
        expect(test_P.hasClass).toBe('dcterms:type');
        expect(test_P.value).toBe("A category");  // usually a property belongs to a certain entity or relationship

    });

    test("Test class pig:Entity", () => {
        const test_EC = new Entity().set(entityClass_input);

        // check the attribute values:
        expect(test_EC.id).toBe('o:Entity_1');
        expect(test_EC.title).toEqual([{ value: 'Title of Entity Class 1' }]);
        expect(test_EC.description).toEqual([{ value: 'Description of o:Entity_1' }]);

        expect(test_EC.itemType).toBe(PigItemType.Entity);
        expect(test_EC.eligibleProperty).toStrictEqual(["dcterms:type"]);

        // check the output:
        const entityClass_output = test_EC.get();
        expect(entityClass_output).toEqual(entityClass_input);

    });

    test("Test class pig:Relationship", () => {
        // NOTE: Relationship needs to reference two Entity objects but there is no validation in either class to ensure that
        // either of them exists.
        const test_RC = new Relationship().set(relationshipClass_input);

        // check the attribute values:
    //    expect(test_RC.validate(relationshipClass_input)).toBe(0);

        expect(test_RC.id).toBe('o:Relationship');
        expect(test_RC.title).toEqual([{ value: 'Title of RelationshipClass', lang: "en" }]);
        expect(test_RC.description).toEqual([{ value: 'Description of o:Relationship', lang: "en" }]);

        expect(test_RC.itemType).toBe(PigItemType.Relationship);
        expect(test_RC.eligibleTarget).toStrictEqual(['o:Entity_1']);
        expect(test_RC.eligibleSource).toStrictEqual(['o:Entity_1']);
        expect(test_RC.eligibleProperty).toStrictEqual(["dcterms:type"]);

        // check the output:
        const relationshipClass_output = test_RC.get();
        expect(relationshipClass_output).toEqual(relationshipClass_input);

    });

    // Synchronous Exception (Function or Constructor)
    test('throws when itemType is invalid', () => {
        expect(() => {
            // do not add a completly bad input to avoid a TS error:
            new Property().set(Object.assign({}, propertyClass_input, {itemType: 'bad'}));
        }).toThrow(); // checks only that an exception is thrown

    /*    // more detailed checking: Message, Regex oder Error-Konstruktor
        expect(() => new Property().set(badInput as any)).toThrow('Expected');
        expect(() => new Property().set(badInput as any)).toThrow(/Expected 'Property'/);
    */
    });

/* ToDo: ... more tests to come */

});
