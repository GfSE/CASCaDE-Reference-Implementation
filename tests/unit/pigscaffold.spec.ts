/** Product Information Graph (PIG) Unit Tests - verification of the concrete classes in the PIG schema
*   Dependencies: pig-scaffold
*   Authors: chrissaenz@psg-inc.net, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - Testing and verification of the concrete children in the PIG scaffold 
*       will provide test coverage for the abstract classes they inherit from.
*/

import { IPropertyClass, IProperty, IOrganizer, IEntity, IRelationship, IOrganizerClass } from '../../src/utils/schemas/pig/pig-scaffold';
import { PropertyClass, Property, Organizer, Entity, Relationship, OrganizerClass } from '../../src/utils/schemas/pig/pig-scaffold';
import { XsDataType, PigItemType } from '../../src/utils/schemas/pig/pig-scaffold';

describe("PIG Scaffold", () => {
    let entity_interface_1: IEntity;
    let entity_interface_2: IEntity;
    let propertyClass_interface: IPropertyClass;
    let property_interface: IProperty;
    let organizerClass_interface: IOrganizerClass;
    let organizer_interface: IOrganizer;
    let relationship_interface: IRelationship;

    beforeAll(() => {

        // Entity
        entity_interface_1 = {
            id: "entity_1",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Test Entity 1",
            description: "description 1",

            type: PigItemType.Entity,
            hasProperty: ["property_definition_1"]
        };

        entity_interface_2 = {
            id: "entity_2",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Test Entity 2",
            description: "description 2",

            type: PigItemType.Entity,
            hasProperty: ["property_definition_1"]
        };

        // PropertyClass & Property
        propertyClass_interface = {
            id: "propertyClass_1",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Test PropertyClass 1",
            description: "description 3",

            type: PigItemType.PropertyClass,
            datatype: XsDataType.String,
            minCount: 0,
            maxCount: 1,
            maxLength: 15,
            defaultValue: "property1"
        }
        property_interface = {
            type: PigItemType.Property,
            hasClass: "propertyClass_1",
            value: "PropertyName"
        }

        // OrganizerClass and Organizer
        organizerClass_interface = {
            id: "organizerClass_1",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Test OrganizerClass 1",
            description: "description 4",

            type: PigItemType.OrganizerClass,
            eligibleModelElementClass: ["entity_1"],
            eligiblePropertyClass: ["propertyClass_1"]
        }
        organizer_interface = {
            id: "organizer_1",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Main Organizer",
            description: "description 5",

            type: PigItemType.Organizer,
            hasModelElement: ["entity_1"],
            hasClass: "organizerClass_1",
            hasProperty: ["propertyClass_1"] // this is currently required by IElement
        };

        // Relationship
        relationship_interface = {
            id: "relationship_1",
            revision: "v1.0",
            modified: new Date(),
            creator: "test_user",
            title: "Test Relationship 1",
            description: "description 6",

            type: PigItemType.Relationship,
            hasObject: "entity_1",
            hasSubject: "entity_2",
            hasProperty: ["propertyClass_1"] // this is currently required by IElement
        };
        
    });

    test("Entity class setup", () => {
        let test_entity = new Entity(entity_interface_1);

        expect(test_entity.id).toBe('entity_1');
        expect(test_entity.revision).toBe('v1.0');
        expect(test_entity.modified).toBeInstanceOf(Date);
        expect(test_entity.creator).toBe('test_user');
        expect(test_entity.title).toBe('Test Entity 1');
        expect(test_entity.description).toBe('description 1');

        expect(test_entity.type).toBe(PigItemType.Entity);
        expect(test_entity.hasProperty).toStrictEqual(["property_definition_1"]);

    });

    test("Property class setup", () => {
        // NOTE: Property needs to reference PropertClass but there is no validation in either class to ensure that
        // either of them exists.
        let test_propertyClass = new PropertyClass(propertyClass_interface);

        expect(test_propertyClass.id).toBe('propertyClass_1');
        expect(test_propertyClass.revision).toBe('v1.0');
        expect(test_propertyClass.modified).toBeInstanceOf(Date);
        expect(test_propertyClass.creator).toBe('test_user');
        expect(test_propertyClass.title).toBe('Test PropertyClass 1');
        expect(test_propertyClass.description).toBe('description 3');

        expect(test_propertyClass.type).toBe(PigItemType.PropertyClass);
        expect(test_propertyClass.datatype).toBe(XsDataType.String);
        expect(test_propertyClass.minCount).toBe(0);
        expect(test_propertyClass.maxCount).toBe(1);
        expect(test_propertyClass.maxLength).toBe(15);
        expect(test_propertyClass.defaultValue).toBe('property1');

        let test_property = new Property(property_interface);

        expect(test_property.type).toBe(PigItemType.Property);
        expect(test_property.hasClass).toBe('propertyClass_1');
        expect(test_property.value).toBe('PropertyName');

    });

    test("Organizer class setup", () => {
        // NOTE: Organizer needs to reference OrganizerClass but there is no validation in either class to ensure that
        // either of them exists.
        let test_organizerClass = new OrganizerClass(organizerClass_interface);

        expect(test_organizerClass.id).toBe('organizerClass_1');
        expect(test_organizerClass.revision).toBe('v1.0');
        expect(test_organizerClass.modified).toBeInstanceOf(Date);
        expect(test_organizerClass.creator).toBe('test_user');
        expect(test_organizerClass.title).toBe('Test OrganizerClass 1');
        expect(test_organizerClass.description).toBe('description 4');

        expect(test_organizerClass.type).toBe(PigItemType.OrganizerClass);
        expect(test_organizerClass.eligibleModelElementClass).toStrictEqual(["entity_1"]);
        expect(test_organizerClass.eligiblePropertyClass).toStrictEqual(["propertyClass_1"]);

        let test_organizer = new Organizer(organizer_interface);

        expect(test_organizer.id).toBe('organizer_1');
        expect(test_organizer.revision).toBe('v1.0');
        expect(test_organizer.modified).toBeInstanceOf(Date);
        expect(test_organizer.creator).toBe('test_user');
        expect(test_organizer.title).toBe('Main Organizer');
        expect(test_organizer.description).toBe('description 5');

        expect(test_organizer.type).toBe(PigItemType.Organizer);
        expect(test_organizer.hasClass).toBe("organizerClass_1");
        expect(test_organizer.hasModelElement).toStrictEqual(["entity_1"]);
        expect(test_organizer.hasProperty).toStrictEqual(["propertyClass_1"]);

    });

    test("Relationship class setup", () => {
        // NOTE: Relationship needs to reference two Entity objects but there is no validation in either class to ensure that
        // either of them exists.
        let test_relationship = new Relationship(relationship_interface);

        expect(test_relationship.id).toBe('relationship_1');
        expect(test_relationship.revision).toBe('v1.0');
        expect(test_relationship.modified).toBeInstanceOf(Date);
        expect(test_relationship.creator).toBe('test_user');
        expect(test_relationship.title).toBe('Test Relationship 1');
        expect(test_relationship.description).toBe('description 6');

        expect(test_relationship.type).toBe(PigItemType.Relationship);
        expect(test_relationship.hasObject).toBe('entity_1');
        expect(test_relationship.hasSubject).toBe('entity_2');
        expect(test_relationship.hasProperty).toStrictEqual(["propertyClass_1"]);
    });

});
