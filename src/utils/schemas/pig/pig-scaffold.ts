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
*   - Other objects are referenced by IRIs (TPigId) to ensure cache updates are handled correctly.
*     This means the code must resolve any reference by reading the object explicitly from cache, when needed.
*/

export type TPigId = string;  // an IRI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Property | Organizer | Entity | Relationship;
export type TPigInstance = AnOrganizer | AnEntity | ARelationship;
export type TPigItem = TPigClass | TPigInstance;
export enum PigItemType {
    Property = <any>'pig:Property', // is a PIG class
    Organizer = <any>'pig:Organizer', // is a PIG class
    Entity = <any>'pig:Entity', // is a PIG class
    Relationship = <any>'pig:Relationship', // is a PIG class
    aProperty = <any>'pig:aProperty', // is a PIG instance/individual
    anOrganizer = <any>'pig:anOrganizer', // is a PIG instance/individual
    anEntity = <any>'pig:anEntity', // is a PIG instance/individual
    aRelationship = <any>'pig:aRelationship' // is a PIG instance/individual
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

interface IIdentifiable {
    id: TPigId;  // translates to @id in JSON-LD
    revision: TRevision;
    priorRevision?: TRevision[];  // optional, used to trace revisions of the same item, usually has one element, but can have two in case of a merge
    type: PigItemType;  // translates to @type in JSON-LD
    modified: Date;
    creator?: string;
    title: string;
    description?: string;
}
abstract class Identifiable implements IIdentifiable {
    id!: TPigId;
    revision!: TRevision;
    priorRevision?: TRevision[]; // optional, used to trace revisions of the same item, usually has one element, but can have two in case of a merge
    type!: PigItemType;
    modified!: Date;
    creator?: string;
    title!: string;
    description?: string;
    constructor(itm: IIdentifiable) {
        this.set(itm);
    }
    set(itm: IIdentifiable) {
        this.id = itm.id;
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        // don't set the type here; it is set when instantiating the subclasses
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.title = itm.title;
        this.description = itm.description;
    }
    get() {
        return {
            id: this.id,
            revision: this.revision,
            priorRevision: this.priorRevision,
            type: this.type,
            modified: this.modified,
            creator: this.creator,
            title: this.title,
            description: this.description
        };
    }
}
interface IElement extends IIdentifiable {
    eligibleProperty: TPigId[];  // constraint: must be UUIDs of Property
    icon?: string;  // optional, default is undefined (no icon)
}
abstract class Element extends Identifiable implements IElement {
    eligibleProperty: TPigId[];
    icon?: string;
    constructor(itm: IElement) {
        super(itm);
        this.eligibleProperty = itm.eligibleProperty || [];
        this.icon = itm.icon;
    }
    set(itm: IElement) {
        super.set(itm);
        this.eligibleProperty = itm.eligibleProperty || [];
        this.icon = itm.icon;
    }
    get() {
        return {
            ...super.get(),
            eligibleProperty: this.eligibleProperty,
            icon: this.icon
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
interface IAnElement extends IIdentifiable {
    hasProperty: TPigId[];  // constraint: must be UUIDs of AProperty
}
abstract class AnElement extends Identifiable implements IAnElement {
    hasProperty: TPigId[];  // constraint: must be UUIDs of AProperty
    constructor(itm: IAnElement) {
        super(itm);
        this.hasProperty = itm.hasProperty || [];
    }
    set(itm: IAnElement) {
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
interface IAModelElement extends IAnElement {
}
abstract class AModelElement extends AnElement implements IAModelElement {
    constructor(itm: IAModelElement) {
        super(itm);
    }
    set(itm: IAModelElement) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
}

//////////////////////////////////////
// The classes to instantiate:
export interface IProperty extends IIdentifiable {
    datatype: XsDataType;   // constraint: must be one of the XsDataType values
    minCount?: number;      // optional, default is 0 (not required), property is required if minCount>0
    maxCount?: number;      // optional, default is 1 (single value), property is multivalued if maxCount>1
    maxLength?: number;     // optional, default is 0 (no limit), for properties with datatype String
    pattern?: string;       // optional, default is empty string (no pattern), for properties with datatype String
    minInclusive?: number;  // optional, default is 0 (no limit), for properties with datatype Integer or Double
    maxInclusive?: number;  // optional, default is 0 (no limit), for properties with datatype Integer or Double
    composedProperty?: TPigId[];     // optional, constraint: must be UUIDs of Property
    defaultValue?: any;     // optional, default is undefined (no default value), maps to sh:defaultValue in SHACL,
                            // constraint: must match the datatype and range defined by this Property
    // Consider to call it 'value' instead of 'defaultValue' here, as it is formally the same as the value of a property

/*  Proposed by GitHub Copilot:
    isReadOnly?: boolean;  // optional, default is false
    isSearchable?: boolean;  // optional, default is false
    isFilterable?: boolean;  // optional, default is false
    isSortable?: boolean;  // optional, default is false
    isVisible?: boolean;  // optional, default is true */
}
export class Property extends Identifiable implements IProperty {
    // ToDo: ComplexType is not yet implemented
    readonly type: PigItemType;
    datatype: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    composedProperty?: TPigId[];
    defaultValue?: any;
    constructor(itm: IProperty) {
        super(itm);
        this.type = PigItemType.Property;
        this.datatype = itm.datatype;
        this.minCount = itm.minCount || 0;
        this.maxCount = itm.maxCount || 1;
        this.maxLength = itm.maxLength;
        this.pattern = itm.pattern;
        this.minInclusive = itm.minInclusive;
        this.maxInclusive = itm.maxInclusive;
        this.composedProperty = itm.composedProperty;
        this.defaultValue = itm.defaultValue;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IProperty) {
        super.set(itm);
        this.datatype = itm.datatype;
        this.minCount = itm.minCount || 0;
        this.maxCount = itm.maxCount || 1;
        this.maxLength = itm.maxLength;
        this.pattern = itm.pattern;
        this.minInclusive = itm.minInclusive;
        this.maxInclusive = itm.maxInclusive;
        this.composedProperty = itm.composedProperty;
        this.defaultValue = itm.defaultValue;
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
            composedProperty: this.composedProperty,
            defaultValue: this.defaultValue
       };
    }
    validate(itm: IProperty) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type)
            throw new Error(`Expected Property, but got ${itm.type}`);
        if (!Object.values(XsDataType).includes(itm.datatype))
            throw new Error(`Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IOrganizer extends IElement {
    // If the following is empty or undefined, any instantiated organizer is not constrained wrt the model element it references:
    eligibleElement: TPigId[];  // constraint: must be UUIDs of Element, thus of Entity, Relationship or Organizer
}
export class Organizer extends Element implements IOrganizer {
    readonly type: PigItemType;
    eligibleElement: TPigId[];
    constructor(itm: IOrganizer) {
        super(itm);
        this.type = PigItemType.Organizer;
        this.eligibleElement = itm.eligibleElement || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IOrganizer) {
        super.set(itm);
        this.eligibleElement = itm.eligibleElement || [];
    }
    get() {
        return {
            ...super.get(),
            eligibleElement: this.eligibleElement
        };
    }
    validate(itm: IOrganizer) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected Organizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IEntity extends IModelElement {
}
export class Entity extends ModelElement implements IEntity {
    readonly type: PigItemType;
    constructor(itm: IEntity) {
        super(itm);
        this.type = PigItemType.Entity;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IEntity) {
        super.set(itm);
    }
    get() {
        return super.get()
    }
    validate(itm: IEntity) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type)
            throw new Error(`Expected Entity, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IRelationship extends IModelElement {
    // If any of the following are empty or undefined, any instantiated relationship is not constrained wrt subject and/or object:
    eligibleSource?: TPigId[];  // constraint: must be UUIDs of ModelElement, thus of Entity or Relationship
    eligibleTarget?: TPigId[];  // constraint: must be UUIDs of ModelElement, thus of Entity or Relationship
}
export class Relationship extends ModelElement implements IRelationship {
    readonly type: PigItemType;
    eligibleSource?: TPigId[];
    eligibleTarget?: TPigId[];
    constructor(itm: IRelationship) {
        super(itm);
        this.type = PigItemType.Relationship;
        this.eligibleSource = itm.eligibleSource || []; 
        this.eligibleTarget = itm.eligibleTarget || [];
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IRelationship) {
        super.set(itm);
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
    }
    get() {
        return {
            ...super.get(),
            eligibleSource: this.eligibleSource,
            eligibleTarget: this.eligibleTarget
        };
    }
    validate(itm: IRelationship) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected Relationship, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
// Concrete Children Classes
export interface IAProperty {
    type: PigItemType;
    hasClass: TPigId;  // constraint: must be UUID of Property
    aComposedProperty?: TPigId[];  // optional, constraint: must be UUIDs of AProperty
    value: any;  // the value of the property, must match the datatype and range defined by Property
}
export class AProperty implements IAProperty {
    // ToDo: ComplexType is not yet implemented
    readonly type: PigItemType;
    hasClass!: TPigId;
    aComposedProperty?: TPigId[];
    value!: any;  
    constructor(itm: IAProperty) {
        this.type = PigItemType.aProperty;
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IAProperty) {
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
    }
    get() {
        return {
            type: this.type,
            hasClass: this.hasClass,
            aComposedProperty: this.aComposedProperty,
            value: this.value
        };
    }
    validate(itm: IAProperty) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type)
            throw new Error(`Expected AProperty, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IAnOrganizer extends IAnElement {
    hasClass: TPigId;  // constraint: must be UUID of Organizer
    // Hierarchy elements must reference exactly one model element, but diagrams can reference ('show') one or more model elements:
    hasElement: TPigId[];  // constraint: must be UUIDs of objects of AnElement, thus of AnEntity, ARelationship or AnOrganizer
}
export class AnOrganizer extends AnElement implements IAnOrganizer {
    readonly type: PigItemType;
    hasClass!: TPigId;
    hasElement!: TPigId[];
    constructor(itm: IAnOrganizer) {
        super(itm);
        this.type = PigItemType.anOrganizer;
        this.hasClass = itm.hasClass;
        this.hasElement = itm.hasElement;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IAnOrganizer) {
        super.set(itm);
        this.hasClass = itm.hasClass;
        this.hasElement = itm.hasElement;
    }
    get() {
        return {
            ...super.get(),
            hasClass: this.hasClass,
            hasElement: this.hasElement,
        };
    }
    validate(itm: IAnOrganizer) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type) {
            throw new Error(`Expected AnOrganizer, but got ${itm.type}`);
        };
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IAnEntity extends IAModelElement {
}
export class AnEntity extends AModelElement implements IAnEntity {
    readonly type: PigItemType;
    constructor(itm: IAnEntity) {
        super(itm);
        this.type = PigItemType.anEntity;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IAnEntity) {
        super.set(itm);
    }
    get() {
        return super.get()
    }
    validate(itm: IAnEntity) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type)
            throw new Error(`Expected AnEntity, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IARelationship extends IAModelElement {
    hasSource: TPigId;  // constraint: must be UUID of AnEntity or ARelationship
    hasTarget: TPigId;  // constraint: must be UUID of AnEntity or ARelationship
}
export class ARelationship extends AModelElement implements IARelationship {
    readonly type: PigItemType;
    hasSource!: TPigId;
    hasTarget!: TPigId;
    constructor(itm: IARelationship) {
        super(itm);
        this.type = PigItemType.aRelationship;
        this.hasSource = itm.hasSource;
        this.hasTarget = itm.hasTarget;
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IARelationship) {
        super.set(itm);
        this.hasSource = itm.hasSource;
        this.hasTarget = itm.hasTarget;
    }
    get() {
        return {
            ...super.get(),
            hasSource: this.hasSource,
            hasTarget: this.hasTarget
        };
    }
    validate(itm: IARelationship) {
        // Terminate in case of a programming error:
        if (itm.type !== this.type)
            throw new Error(`Expected ARelationship, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
