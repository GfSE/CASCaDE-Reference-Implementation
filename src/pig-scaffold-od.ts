/** Product Information Graph (PIG) Scaffold - the basic object structure representing the PIG
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - The PIG scaffold contains *only* the elements in the metamodel; it could be generated from the metamodel.
*   - All names are always in singular form, even if they have multiple values.
*   - The item type is checked in the constructors and setters of the classes, but it may be removed in production code.
*   - Other objects are referenced by UUIDs (TUuid) to ensure cache updates are handled correctly.
*     This means the code must resolve any reference by reading the object explicitly from cache, when needed.
*/

export type TUuid = string;  // this is not defined in the metamodel, yet.
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export enum PigItemType {
    PropertyClass = <any>'pig:PropertyClass',
    OrganizerClass = <any>'pig:OrganizerClass',
    EntityClass = <any>'pig:EntityClass',
    RelationshipClass = <any>'pig:RelationshipClass',
    Property = <any>'pig:Property',
    Organizer = <any>'pig:Organizer',
    Entity = <any>'pig:Entity',
    Relationship = <any>'pig:Relationship'
}
export enum XsDataType {
    Boolean = <any>'xs:boolean',
    Integer = <any>'xs:integer',
    Double = <any>'xs:double',
    String = <any>'xs:string',
    AnyURI = <any>'xs:anyURI',
    DateTime = <any>'xs:dateTime',
    Duration = <any>'xs:duration',
    ComplexType = <any>'xs:complexType'
}

//////////////////////////////////////
// The abstract classes:
interface IConfigurationItem {
    id: TUuid;
    revision: TRevision;
//  replaces?: TRevision[];  // optional, used to trace revisions of the same item, usually has one element, but can have two in case of a merge
    itemType: PigItemType;  // translates to @Type in JSON-LD
    modified: Date;
    creator?: string;
    title: string;
    description?: string;

/* Core Audit Attributes of IBM DOORS as proposed by Rüdiger Kaffenberger:
These capture who, what, when, where, and how of data access or changes:
- User ID: Identity of the user who performed the action
- Timestamp: Exact date and time the action occurred
- Operation Type: Action performed (e.g. SELECT, INSERT, UPDATE, DELETE)
- Object Accessed: Table, view, or other database object involved -> im Metamodell die Properties
- Before and After Values (for data changes): Helps track data modifications -> kann rudimentär auch von einem CM-Tool bereit gestellt werden.
- Source IP / Hostname: Origin of the database connection -> besser die User-Id (Agent)
- Application / Client Used: Tool or program accessing the database -> (Agent oder Client App)
- Success/Failure Status: Indicates whether the operation succeeded or failed -> in unserem Fall wohl überflüssig. */
}
abstract class ConfigurationItem implements IConfigurationItem {
    id!: TUuid;
    revision!: TRevision;
    readonly itemType!: PigItemType;
    modified!: Date;
    creator?: string;
    title!: string;
    description?: string;
    constructor(itm: IConfigurationItem) {
        this.set(itm);
    }
    set(itm: IConfigurationItem) {
        this.id = itm.id;
        this.revision = itm.revision;
        // never set the itemType; it is set when instantiating the subclasses
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.title = itm.title;
        this.description = itm.description;
    }
    get() {
        return {
            id: this.id,
            revision: this.revision,
            itemType: this.itemType,
            modified: this.modified,
            creator: this.creator,
            title: this.title,
            description: this.description
        };
    }
}
interface IElementClass extends IConfigurationItem {
    eligiblePropertyClass: TUuid[];  // constraint: must be UUIDs of PropertyClass objects
    icon?: string;  // optional, default is undefined (no icon)
}
abstract class ElementClass extends ConfigurationItem implements IElementClass {
    eligiblePropertyClass: TUuid[];  // constraint: must be UUIDs of PropertyClass objects
    icon?: string;
    constructor(itm: IElementClass) {
        super(itm);
        this.eligiblePropertyClass = itm.eligiblePropertyClass || [];
        this.icon = itm.icon;
    }
    set(itm: IElementClass) {
        super.set(itm);
        this.eligiblePropertyClass = itm.eligiblePropertyClass || [];
        this.icon = itm.icon;
    }
    get() {
        return {
            ...super.get(),
            eligiblePropertyClass: this.eligiblePropertyClass,
            icon: this.icon
        };
    }
}
interface IModelElementClass extends IElementClass {
}
abstract class ModelElementClass extends ElementClass implements IModelElementClass {
    constructor(itm: IModelElementClass) {
        super(itm);
    }
    set(itm: IModelElementClass) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
}
interface IElement extends IConfigurationItem {
    hasProperty: TUuid[];  // constraint: must be UUIDs of Property objects
}
abstract class Element extends ConfigurationItem implements IElement {
    hasProperty: TUuid[];  // constraint: must be UUIDs of Property objects
    constructor(itm: IElement) {
        super(itm);
        this.hasProperty = itm.hasProperty || [];
    }
    set(itm: IElement) {
        super.set(itm);
        this.hasProperty = itm.hasProperty || [];
    }
    get() {
        return {
            ...super.get(),
            hasProperty: this.hasProperty
        };
    }
}
interface IModelElement extends IElement {
}
abstract class ModelElement extends Element implements IModelElement {
    constructor(itm: IModelElement) {
        super(itm);
    }
    set(itm: IModelElement) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
}

