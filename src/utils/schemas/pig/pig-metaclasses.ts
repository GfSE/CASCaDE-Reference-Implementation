/** Product Information Graph (PIG) Scaffold - the basic object structure representing the PIG
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - The PIG classes contain *only* the elements in the metamodel; it could be generated from the metamodel.
*   - abstract classes are not exported, only the concrete classes.
*   - All names are always in singular form, even if they have multiple values.
*   - The itemType is explicitly stored with each item to support searching (in the cache or database).
*   - The 'AProperty' instances are instantiated as part their parent objects 'AnEntity' or 'ARelationship'.
*   - similarly, the 'AReference' instances are instantiated as part their parent objects 'AnEntity'.
*   - both 'AProperty' and 'AReference' have no identifier and no revision history of their own.
*   - Other objects are referenced by IRIs (TPigId) to avoid inadvertant duplication of objects ... at the cost of repeated cache access.
*     This means the code must resolve any reference by reading the referenced object explicitly from cache, when needed.
*   - To avoid access to the cache in the validation methods, the validation of references to classes shall be done in an overall consistency check
*     before the items are instantiated here.
*/

import { xhrOk } from "../../lib/helper";

export type TPigId = string;  // an IRI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Property | Reference | Entity | Relationship;
export type TPigElement = Entity | Relationship;
export type TPigAnElement = AnEntity | ARelationship;
export type TPigItem = TPigClass | TPigAnElement;
export type stringHTML = string;  // contains HTML code
export type tagIETF = string; // contains IETF language tag

export const PigItemType = {
    // PIG classes:
    Property: 'pig:Property',
    Reference: 'pig:Reference',
    Entity: 'pig:Entity',
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    aReference: 'pig:aReference',
    anEntity: 'pig:anEntity',
    aRelationship: 'pig:aRelationship'
} as const;
export type PigItemTypeValue = typeof PigItemType[keyof typeof PigItemType];

