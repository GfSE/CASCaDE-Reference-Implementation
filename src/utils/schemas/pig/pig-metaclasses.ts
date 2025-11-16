/** Product Information Graph (PIG) Scaffold - the basic object structure representing the PIG
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - The PIG classes contain *only* the elements in the metamodel; it could be generated from the metamodel.
*   - All names are always in singular form, even if they have multiple values.
*   - The itemType is explicitly stored with each item to support searching (in the cache or database).
*   - The 'AProperty' instances are instantiated as part their parent objects 'AnEntity' or 'ARelationship';
*     they have no identifier and no revision history of their own.
*   - Other objects are referenced by IRIs (TPigId) to avoid inadvertant duplication of objects ... at the cost of repeated cache access.
*     This means the code must resolve any reference by reading the referenced object explicitly from cache, when needed.
*   - To avoid access to the cache in the validation methods, the validation of references to classes shall be done in an overall consistency check
*     before the items are instantiated here.
*/

export type TPigId = string;  // an IRI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Property | Entity | Relationship;
export type TPigElement = Entity | Relationship;
export type TPigAnElement = AnEntity | ARelationship;
export type TPigItem = TPigClass | TPigAnElement;
export type stringHTML = string;  // contains HTML code
export type tagIETF = string; // contains IETF language tag

/*export const PigItemType = {
    // PIG classes:
    Property: 'pig:Property',
    Entity: 'pig:Entity',
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    anEntity: 'pig:anEntity',
    aRelationship: 'pig:aRelationship'
} as const;
export type PigItemTypeValue = typeof PigItemType[keyof typeof PigItemType]; */

export type PigItemTypeValue = 'pig:Property' | 'pig:Entity' | 'pig:Relationship' | 'pig:aProperty' | 'pig:anEntity' | 'pig:aRelationship';
export const PigItemType: Record<'Property' | 'Entity' | 'Relationship' | 'aProperty' | 'anEntity' | 'aRelationship', PigItemTypeValue> = {
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
    IRI: string; // e.g. a namespace value, e.g. "https://product-information-graph.gfse.org/"
}
export interface ILanguageText {
    text: string;
    lang?: tagIETF;
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
    itemType: PigItemTypeValue;
    title: ILanguageText;
    description?: ILanguageText;
}
abstract class Identifiable implements IIdentifiable {
    id!: TPigId;
    itemType!: PigItemTypeValue;
    title!: ILanguageText;
    description?: ILanguageText;
    constructor(itm: IIdentifiable) {
        this.set(itm);
    }
    set(itm: IIdentifiable) {
        this.id = itm.id;
        // do not override this.itemType here — subclasses set their own readonly itemType
        this.title = itm.title;
        this.description = itm.description;
    }
    get() {
        return {
            id: this.id,
            itemType: this.itemType,
            title: this.title,
            description: this.description
        };
    }
}

export interface IElement extends IIdentifiable {
    eligibleProperty: TPigId[];
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
        //    eligibleProperty: this.eligibleProperty.map(p=>p.get()),
            icon: this.icon
        };
    }
}

export interface IAnElement extends IIdentifiable {
    revision: TRevision;
    priorRevision?: TRevision[];  // optional
    modified: Date;
    creator?: string;
    hasProperty: object[];  // a JSON object on input - ToDo: define the json schema for property values
}
export abstract class AnElement extends Identifiable implements IAnElement {
    revision!: TRevision;
    priorRevision?: TRevision[];
    modified!: Date;
    creator?: string;
    hasProperty: AProperty[]; // instantiated AProperty items
    constructor(itm: IAnElement) {
        super(itm);
        this.hasProperty = instantiateListItems(PigItemType.aProperty, itm.hasProperty) || [];
    }
    set(itm: IAnElement) {
        super.set(itm);
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.hasProperty = instantiateListItems(PigItemType.aProperty, itm.hasProperty) || [];
    }
    get() {
        return {
            ...super.get(),
            revision: this.revision,
            priorRevision: this.priorRevision,
            modified: this.modified,
            creator: this.creator,
            hasProperty: this.hasProperty.map(p => p.get())
        };
    }
}

//////////////////////////////////////
// For the concrete classes:
export interface IProperty extends IIdentifiable {
    //    specializes?: TPigId;  // must be IRI of another Property, translates to rdfs:subPropertyOf
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
    readonly itemType: PigItemTypeValue = PigItemType.Property;
//    specializes?: TPigId;
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
        // if caller provided a itemType, ensure it matches expected
        if (!(itm as any).itemType || (itm as any).itemType !== PigItemType.Property)
            throw new Error(`Expected 'Property', but got ${(itm as any).itemType}`);
        if (!Object.values(XsDataType).includes(itm.datatype))
            throw new Error(`Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`);
        // ToDo: implement further validation logic
        return 0;
    }
}

export interface IEntity extends IElement {
    specializes?: TPigId;  // must be IRI of another Entity, translates to rdfs:subClassOf
}
export class Entity extends Element implements IEntity {
    readonly itemType: PigItemTypeValue = PigItemType.Entity;
    specializes?: TPigId;
    constructor(itm: IEntity) {
        super(itm);
        this.specializes = itm.specializes;
        this.validate(itm);
    }
    set(itm: IEntity) {
        super.set(itm);
        this.specializes = itm.specializes;
    }
    get() {
        return {
            ...super.get(),
            specializes: this.specializes
        };
    }
    validate(itm: IEntity) {
        if (!(itm as any).itemType || (itm as any).itemType !== PigItemType.Entity)
            throw new Error(`Expected 'Entity', but got ${(itm as any).itemType}`);
        // ToDo: implement further validation logic
        return 0;
    }
}