//////////////////////////////////////
// The classes to instantiate:
export interface IPropertyClass extends IConfigurationItem {
    datatype: XsDataType;  // constraint: must be one of the XsDataType values
    minCount?: number;  // optional, default is 0 (not required), property is required if minCount>0
    maxCount?: number;  // optional, default is 1 (single value), property is multivalued if maxCount>1
    maxLength?: number;  // optional, default is 0 (no limit), for properties with datatype String
    pattern?: string;  // optional, default is empty string (no pattern), for properties with datatype String
    minInclusive?: number;  // optional, default is 0 (no limit), for properties with datatype Integer or Double
    maxInclusive?: number;  // optional, default is 0 (no limit), for properties with datatype Integer or Double
    defaultValue?: any;  // optional, default is undefined (no default value), maps to sh:defaultValue in SHACL
    // Consider to call it 'value' instead of 'defaultValue' here, as it is formally the same as the value of a property

/*  Proposal by GitHub Copilot:
    isReadOnly?: boolean;  // optional, default is false
    isSearchable?: boolean;  // optional, default is false
    isFilterable?: boolean;  // optional, default is false
    isSortable?: boolean;  // optional, default is false
    isVisible?: boolean;  // optional, default is true */
}
export class PropertyClass extends ConfigurationItem implements IPropertyClass {
    // ToDo: ComplexType is not yet implemented
    readonly itemType = PigItemType.PropertyClass;
    datatype: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    defaultValue?: any;
    constructor(itm: IPropertyClass) {
        super(itm);
        this.datatype = itm.datatype;
        this.minCount = itm.minCount || 0;
        this.maxCount = itm.maxCount || 1;
        this.maxLength = itm.maxLength;
        this.pattern = itm.pattern;
        this.minInclusive = itm.minInclusive;
        this.maxInclusive = itm.maxInclusive;
        this.defaultValue = itm.defaultValue;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IPropertyClass):number {
        super.set(itm);
        this.datatype = itm.datatype;
        this.minCount = itm.minCount || 0;
        this.maxCount = itm.maxCount || 1;
        this.maxLength = itm.maxLength;
        this.pattern = itm.pattern;
        this.minInclusive = itm.minInclusive;
        this.maxInclusive = itm.maxInclusive;
        this.defaultValue = itm.defaultValue;
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            datatype: this.datatype,
            minCount: this.minCount,
            maxCount: this.maxCount,
            maxLength: this.maxLength,
            pattern: this.pattern,
            minInclusive: this.minInclusive,
            maxInclusive: this.maxInclusive,
            defaultValue: this.defaultValue
       };
    }
    validate(itm: IPropertyClass) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType)
            throw new Error(`Expected PropertyClass, but got ${itm.itemType}`);
        if (!Object.values(XsDataType).includes(itm.datatype))
            throw new Error(`Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IOrganizerClass extends IElementClass {
    // If the following is empty or undefined, any instantiated organizer is not constrained wrt the model element it references:
    eligibleModelElementClass: TUuid[];  // constraint: must be UUIDs of objects of ModelElementClass, thus of EntityClass or RelationshipClass
}
export class OrganizerClass extends ElementClass implements IOrganizerClass {
    readonly itemType = PigItemType.OrganizerClass;
    eligibleModelElementClass: TUuid[];
    constructor(itm: IOrganizerClass) {
        super(itm);
        this.eligibleModelElementClass = itm.eligibleModelElementClass || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IOrganizerClass) {
        super.set(itm);
        this.eligibleModelElementClass = itm.eligibleModelElementClass || [];
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            eligibleModelElementClass: this.eligibleModelElementClass
        };
    }
    validate(itm: IOrganizerClass) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType) {
            throw new Error(`Expected OrganizerClass, but got ${itm.itemType}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IEntityClass extends IModelElementClass {
}
export class EntityClass extends ModelElementClass implements IEntityClass {
    readonly itemType = PigItemType.EntityClass;
    constructor(itm: IEntityClass) {
        super(itm);
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IEntityClass) {
        super.set(itm);
        return this.validate(itm);
    }
    get() {
        return super.get()
    }
    validate(itm: IEntityClass) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType)
            throw new Error(`Expected EntityClass, but got ${itm.itemType}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IRelationshipClass extends IModelElementClass {
    // If any of the following are empty or undefined, any instantiated relationship is not constrained wrt subject and/or object:
    eligibleSubjectClass?: TUuid[];  // constraint: must be UUIDs of objects of ModelElementClass, thus of EntityClass or RelationshipClass
    eligibleObjectClass?: TUuid[];  // constraint: must be UUIDs of objects of ModelElementClass, thus of EntityClass or RelationshipClass
}
export class RelationshipClass extends ModelElementClass implements IRelationshipClass {
    readonly itemType = PigItemType.RelationshipClass;
    eligibleSubjectClass?: TUuid[];
    eligibleObjectClass?: TUuid[];
    constructor(itm: IRelationshipClass) {
        super(itm);
        this.eligibleSubjectClass = itm.eligibleSubjectClass || []; 
        this.eligibleObjectClass = itm.eligibleObjectClass || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IRelationshipClass) {
        super.set(itm);
        this.eligibleSubjectClass = itm.eligibleSubjectClass || [];
        this.eligibleObjectClass = itm.eligibleObjectClass || [];
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            eligibleSubjectClass: this.eligibleSubjectClass,
            eligibleObjectClass: this.eligibleObjectClass
        };
    }
    validate(itm: IRelationshipClass) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType) {
            throw new Error(`Expected RelationshipClass, but got ${itm.itemType}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IProperty {
    readonly itemType: PigItemType;
    rdfType: TUuid;  // constraint: must be UUID of PropertyClass object
    value: any;  // the value of the property, must match the datatype and range defined by the PropertyClass
}
export class Property implements IProperty {
    // ToDo: ComplexType is not yet implemented
    readonly itemType = PigItemType.Property;
    rdfType!: TUuid;
    value!: any;  // the value of the property, must match the datatype and range defined by the PropertyClass
    constructor(itm: IProperty) {
        this.rdfType = itm.rdfType;
        this.value = itm.value;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IProperty) {
        this.rdfType = itm.rdfType;
        this.value = itm.value;
        return this.validate(itm);
    }
    get() {
        return {
            itemType: this.itemType,
            rdfType: this.rdfType,
            value: this.value
        };
    }
    validate(itm: IProperty) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType)
            throw new Error(`Expected Property, but got ${itm.itemType}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IOrganizer extends IElement {
    rdfType: TUuid;  // constraint: must be UUID of OrganizerClass object
    // Hierarchy elements must reference exactly one model element, but diagrams can reference ('show') one or more model elements:
    hasModelElement: TUuid[];  // constraint: must be UUIDs of objects of ModelElement, thus of Entity or Relationship
    rdfSeq?: TUuid[];  // optional, constraint: must be UUIDs of objects of Organizer
}
export class Organizer extends Element implements IOrganizer {
    readonly itemType = PigItemType.Organizer;
    rdfType!: TUuid;
    hasModelElement!: TUuid[];
    rdfSeq?: TUuid[];
    constructor(itm: IOrganizer) {
        super(itm);
        this.rdfType = itm.rdfType;
        this.hasModelElement = itm.hasModelElement;
        this.rdfSeq = itm.rdfSeq;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IOrganizer) {
        super.set(itm);
        this.rdfType = itm.rdfType;
        this.hasModelElement = itm.hasModelElement;
        this.rdfSeq = itm.rdfSeq;
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            rdfType: this.rdfType,
            hasModelElement: this.hasModelElement,
            rdfSeq: this.rdfSeq
        };
    }
    validate(itm: IOrganizer) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType) {
            throw new Error(`Expected Organizer, but got ${itm.itemType}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IEntity extends IModelElement {
}
export class Entity extends ModelElement implements IEntity {
    readonly itemType = PigItemType.Entity;
    constructor(itm: IEntity) {
        super(itm);
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IEntity) {
        super.set(itm);
        return this.validate(itm);
    }
    get() {
        return super.get()
    }
    validate(itm: IEntity) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType)
            throw new Error(`Expected Entity, but got ${itm.itemType}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IRelationship extends IModelElement {
    hasSubject: TUuid;  // constraint: must be UUID of Entity or Relationship
    hasObject: TUuid;  // constraint: must be UUID of Entity or Relationship
}
export class Relationship extends ModelElement implements IRelationship {
    readonly itemType = PigItemType.Relationship;
    hasSubject!: TUuid;
    hasObject!: TUuid;
    constructor(itm: IRelationship) {
        super(itm);
        this.hasSubject = itm.hasSubject;
        this.hasObject = itm.hasObject;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IRelationship) {
        super.set(itm);
        this.hasSubject = itm.hasSubject;
        this.hasObject = itm.hasObject;
        return this.validate(itm);
    }
    get() {
        return {
            ...super.get(),
            hasSubject: this.hasSubject,
            hasObject: this.hasObject
        };
    }
    validate(itm: IRelationship) {
        // Terminate in case of a programming error:
        if (itm.itemType !== this.itemType)
            throw new Error(`Expected Relationship, but got ${itm.itemType}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
