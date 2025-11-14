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
export type TPigElement = Entity | Relationship;
export type TPigAnElement = AnEntity | ARelationship;
export type TPigItem = TPigClass | TPigAnElement;

export const PigItemType = {
    // PIG classes:
    Property: 'pig:Property',
    Entity: 'pig:Entity',
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    anEntity: 'pig:anEntity',
    aRelationship: 'pig:aRelationship'
} as const;
export type PigItemTypeValue = typeof PigItemType[keyof typeof PigItemType];

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

export interface IIdentifiable {
    id: TPigId;  // translates to @id in JSON-LD
    type: PigItemTypeValue;
    title: string;
    description?: string;
}
abstract class Identifiable implements IIdentifiable {
    id!: TPigId;
    type!: PigItemTypeValue;
    title!: string;
    description?: string;
    constructor(itm: IIdentifiable) {
        this.set(itm);
    }
    set(itm: IIdentifiable) {
        this.id = itm.id;
        // do not override this.type here — subclasses set their own readonly type
        this.title = itm.title;
        this.description = itm.description;
    }
    get() {
        return {
            id: this.id,
            type: this.type,
            title: this.title,
            description: this.description
        };
    }
}

export interface IElement extends IIdentifiable {
    eligibleProperty: TPigId[];  // references by IRI
    icon?: string;  // optional, default is undefined (no icon)
}
export abstract class Element extends Identifiable implements IElement {
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

export interface IAnElement extends IIdentifiable {
    revision: TRevision;
    priorRevision?: TRevision[];  // optional
    modified: Date;
    creator?: string;
    hasProperty: TPigId[];  // references by IRI
}
export abstract class AnElement extends Identifiable implements IAnElement {
    revision!: TRevision;
    priorRevision?: TRevision[];
    modified!: Date;
    creator?: string;
    hasProperty: TPigId[];
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
// For the concrete classes:
export interface IProperty extends IIdentifiable {
    datatype: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    composedProperty?: TPigId[];
    defaultValue?: any;
}
export class Property extends Identifiable implements IProperty {
    readonly type: PigItemTypeValue = PigItemType.Property;
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
        this.datatype = itm.datatype;
        this.minCount = itm.minCount || 0;
        this.maxCount = itm.maxCount || 1;
        this.maxLength = itm.maxLength;
        this.pattern = itm.pattern;
        this.minInclusive = itm.minInclusive;
        this.maxInclusive = itm.maxInclusive;
        this.composedProperty = itm.composedProperty;
        this.defaultValue = itm.defaultValue;
        this.validate(itm);
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
        // if caller provided a type, ensure it matches expected
        if ((itm as any).type && (itm as any).type !== this.type)
            throw new Error(`Expected ${this.type}, but got ${(itm as any).type}`);
        if (!Object.values(XsDataType).includes(itm.datatype))
            throw new Error(`Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`);
        return 0;
    }
}

export interface IEntity extends IElement {
    subClassOf?: TPigId;
}
export class Entity extends Element implements IEntity {
    readonly type: PigItemTypeValue = PigItemType.Entity;
    subClassOf?: TPigId;
    constructor(itm: IEntity) {
        super(itm);
        this.subClassOf = itm.subClassOf;
        this.validate(itm);
    }
    set(itm: IEntity) {
        super.set(itm);
        this.subClassOf = itm.subClassOf;
    }
    get() {
        return {
            ...super.get(),
            subClassOf: this.subClassOf
        };
    }
    validate(_itm: IEntity) {
        // ToDo: implement validation logic
        return 0;
    }
}

export interface IRelationship extends IElement {
    subClassOf?: TPigId;
    eligibleSource?: TPigElement[];  // model element IRIs (TPigElement is still class types, interpret as IDs in usage)
    eligibleTarget?: TPigElement[];
}
export class Relationship extends Element implements IRelationship {
    readonly type: PigItemTypeValue = PigItemType.Relationship;
    subClassOf?: TPigId;
    eligibleSource?: TPigElement[];
    eligibleTarget?: TPigElement[];
    constructor(itm: IRelationship) {
        super(itm);
        this.subClassOf = itm.subClassOf;
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
        this.validate(itm);
    }
    set(itm: IRelationship) {
        super.set(itm);
        this.subClassOf = itm.subClassOf;
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
    }
    get() {
        return {
            ...super.get(),
            subClassOf: this.subClassOf,
            eligibleSource: this.eligibleSource,
            eligibleTarget: this.eligibleTarget
        };
    }
    validate(_itm: IRelationship) {
        // ToDo: implement validation logic
        return 0;
    }
}

// For the instances/individuals, the 'payload':
export interface IAProperty extends IIdentifiable {
    hasClass: TPigId;
    aComposedProperty?: TPigId[];
    value: any;
}
export class AProperty extends Identifiable implements IAProperty {
    readonly type: PigItemTypeValue = PigItemType.aProperty;
    hasClass!: TPigId;
    aComposedProperty?: TPigId[];
    value: any;
    constructor(itm: IAProperty) {
        super(itm);
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
        this.validate(itm);
    }
    set(itm: IAProperty) {
        super.set(itm);
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
    }
    get() {
        return {
            ...super.get(),
            hasClass: this.hasClass,
            aComposedProperty: this.aComposedProperty,
            value: this.value
        };
    }
    validate(itm: IAProperty) {
        if ((itm as any).type && (itm as any).type !== this.type)
            throw new Error(`Expected ${this.type}, but got ${(itm as any).type}`);
        return 0;
    }
}

export interface IAnEntity extends IAnElement {
    // instance type marker
}
export class AnEntity extends AnElement implements IAnEntity {
    readonly type: PigItemTypeValue = PigItemType.anEntity;
    constructor(itm: IAnEntity) {
        super(itm);
        this.validate(itm);
    }
    set(itm: IAnEntity) {
        super.set(itm);
    }
    get() {
        return super.get();
    }
    validate(_itm: IAnEntity) {
        return 0;
    }
}

export interface IARelationship extends IAnElement {
    hasSource: TPigId;
    hasTarget: TPigId;
}
export class ARelationship extends AnElement implements IARelationship {
    readonly type: PigItemTypeValue = PigItemType.aRelationship;
    hasSource!: TPigId;
    hasTarget!: TPigId;
    constructor(itm: IARelationship) {
        super(itm);
        this.hasSource = itm.hasSource;
        this.hasTarget = itm.hasTarget;
        this.validate(itm);
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
        if ((itm as any).type && (itm as any).type !== this.type)
            throw new Error(`Expected ${this.type}, but got ${(itm as any).type}`);
        return 0;
    }
}

/* Simple runtime type-guards */
export function isProperty(obj: any): obj is Property {
    return !!obj && obj.type === PigItemType.Property;
}
export function isAProperty(obj: any): obj is AProperty {
    return !!obj && obj.type === PigItemType.aProperty;
}
export function isEntity(obj: any): obj is Entity {
    return !!obj && obj.type === PigItemType.Entity;
}
export function isAnEntity(obj: any): obj is AnEntity {
    return !!obj && obj.type === PigItemType.anEntity;
}
export function isRelationship(obj: any): obj is Relationship {
    return !!obj && obj.type === PigItemType.Relationship;
}
export function isARelationship(obj: any): obj is ARelationship {
    return !!obj && obj.type === PigItemType.aRelationship;
}