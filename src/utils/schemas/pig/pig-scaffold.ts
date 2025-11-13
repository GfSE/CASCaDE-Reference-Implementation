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
export type TPigClass = Property | Entity | Relationship;
export type TPigInstance = AnEntity | ARelationship;
export type TPigItem = TPigClass | TPigInstance;
export const PigItemType = {
    // PIG classes:
    Property: 'pig:Property',
    Entity: 'pig:Entity', 
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    anEntity: 'pig:anEntity',
    aRelationship: 'pig:aRelationship'
};
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
export interface INamespace {
    tag: string; // e.g. a namespace tag, e.g. "pig:"
    IRI: string; // e.g. a namespace value, e.g. "https://product-iformation-graph.gfse.org/"
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
    title: string;
    description?: string;
}
abstract class Identifiable implements IIdentifiable {
    id!: TPigId;
    title!: string;
    description?: string;
    constructor(itm: IIdentifiable) {
        this.set(itm);
    }
    set(itm: IIdentifiable) {
        this.id = itm.id;
        this.title = itm.title;
        this.description = itm.description;
    }
    get() {
        return {
            id: this.id,
            title: this.title,
            description: this.description
        };
    }
}
export interface IElement extends IIdentifiable {
    eligibleProperty: Property[];  // constraint: must be UUIDs of Property
    icon?: string;  // optional, default is undefined (no icon)
}
export abstract class Element extends Identifiable implements IElement {
    eligibleProperty: Property[];
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
interface IAnElement extends IIdentifiable {
    revision: TRevision;
    priorRevision?: TRevision[];  // optional, used to trace revisions of the same item, usually has one element, but can have two in case of a merge
    modified: Date;
    creator?: string;
    hasProperty: AProperty[];  // constraint: must be UUIDs of AProperty
}
abstract class AnElement extends Identifiable implements IAnElement {
    revision!: TRevision;
    priorRevision?: TRevision[]; // optional, used to trace revisions of the same item, usually has one element, but can have two in case of a merge
    modified!: Date;
    creator?: string;
    hasProperty: AProperty[];  // constraint: must be UUIDs of AProperty
    constructor(itm: IAnElement) {
        super(itm);
        this.hasProperty = itm.hasProperty || [];
    }
    set(itm: IAnElement) {
        super.set(itm);
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.hasProperty = itm.hasProperty || [];
    }
    get() {
        return {
            ...super.get(),
            revision: this.revision,
            priorRevision: this.priorRevision,
            modified: this.modified,
            creator: this.creator,
            hasProperty: this.hasProperty
        };
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
    composedProperty?: Property[];     // optional, constraint: must be UUIDs of Property
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
    datatype: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    composedProperty?: Property[];
    defaultValue?: any;
    constructor(itm: IProperty) {
        super(itm);
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
        if (!Object.values(XsDataType).includes(itm.datatype))
            throw new Error(`Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IEntity extends IElement {
}
export class Entity extends Element implements IEntity {
    constructor(itm: IEntity) {
        super(itm);
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
    }
    set(itm: IEntity) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
    validate(itm: IEntity) {
        // Terminate in case of a programming error:
//        if (itm.type !== this.type)
//            throw new Error(`Expected Entity, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IRelationship extends IElement {
    // If any of the following are empty or undefined, any instantiated relationship is not constrained wrt subject and/or object:
    eligibleSource?: TPigId[];  // constraint: must be UUIDs of ModelElement, thus of Entity or Relationship
    eligibleTarget?: TPigId[];  // constraint: must be UUIDs of ModelElement, thus of Entity or Relationship
}
export class Relationship extends Element implements IRelationship {
    eligibleSource?: TPigId[];
    eligibleTarget?: TPigId[];
    constructor(itm: IRelationship) {
        super(itm);
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
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
//        if (itm.type !== this.type)
//            throw new Error(`Expected Relationship, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
// Concrete Children Classes
export interface IAProperty {
    type: Property;
    aComposedProperty?: AProperty[];  // optional, constraint: must be UUIDs of AProperty
    value: any;  // the value of the property, must match the datatype and range defined by Property
}
export class AProperty implements IAProperty {
    // ToDo: ComplexType is not yet implemented
    readonly type: Property;
    aComposedProperty?: AProperty[];
    value: any;  
    constructor(itm: IAProperty) {
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
        this.type = itm.type;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
    }
    set(itm: IAProperty) {
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
    }
    get() {
        return {
            type: this.type,
            aComposedProperty: this.aComposedProperty,
            value: this.value
        };
    }
    validate(itm: IAProperty) {
        // Terminate in case of a programming error:
//        if (itm.type !== this.type)
//            throw new Error(`Expected AProperty, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IAnEntity extends IAnElement {
    type: Entity;
}
export class AnEntity extends AnElement implements IAnEntity {
    readonly type: Entity;
    constructor(itm: IAnEntity) {
        super(itm);
        this.validate(itm);  // here we only terminate in case of a programming error.
        // Cannot return an error code, must call validate() separately upon creation.
        this.type = itm.type;
    }
    set(itm: IAnEntity) {
        super.set(itm);
    }
    get() {
        return super.get()
    }
    validate(itm: IAnEntity) {
        // Terminate in case of a programming error:
//        if (itm.type !== this.type)
//            throw new Error(`Expected AnEntity, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
export interface IARelationship extends IAnElement {
    hasSource: TPigId;  // constraint: must be UUID of AnEntity or ARelationship
    hasTarget: TPigId;  // constraint: must be UUID of AnEntity or ARelationship
}
export class ARelationship extends AnElement implements IARelationship {
    readonly type: string;
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
//        if (itm.type !== this.type)
//            throw new Error(`Expected ARelationship, but got ${itm.type}`);
        // Return an error code in case of invalid data:
        // ToDo: implement validation logic
        return 0;
    }
}