/* same as above, but using 'type' instead of 'const enum':
export type PigItemTypeValue = 'pig:Property' | 'pig:Reference' | 'pig:Entity' | 'pig:Relationship' | 'pig:aProperty' | 'pig:aReference' | 'pig:anEntity' | 'pig:aRelationship';
export const PigItemType: Record<'Property' | 'Reference' | 'Entity' | 'Relationship' | 'aProperty' | 'aReference' | 'anEntity' | 'aRelationship', PigItemTypeValue> = {
    // PIG classes:
    Property: 'pig:Property',
    Reference: 'pig:Reference',
    Entity: 'pig:Entity',
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    aReference: 'pig:aReference',
    anEntity: 'pig:anEntity',
    aRelationship: 'pig:aRelationship'
};*/
export enum XsDataType {
    Boolean = 'xs:boolean',
    Integer = 'xs:integer',
    Double = 'xs:double',
    String = 'xs:string',
    AnyURI = 'xs:anyURI',
    DateTime = 'xs:dateTime',
    Duration = 'xs:duration',
    ComplexType = 'xs:complexType'
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

interface IItemType {
    itemType: PigItemTypeValue;
}
interface IIdentifiable {
    itemType: PigItemTypeValue;
    id: TPigId;  // translates to @id in JSON-LD
    title: ILanguageText;
    description?: ILanguageText;
}
abstract class Identifiable implements IIdentifiable {
    readonly itemType!: PigItemTypeValue;
    id!: TPigId;
    title!: ILanguageText;
    description?: ILanguageText;
    constructor(itm: IItemType) {
        this.itemType = itm.itemType;
    }
    /*constructor(itm: IIdentifiable) {
        this.id = itm.id;
        this.itemType = itm.itemType;
        this.title = itm.title;
        this.description = itm.description;
    }*/
    set(itm: IIdentifiable) {
        if (this.id && itm.id !== this.id)
            throw new Error(`Cannot change the id of an item (tried to change from ${this.id} to ${itm.id})`);
        if (itm.itemType !== this.itemType)
            throw new Error(`Cannot change the itemType of an item (tried to change from ${this.itemType} to ${itm.itemType})`);
        this.id = itm.id;
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

interface IElement extends IIdentifiable {
    eligibleProperty: TPigId[];
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
        //    eligibleProperty: this.eligibleProperty.map(p=>p.get()),
            icon: this.icon
        };
    }
}

interface IAnElement extends IIdentifiable {
    revision: TRevision;
    priorRevision?: TRevision[];  // optional
    modified: Date;
    creator?: string;
    hasProperty?: IAProperty[];  // a JSON object on input - ToDo: define the json schema for property values
}
abstract class AnElement extends Identifiable implements IAnElement {
    revision!: TRevision;
    priorRevision?: TRevision[];
    modified!: Date;
    creator?: string;
    hasProperty: AProperty[]; // instantiated AProperty items
    constructor(itm: IAnElement) {
        super(itm);
        this.hasProperty = itm.hasProperty ? itm.hasProperty.map(i => new AProperty(i)) : [];
    }
    set(itm: IAnElement) {
        super.set(itm);
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.hasProperty = itm.hasProperty ? itm.hasProperty.map(i => new AProperty(i)) : [];
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
    datatype: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;  // only used for string datatype
    pattern?: string;  // a RegExp pattern, only used for string datatype
    minInclusive?: number;  // only used for numeric datatypes
    maxInclusive?: number;  // only used for numeric datatypes
    composedProperty?: TPigId[];  // must be IRI of another Property, no cyclic references
    defaultValue?: string;   // in PIG, values of all datatypes are strings
}
export class Property extends Identifiable implements IProperty {
    datatype!: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    composedProperty?: TPigId[];
    defaultValue?: string;
    constructor() {
        super({itemType:PigItemType.Property});
    }
    set(itm: IProperty) {
        const xhr = this.validate(itm);
        if (xhr.ok) {
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
        return xhr;
    }
    setJSONLD(itm: any) {
        itm.id = itm['@id'];
    //    delete itm['@id'];
        return this.set(itm);
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
    getJSONLD() {
        const { id, ...rest } = this.get();
        return { '@id': id, ...rest };
    /*    const src = this.get();
        const itm = { ...src, ['@id']: src.id };
        delete itm.id;
        return itm; */
    }
    validate(itm: IProperty) {
        // if caller provided a itemType, ensure it matches expected
        if (!itm.itemType || itm.itemType !== PigItemType.Property)
            throw new Error(`Expected 'Property', but got ${itm.itemType}`);
        if (!Object.values(XsDataType).includes(itm.datatype))
            throw new Error(`Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`);
        // ToDo: implement further validation logic
        return xhrOk;
    }
}
/* export class Property extends Identifiable implements IProperty {
    datatype: XsDataType;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    composedProperty?: TPigId[];
    defaultValue?: string;
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
        this.validate();
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
        return this.validate();
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
    validate() {
        // if caller provided a itemType, ensure it matches expected
        if (!this.itemType || this.itemType !== PigItemType.Property)
            throw new Error(`Expected 'Property', but got ${this.itemType}`);
        if (!Object.values(XsDataType).includes(this.datatype))
            throw new Error(`Invalid datatype: ${this.datatype}. Must be one of the XsDataType values.`);
        // ToDo: implement further validation logic
        return xhrOk;
    }
} */
export interface IReference extends IIdentifiable {
    range: TPigId[];  // must be IRI of an Entity or Relationship (class)
}
export class Reference extends Identifiable implements IReference {
    range: TPigId[];
    constructor(itm: IReference) {
        super(itm);
        this.range = itm.range;
        this.validate();
    }
    set(itm: IReference) {
        super.set(itm);
        this.range = itm.range;
        return this.validate();
    }
    get() {
        return {
            ...super.get(),
            range: this.range
        };
    }
    validate() {
        // if caller provided a itemType, ensure it matches expected
        if (!this.itemType || this.itemType !== PigItemType.Reference)
            throw new Error(`Expected 'Reference', but got ${this.itemType}`);
        // ToDo: implement further validation logic
        return xhrOk;
    }
}

export interface IEntity extends IElement {
    specializes?: TPigId;  // must be IRI of another Entity, no cyclic references, translates to rdfs:subClassOf
    eligibleReference?: TPigId[];  // must hold Reference IRIs
}
export class Entity extends Element implements IEntity {
    readonly specializes?: TPigId;
    eligibleReference?: TPigId[];
    constructor(itm: IEntity) {
        super(itm);
        this.specializes = itm.specializes;
        this.eligibleReference = itm.eligibleReference || [];
        this.validate();
    }
    set(itm: IEntity) {
        super.set(itm);
        // do not allow changing 'specializes' after creation
        this.eligibleReference = itm.eligibleReference || [];
        return this.validate();
    }
    get() {
        return {
            ...super.get(),
            specializes: this.specializes,
            eligibleReference: this.eligibleReference
        };
    }
    validate() {
        if (!this.itemType || this.itemType !== PigItemType.Entity)
            throw new Error(`Expected 'Entity', but got ${this.itemType}`);
        // ToDo: implement further validation logic
        return xhrOk;
    }
}

export interface IRelationship extends IElement {
    specializes?: TPigId;  // must be IRI of another Relationship, no cyclic references, translates to rdfs:subClassOf
    eligibleSource?: TPigId[];  // must hold Reference IRIs
    eligibleTarget?: TPigId[];  // must hold Reference IRIs
}
export class Relationship extends Element implements IRelationship {
    readonly specializes?: TPigId;
    eligibleSource?: TPigId[];
    eligibleTarget?: TPigId[];
    constructor(itm: IRelationship) {
        super(itm);
        this.specializes = itm.specializes;
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
        this.validate();
    }
    set(itm: IRelationship) {
        super.set(itm);
        // do not allow changing 'specializes' after creation
        this.eligibleSource = itm.eligibleSource || [];
        this.eligibleTarget = itm.eligibleTarget || [];
        return this.validate();
    }
    get() {
        return {
            ...super.get(),
            specializes: this.specializes,
            eligibleSource: this.eligibleSource,
            eligibleTarget: this.eligibleTarget
        };
    }
    validate() {
        if (!this.itemType || this.itemType !== PigItemType.Relationship)
            throw new Error(`Expected 'Relationship', but got ${this.itemType}`);
        // ToDo: implement further validation logic
        return xhrOk;
    }
}

// For the instances/individuals, the 'payload':
export interface IAProperty {
    itemType: PigItemTypeValue;
    hasClass: TPigId;  // must be IRI of an element of type Pig:Property, translates to @type resp. rdf:type
    aComposedProperty?: TPigId[];
    value: string;
}
export class AProperty implements IAProperty {
    readonly itemType!: PigItemTypeValue;
    hasClass!: TPigId;
    aComposedProperty?: TPigId[];
    value: string;
    constructor(itm: IAProperty) {
        this.itemType = PigItemType.aProperty;
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
        this.validate();
    }
    set(itm: IAProperty) {
        // itemType is readonly
        this.hasClass = itm.hasClass;
        this.aComposedProperty = itm.aComposedProperty;
        this.value = itm.value;
        return this.validate();
    }
    get() {
        return {
            itemType: this.itemType,
            hasClass: this.hasClass,
            aComposedProperty: this.aComposedProperty,
            value: this.value
        };
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML snippet with the property value
        return '';
    }
    validate() {
        if (!this.itemType || this.itemType !== PigItemType.aProperty)
            throw new Error(`Expected 'aProperty', but got ${this.itemType}`);
        if (!this.hasClass)
            throw new Error(`Property instance must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return xhrOk;
    }
}
export interface IAReference {
    itemType: PigItemTypeValue;
    hasClass: TPigId;  // must be IRI of an element of type Pig:Reference, translates to @type resp. rdf:type
    element: TPigId;
}
export class AReference implements IAReference {
    readonly itemType!: PigItemTypeValue;
    hasClass!: TPigId;
    element: TPigId;
    constructor(itm: IAReference) {
        this.itemType = PigItemType.aReference;
        this.hasClass = itm.hasClass;
        this.element = itm.element;
        this.validate();
    }
    set(itm: IAReference) {
        // itemType is readonly
        this.hasClass = itm.hasClass;
        this.element = itm.element;
        return this.validate();
    }
    get() {
        return {
            itemType: this.itemType,
            hasClass: this.hasClass,
            element: this.element
        };
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML snippet with a link to the referenced element
        return '';
    }
    validate() {
        if (!this.itemType || this.itemType !== PigItemType.aReference)
            throw new Error(`Expected 'aReference', but got ${this.itemType}`);
        if (!this.hasClass)
            throw new Error(`Reference instance must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Reference IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return xhrOk;
    }
}

export interface IAnEntity extends IAnElement {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Entity, translates to @type resp. rdf:type
    hasReference?: IAReference[];  // optional, must hold anEntity or aRelationship IRIs
}
export class AnEntity extends AnElement implements IAnEntity {
    hasClass: TPigId;
    hasReference: AReference[];
    constructor(itm: IAnEntity) {
        super(itm);
        this.hasClass = itm.hasClass;
        this.hasReference = itm.hasReference ? itm.hasReference.map(i => new AReference(i)) : [];
        this.validate();
    }
    set(itm: IAnEntity) {
        super.set(itm);
        this.hasClass = itm.hasClass;
        this.hasReference = itm.hasReference ? itm.hasReference.map(i => new AReference(i)) : [];
        return this.validate();
    }
    get() {
        return {
            ... super.get(),
            hasClass: this.hasClass,
            hasReference: this.hasReference.map(r => r.get())
        };
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML representation of the entity including its properties
        return '';
    }
    validate() {
        if (!this.itemType || this.itemType !== PigItemType.anEntity)
            throw new Error(`Expected 'anEntity', but got ${this.itemType}`);
        if (!this.hasClass)
            throw new Error(`'anEntity' must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Entity IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return xhrOk;
    }
}

export interface IARelationship extends IAnElement {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Relationship, translates to @type resp. rdf:type
    hasSource: IAReference;
    hasTarget: IAReference;
}
export class ARelationship extends AnElement implements IARelationship {
    hasClass: TPigId;
    hasSource!: AReference;
    hasTarget!: AReference;
    constructor(itm: IARelationship) {
        super(itm);
        this.hasClass = itm.hasClass;
        this.hasSource = new AReference(itm.hasSource);
        this.hasTarget = new AReference(itm.hasTarget);
        this.validate();
    }
    set(itm: IARelationship) {
        super.set(itm);
        this.hasClass = itm.hasClass;
        this.hasSource = new AReference(itm.hasSource);
        this.hasTarget = new AReference(itm.hasTarget);
        return this.validate();
    }
    get() {
        return {
            ...super.get(),
            hasClass: this.hasClass,
            hasSource: this.hasSource,
            hasTarget: this.hasTarget
        };
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML representation of the relationship including its properties
        return '';
    }
    validate() {
        if (!this.itemType || this.itemType !== PigItemType.aRelationship)
            throw new Error(`Expected 'aRelationship', but got ${this.itemType}`);
        if (!this.hasClass)
            throw new Error(`'aRelationship' must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return xhrOk;
    }
}

/* Simple runtime type-guards */
export function isProperty(obj: Identifiable): obj is Property {
    return !!obj && obj.itemType === PigItemType.Property;
}
export function isReference(obj: Identifiable): obj is Reference {
    return !!obj && obj.itemType === PigItemType.Reference;
}
export function isEntity(obj: Identifiable): obj is Entity {
    return !!obj && obj.itemType === PigItemType.Entity;
}
export function isAnEntity(obj: Identifiable): obj is AnEntity {
    return !!obj && obj.itemType === PigItemType.anEntity;
}
export function isRelationship(obj: Identifiable): obj is Relationship {
    return !!obj && obj.itemType === PigItemType.Relationship;
}
export function isARelationship(obj: Identifiable): obj is ARelationship {
    return !!obj && obj.itemType === PigItemType.aRelationship;
}
