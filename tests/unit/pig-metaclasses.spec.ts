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

import { IProperty, IAProperty, IEntity, IAnEntity, IRelationship, IARelationship } from '../../src/utils/schemas/pig/pig-metaclasses';
import { Property, AProperty, Entity, AnEntity, Relationship, ARelationship } from '../../src/utils/schemas/pig/pig-metaclasses';
import { XsDataType, PigItemType, PigItemTypeValue } from '../../src/utils/schemas/pig/pig-metaclasses';

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
            title: "The type or category",
            description: "This is a class for a property named dcterms:type for use by anEntity or aRelationship",

            datatype: XsDataType.String,
            minCount: 0,
            maxCount: 1,
            maxLength: 20,
            defaultValue: "default_category"
        }
        property_input = {
            itemType: PigItemType.aProperty,
            hasClass: "dcterms:type",
            value: "A category"   // usually a property belongs to a certain entity or relationship
        }

        // Entity with class:
        entityClass_input = {
            id: "o:entityClass_1",
            itemType: PigItemType.Entity,
            title: "Title of Entity Class 1",
            description: "Description of o:entityClass_1",

            eligibleProperty: ["dcterms:type"]
        };

        entity1_input = {
            id: "d:anEntity_1",
            revision: "v1.0",
            itemType: PigItemType.Entity,
            modified: new Date(),
            creator: "test_user",
            title: "Title of Entity 1",
            description: "Description of d:entity_1",

            hasClass: "o:entityClass_1",
            hasProperty: [{
                itemType: PigItemType.aProperty,
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
            title: "Title of Entity 2",
            description: "Description of d:entity_2",

            hasClass: "o:entityClass_1",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:type",
                value: "Category of Entity_2"
            }]
        };

        // Relationship with class:
        relationshipClass_input = {
            id: "o:relationshipClass",
            itemType: PigItemType.Relationship,
            title: "Title of RelationshipClass",
            description: "Description of o:relationshipClass",

            eligibleSource: ["o:entityClass_1"],
            eligibleTarget: ["o:entityClass_1"],
            eligibleProperty: ["dcterms:title"]
        };
        relationship_input = {
            id: "d:aRelationship_1",
            itemType: PigItemType.Relationship,
            hasClass: "o:relationshipClass",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Title of aRelationship_1",
            description: "Description of aRelationship_1",

            hasSource: "d:anEntity_1",
            hasTarget: "d:anEntity_2",
            hasProperty: [{
                itemType: PigItemType.aProperty,
                hasClass: "dcterms:title",
                value: "Name for Relationship_1"
            }]
        };
        
    });

    test("Property class setup", () => {
        // NOTE: Property needs to reference PropertClass but there is no validation in either class to ensure that
        // either of them exists.
        let test_propertyClass = new Property(propertyClass_input);

        expect(test_propertyClass.id).toBe("dcterms:type");
        expect(test_propertyClass.title).toBe("The type or category");
        expect(test_propertyClass.description).toBe("This is a class for a property named dcterms:type for use by anEntity or aRelationship");

        expect(test_propertyClass.itemType).toBe(PigItemType.Property);
        expect(test_propertyClass.datatype).toBe(XsDataType.String);
        expect(test_propertyClass.minCount).toBe(0);
        expect(test_propertyClass.maxCount).toBe(1);
        expect(test_propertyClass.maxLength).toBe(20);
        expect(test_propertyClass.defaultValue).toBe("default_category");

        let test_property = new AProperty(property_input);

        expect(test_property.itemType).toBe(PigItemType.aProperty);
        expect(test_property.hasClass).toBe('dcterms:type');
        expect(test_property.value).toBe("A category");  // usually a property belongs to a certain entity or relationship

    });

    test("Entity class setup", () => {
        let test_entity = new Entity(entityClass_input);

        expect(test_entity.id).toBe('d:entityClass_1');
        expect(test_entity.title).toBe('Title of Entity Class 1');
        expect(test_entity.description).toBe('Description of o:entityClass_1');

        expect(test_entity.itemType).toBe(PigItemType.Entity);
        expect(test_entity.eligibleProperty).toStrictEqual(["dcterms:type"]);

    });

    test("Relationship class setup", () => {
        // NOTE: Relationship needs to reference two Entity objects but there is no validation in either class to ensure that
        // either of them exists.
        let test_relationship = new Relationship(relationshipClass_input);

        expect(test_relationship.id).toBe('o:relationshipClass');
        expect(test_relationship.title).toBe('Title of RelationshipClass');
        expect(test_relationship.description).toBe('Description of o:relationshipClass');

        expect(test_relationship.itemType).toBe(PigItemType.Relationship);
        expect(test_relationship.eligibleTarget).toBe('o:entityClass_1');
        expect(test_relationship.eligibleSource).toBe('o:entityClass_1');
        expect(test_relationship.eligibleProperty).toStrictEqual(["dcterms:type"]);
    });

});
