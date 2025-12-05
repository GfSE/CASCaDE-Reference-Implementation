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

import { XsDataType, PigItemType, PigItemTypeValue } from '../../src/utils/schemas/pig/pig-metaclasses';
import { IProperty, IAProperty, IEntity, IAnEntity, IRelationship, IARelationship } from '../../src/utils/schemas/pig/pig-metaclasses';
import { Property, AProperty, Entity, AnEntity, Relationship, ARelationship } from '../../src/utils/schemas/pig/pig-metaclasses';

describe("PIG Metaclasses", () => {
    let propertyClass_input: IProperty;
    let property_input: IAProperty;
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
            title: {text:"The type or category", lang:"en"},
            description: {text: "This is a class for a property named dcterms:type for use by anEntity or aRelationship", lang: "en" },

            datatype: XsDataType.String,
            minCount: 0,
            maxCount: 1,
            maxLength: 20,
            defaultValue: "default_category"
        }
        property_input = {
        //    itemType: PigItemType.aProperty,
            hasClass: "dcterms:type",
            value: "A category"   // usually a property belongs to a certain entity or relationship
        }

        // Entity with class:
        entityClass_input = {
            id: "o:entityClass_1",
            itemType: PigItemType.Entity,
            title: { text: "Title of Entity Class 1", lang: "en" },
            description: { text: "Description of o:entityClass_1", lang: "en" },

            eligibleProperty: ["dcterms:type"]
        };

        entity1_input = {
            id: "d:anEntity_1",
            revision: "v1.0",
            itemType: PigItemType.Entity,
            modified: new Date(),
            creator: "test_user",
            title: { text: "Title of Entity 1", lang: "en" },
            description: { text: "Description of d:entity_1", lang: "en" },

            hasClass: "o:entityClass_1",
            hasProperty: [{
            //    itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of Entity_1"
            }]
        };

        entity2_input = {
            id: "d:anEntity_2",
            revision: "v1.0",
            itemType: PigItemType.Entity,
            modified: new Date(),
            creator: "test_user",
            title: { text: "Title of Entity 2", lang: "en" },
            description: { text: "Description of d:entity_2", lang: "en" },

            hasClass: "o:entityClass_1",
            hasProperty: [{
            //    itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of Entity_2"
            }]
        };

        // Relationship with class:
        relationshipClass_input = {
            id: "o:relationshipClass",
            itemType: PigItemType.Relationship,
            title: { text: "Title of RelationshipClass", lang: "en" },
            description: { text: "Description of o:relationshipClass", lang: "en" },

            eligibleSource: ["o:entityClass_1"],
            eligibleTarget: ["o:entityClass_1"],
            eligibleProperty: ["dcterms:type"]
        };
        relationship_input = {
            id: "d:aRelationship_1",
            itemType: PigItemType.Relationship,
            hasClass: "o:relationshipClass",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: { text: "Title of aRelationship_1", lang: "en" },
            description: { text: "Description of aRelationship_1", lang: "en" },

            hasSource: "d:anEntity_1",
            hasTarget: "d:anEntity_2",
            hasProperty: [{
            //    itemType: PigItemType.aProperty,
                hasClass: "dcterms:title",
                value: "Name for Relationship_1"
            }]
        };
        
    });

    test("Test class pig:Propery", () => {
        const test_PC = new Property(propertyClass_input);

        // check the attribute values:
        expect(test_PC.id).toBe("dcterms:type");
        expect(test_PC.title).toEqual({ text: "The type or category", lang: "en" });
        expect(test_PC.description).toEqual({ text: "This is a class for a property named dcterms:type for use by anEntity or aRelationship", lang: "en" });

        expect(test_PC.itemType).toBe(PigItemType.Property);
        expect(test_PC.datatype).toBe(XsDataType.String);
        expect(test_PC.minCount).toBe(0);
        expect(test_PC.maxCount).toBe(1);
        expect(test_PC.maxLength).toBe(20);
        expect(test_PC.defaultValue).toBe("default_category");

        // check the output:
        const propertyClass_output = test_PC.get();
        expect(propertyClass_output).toEqual(Object.assign({ itemType: "pig:Property" }, propertyClass_input)); // itemType is added at object creation

    });

    test("Test instance pig:aProperty", () => {
        // NOTE: aProperty needs to reference PropertClass but there is no validation in either class to ensure that
        // either of them exists.
        const test_P = new AProperty(property_input);

        // check the attribute values:
    //    expect(test_P.itemType).toBe(PigItemType.aProperty);
        expect(test_P.hasClass).toBe('dcterms:type');
        expect(test_P.value).toBe("A category");  // usually a property belongs to a certain entity or relationship

    });

    test("Test class pig:Entity", () => {
        const test_EC = new Entity(entityClass_input);

        // check the attribute values:
        expect(test_EC.id).toBe('o:entityClass_1');
        expect(test_EC.title).toEqual({ text: 'Title of Entity Class 1', lang: "en" });
        expect(test_EC.description).toEqual({ text: 'Description of o:entityClass_1', lang: "en" });

        expect(test_EC.itemType).toBe(PigItemType.Entity);
        expect(test_EC.eligibleProperty).toStrictEqual(["dcterms:type"]);

        // check the output:
        const entityClass_output = test_EC.get();
        expect(entityClass_output).toEqual(Object.assign({ itemType: "pig:Entity" }, entityClass_input)); // itemType is added at object creation

    });

    test("Test class pig:Relationship", () => {
        // NOTE: Relationship needs to reference two Entity objects but there is no validation in either class to ensure that
        // either of them exists.
        const test_RC = new Relationship(relationshipClass_input);

        // check the attribute values:
    //    expect(test_RC.validate(relationshipClass_input)).toBe(0);

        expect(test_RC.id).toBe('o:relationshipClass');
        expect(test_RC.title).toEqual({ text: 'Title of RelationshipClass', lang: "en" });
        expect(test_RC.description).toEqual({ text: 'Description of o:relationshipClass', lang: "en" });

        expect(test_RC.itemType).toBe(PigItemType.Relationship);
        expect(test_RC.eligibleTarget).toStrictEqual(['o:entityClass_1']);
        expect(test_RC.eligibleSource).toStrictEqual(['o:entityClass_1']);
        expect(test_RC.eligibleProperty).toStrictEqual(["dcterms:type"]);

        // check the output:
        const relationshipClass_output = test_RC.get();
        expect(relationshipClass_output).toEqual(Object.assign({ itemType: "pig:Relation" }, relationshipClass_input)); // itemType is added at object creation

    });

    /* ToDo: ... more tests to come */
});
