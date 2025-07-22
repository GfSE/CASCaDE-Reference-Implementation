/** Product Information Graph (PIG) Scaffold - the basic object structure
*   Dependencies: none
*   Authors: chrissaenz@psg-inc.net, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*/
import { ElementClass, ModelElementClass, Element, ModelElement, ConfigurationItem, IConfigurationItem } from "./pig_scaffold_abstracts";

// Defines a type for objects with string keys and any values
type DynamicData = Record<string, any>; 

export interface IPropertyClass {
    datatype: string;
    minCount: number;
    maxCount: number;
    maxLength: number;
    minInclusive: number;
    maxInclusive: number;
    fractionDigits: number;
    restriction: number;
    defaultValue: number[];
}
export class PropertyClass extends ConfigurationItem {
    datatype!: string;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    minInclusive?: number;
    maxInclusive?: number;
    fractionDigits?: number;
    restriction?: any;
    defaultValue?: any[];

    child?: PropertyClass | null;

    constructor(itm: IConfigurationItem, iprop: IPropertyClass, child?:PropertyClass) {
        super(itm);
        this.setNew(iprop);

        this.child = child;
    }

    setNew(iprop: IPropertyClass) {
        this.datatype = iprop.datatype;
        this.minCount = iprop.minCount;
        this.maxCount = iprop.maxCount;
        this.maxLength = iprop.maxLength;
        this.minInclusive = iprop.minInclusive;
        this.maxInclusive = iprop.maxInclusive;
        this.fractionDigits = iprop.fractionDigits;
        this.restriction = iprop.restriction;
        this.defaultValue = iprop.defaultValue;
    }

    getAll() {
        let configurationItem = this.get();
        return {
            configurationItem: configurationItem,
            datatype: this.datatype,
            minCount: this.minCount,
            maxCount: this.maxCount,
            maxLength: this.maxLength,
            minInclusive: this.minInclusive,
            maxInclusive: this.maxInclusive,
            fractionDigits: this.fractionDigits,
            restriction: this.restriction,
            defaultValue: this.defaultValue
        }
    }
}

export class OrganizerClass extends ElementClass {
    modelElementClasses?: ModelElementClass[];

    constructor(itm: IConfigurationItem, propertyClasses?: PropertyClass[], modelElementClasses?:ModelElementClass[]) {
        super(itm, propertyClasses);

        this.modelElementClasses = modelElementClasses;
    }
}

export class EntityClass extends ModelElementClass {
    constructor(itm: IConfigurationItem, icon?: string) {
        super(itm, icon);
    }
}

export class RelationshipClass extends ModelElementClass {
    // TODO: relationshipClass has pig*eligibleSubjectClass[0..*] and pig*eligibleObjectClass[0..*]
    // both of those are references to the pig*ModelElementClass. Determine best way to handle this.
    constructor(itm: IConfigurationItem, icon?: string) {
        super(itm, icon);
    }
}

export class Organizer extends Element {
    child?: Organizer;
    organizerClasses?: OrganizerClass[];
    modelElements?: ModelElement[];

    constructor(itm: IConfigurationItem, property: Property, child?:Organizer, organizerClasses?:OrganizerClass[], modelElements?: ModelElement[]) {
        super(itm, property);

        this.child = child;
        this.organizerClasses = organizerClasses;
        this.modelElements = modelElements;
    }
}

export class Entity extends ModelElement {
    entityClasses?: EntityClass[];

    constructor(itm: IConfigurationItem, property: Property, entityClasses?:EntityClass[]) {
        super(itm, property);

        this.entityClasses = entityClasses;
    }
}

export class Relationship extends ModelElement {
    relationshipClasses?: RelationshipClass[];
    // TODO: Relationship has pig*hasSubject[1] and pig*hasObject[1] both of those are references to
    // the pig*ModelElement. Determine best way to handle this.

    constructor(itm: IConfigurationItem, property: Property, relationshipClasses?:RelationshipClass[]) {
        super(itm, property);

        this.relationshipClasses = relationshipClasses;
    }
}

export class Property {
    data!: DynamicData;
    child?: Property | null;

    constructor(data: DynamicData, child?:Property) {
        this.data = data;

        this.child = child;
    }

    get(key: string) {
        return this.data[key];
    }

    getAll() {
        return this.data;
    }

    update(key: string, value: any) {
        this.data[key] = value;
    }
}