export interface IRelationship extends IElement {
    specializes?: TPigId;  // must be IRI of another Relationship, translates to rdfs:subClassOf
    eligibleSource?: TPigId[];  // must be Entity or Relationship IRIs
    eligibleTarget?: TPigId[];  // must be Entity or Relationship IRIs
}
export class Relationship extends Element implements IRelationship {
    readonly itemType: PigItemTypeValue = PigItemType.Relationship;
    specializes?: TPigId;
    eligibleSource?: TPigId[];
    eligibleTarget?: TPigId[];
    constructor(itm: IRelationship) {
        super(itm);
        this.specializes = itm.specializes;
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
        this.validate(itm);
    }
    set(itm: IRelationship) {
        super.set(itm);
        this.specializes = itm.specializes;
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
    }
    get() {
        return {
            ...super.get(),
            specializes: this.specializes,
            eligibleSource: this.eligibleSource,
            eligibleTarget: this.eligibleTarget
        };
    }
    validate(itm: IRelationship) {
        if (!(itm as any).itemType || (itm as any).itemType !== PigItemType.Relationship)
            throw new Error(`Expected 'Relationship', but got ${(itm as any).itemType}`);
        // ToDo: implement further validation logic
        return 0;
    }
}

// For the instances/individuals, the 'payload':
export interface IAProperty {
    itemType: PigItemTypeValue;
    hasClass: TPigId;  // must be IRI of an element of type Pig:Property, translates to @type resp. rdf:type
    aComposedProperty?: TPigId[];
    value: any;
}
export class AProperty implements IAProperty {
    readonly itemType: PigItemTypeValue = PigItemType.aProperty;
    hasClass!: TPigId;
    aComposedProperty?: TPigId[];
    value: any;
    constructor(itm: IAProperty) {
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
        this.validate(itm);
    }
    set(itm: IAProperty) {
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
    }
    get() {
        return {
            hasClass: this.hasClass,
            aComposedProperty: this.aComposedProperty,
            value: this.value
        };
    }
    getHTML(options: any): stringHTML {
        // ToDo: implement a HTML representation of the property value
        return '';
    }
    validate(itm: IAProperty) {
        if (!(itm as any).itemType || (itm as any).itemType !== PigItemType.aProperty)
            throw new Error(`Expected 'aProperty', but got ${(itm as any).itemType}`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return 0;
    }
}

export interface IAnEntity extends IAnElement {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Entity, translates to @type resp. rdf:type
}
export class AnEntity extends AnElement implements IAnEntity {
    readonly itemType: PigItemTypeValue = PigItemType.anEntity;
    hasClass: TPigId;
    constructor(itm: IAnEntity) {
        super(itm);
        this.validate(itm);
        this.hasClass = itm.hasClass;
    }
    set(itm: IAnEntity) {
        super.set(itm);
        this.hasClass = itm.hasClass;
    }
    get() {
        return {
            ... super.get(),
            hasClass: this.hasClass
        };
    }
    getHTML(options:any): stringHTML {
        // ToDo: implement a HTML representation of the entity including its properties
        return '';
    }
    validate(itm: IAnEntity) {
        if (!(itm as any).itemType || (itm as any).itemType !== PigItemType.anEntity)
            throw new Error(`Expected 'anEntity', but got ${(itm as any).itemType}`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Entity IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return 0;
    }
}

export interface IARelationship extends IAnElement {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Relationship, translates to @type resp. rdf:type
    hasSource: TPigId;
    hasTarget: TPigId;
}
export class ARelationship extends AnElement implements IARelationship {
    readonly itemType: PigItemTypeValue = PigItemType.aRelationship;
    hasClass: TPigId;
    hasSource!: TPigId;
    hasTarget!: TPigId;
    constructor(itm: IARelationship) {
        super(itm);
        this.hasClass = itm.hasClass;
        this.hasSource = itm.hasSource;
        this.hasTarget = itm.hasTarget;
        this.validate(itm);
    }
    set(itm: IARelationship) {
        super.set(itm);
        this.hasClass = itm.hasClass;
        this.hasSource = itm.hasSource;
        this.hasTarget = itm.hasTarget;
    }
    get() {
        return {
            ...super.get(),
            hasClass: this.hasClass,
            hasSource: this.hasSource,
            hasTarget: this.hasTarget
        };
    }
    getHTML(options: any): stringHTML {
        // ToDo: implement a HTML representation of the relationship including its properties
        return '';
    }
    validate(itm: IARelationship) {
        if (!(itm as any).itemType || (itm as any).itemType !== PigItemType.aRelationship)
            throw new Error(`Expected 'aRelationship', but got ${(itm as any).itemType}`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return 0;
    }
}

/* Simple runtime type-guards */
export function isProperty(obj: any): obj is Property {
    return !!obj && obj.itemType === PigItemType.Property;
}
export function isAProperty(obj: any): obj is AProperty {
    return !!obj && obj.itemType === PigItemType.aProperty;
}
export function isEntity(obj: any): obj is Entity {
    return !!obj && obj.itemType === PigItemType.Entity;
}
export function isAnEntity(obj: any): obj is AnEntity {
    return !!obj && obj.itemType === PigItemType.anEntity;
}
export function isRelationship(obj: any): obj is Relationship {
    return !!obj && obj.itemType === PigItemType.Relationship;
}
export function isARelationship(obj: any): obj is ARelationship {
    return !!obj && obj.itemType === PigItemType.aRelationship;
}
export function instantiateListItems(itemType: PigItemTypeValue, arr: any[]) {
    switch (itemType) {
        case PigItemType.aProperty: 
            return arr.map(i => new AProperty(i));
        default:
            console.error(`Unsupported item type for instantiation: ${itemType}`);  
    }
}
