/** Product Information Graph (PIG) Scaffold - the basic object structure representing the PIG
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - The PIG classes contain *only* the elements in the metamodel; it could be generated from the metamodel.
*   - Abstract classes are not exported, only the concrete classes.
*   - All names are always in singular form, even if they have multiple values.
*   - The itemType is explicitly stored with each item to support searching (in the cache or database) ... and for runtime checking.
*   - The 'AProperty' instances are instantiated as part their parent objects 'AnEntity' or 'ARelationship'.
*   - Similarly, the 'AReference' instances are instantiated as part their parent objects 'AnEntity'.
*   - Both 'AProperty' and 'AReference' have no identifier and no revision history of their own.
*   - Other objects are referenced by IRIs (TPigId) to avoid inadvertant duplication of objects ... at the cost of repeated cache access.
*     This means the code must resolve any reference by reading the referenced object explicitly from cache, when needed.
*   - To avoid access to the cache in the validation methods, the validation of references to classes shall be done in an overall consistency check
*     before the items are instantiated here.
*   - References to other items are stored as simple strings (the IRIs) to avoid deep object graphs;
*     those references are expanded to id objects only when serializing to JSON-LD.
*   - The 'get' methods return plain JSON objects matching the interfaces, suitable for serialization and persistence.
*   - The 'getJSONLD' and 'setJSONLD' methods handle conversion to/from JSON-LD representation.
*   - The 'set' methods are chainable to allow concise code when creating new instances.
*   - Programming errors result in exceptions, data errors in IRsp return values.
*/

import { RE } from "../../lib/definitions";
import { LIB } from "../../lib/helpers";
import { IRsp, rspOK, JsonPrimitive, JsonValue, JsonArray, JsonObject } from "../../lib/helpers";
// use central Ajv instance from the Vue plugin:
import { ajv } from '../../../plugins/ajv';
// optional: import type for better TS typing where needed
// import type Ajv from 'ajv';

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
// Type guard: checks whether a value is one of the XsDataType values
function isXsDataType(value: unknown): value is XsDataType {
    if (typeof value !== 'string') return false;
    const norm = value.replace(/^xsd:/,'xs:');
    return (Object.values(XsDataType) as string[]).includes(norm);
}
export interface INamespace {
    tag: string; // e.g. a namespace tag, e.g. "pig:"
    IRI: string; // e.g. a namespace value, e.g. "https://product-information-graph.gfse.org/"
}
export interface ILanguageText {
    value: string;
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

interface IItem {
    itemType: PigItemTypeValue;
}
abstract class Item implements IItem {
    readonly itemType!: PigItemTypeValue;
    protected lastStatus!: IRsp;
    protected constructor(itm: IItem) {
        this.itemType = itm.itemType;
    }
    status(): IRsp {
        return this.lastStatus;
    }
}
interface IIdentifiable extends IItem {
    id: TPigId;  // translates to @id in JSON-LD
    // Any one or both of the following must be present and have at least one item; see schemata:
    title?: ILanguageText[];
    description?: ILanguageText[];
}
abstract class Identifiable extends Item implements IIdentifiable {
    id!: TPigId;
    title?: ILanguageText[];
    description?: ILanguageText[];
    protected constructor(itm: IItem) {
        super(itm); // actual itemType set in concrete class
    }
    protected set(itm: IIdentifiable) {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
//        console.debug('Identifiable.set i: ', itm);
        this.id = itm.id;
        this.title = normalizeMultiLanguageText(itm.title);
        this.description = normalizeMultiLanguageText(itm.description);
//        console.debug('Identifiable.set o: ', this);
        // made chainable in concrete subclass
    }
    protected get() {
        return {
            id: this.id,
            itemType: this.itemType,
            title: this.title,
            description: this.description
        };
    }
    setJSONLD(itm: any) {
        let norm = LIB.renameJsonTags(itm as JsonValue, LIB.fromJSONLD, { mutate: false }) as any;
        // id extraction
        norm = replaceIdObjects(norm);
        this.set(norm);
        return this; // make chainable
    }
    getJSONLD() {
        const renamed = LIB.renameJsonTags(this.get() as unknown as JsonObject, LIB.toJSONLD, { mutate: false }) as JsonObject;
    //    console.debug('Identifiable.getJSONLD renamed: ', renamed);
        return makeIdObjects(renamed) as JsonObject;        
    }
    protected validate(itm: IIdentifiable) {
        if (itm.itemType !== this.itemType)
            throw new Error(`Cannot change the itemType of an item (tried to change from ${this.itemType} to ${itm.itemType})`);
        if (this.id && itm.id !== this.id)
            throw new Error(`Cannot change the id of an item (tried to change from ${this.id} to ${itm.id})`);

        // Ensure title is a multi-language text (array of ILanguageText)
        const tRes = validateMultiLanguageText(itm.title, 'title');
        if (!tRes.ok) return tRes;

        // description is optional, but when present must be an array of ILanguageText
        if (itm.description !== undefined) {
            const dRes = validateMultiLanguageText(itm.description, 'description');
            if (!dRes.ok) return dRes;
        }

        // ToDo: implement further validation logic
        return rspOK;
    }
}

interface IElement extends IIdentifiable {
    eligibleProperty?: TPigId[];
    icon?: string;  // optional, default is undefined (no icon)
}
abstract class Element extends Identifiable implements IElement {
    eligibleProperty?: TPigId[];
    icon?: string;
    protected constructor(itm: IItem) {
        super(itm); // actual itemType set in concrete class
    }
    protected set(itm: IElement) {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.eligibleProperty = itm.eligibleProperty;
        this.icon = itm.icon;
        // made chainable in concrete subclass
    }
    protected get() {
        return {
            ...super.get(),
            eligibleProperty: Array.isArray(this.eligibleProperty) ? this.eligibleProperty : undefined,
            icon: this.icon
        };
    }
    protected validate(itm: IElement) {
        // If eligibleProperty is not present, all properties are allowed;
        // if present and empty, no properties are allowed:
        const rsp = validateIdStringArray(itm.eligibleProperty, 'eligibleProperty', { canBeUndefined: true, minCount: 0 });
        if (!rsp.ok) return rsp;
        // ToDo: implement further validation logic
        return super.validate(itm);
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
    hasProperty!: AProperty[]; // instantiated AProperty items
    protected constructor(itm: IItem) {
        super(itm);
    }
    protected set(itm: IAnElement) {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;
        this.hasProperty = itm.hasProperty ? itm.hasProperty.map(i => new AProperty().set(i)) : [];
        // made chainable in concrete subclass
    }
    protected get() {
        return {
            ...super.get(),
            revision: this.revision,
            priorRevision: this.priorRevision,
            modified: this.modified,
            creator: this.creator,
            hasProperty: this.hasProperty.map(p => p.get())
        };
    }
    protected validate(itm: IAnElement) {
        // ToDo: implement further validation logic
        return super.validate(itm);
    }
}

//////////////////////////////////////
// The concrete classes:
export interface IProperty extends IIdentifiable {
    datatype: string; // must be of XsDataType
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
    datatype!: string;
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
        this.lastStatus = this.validate(itm);
    //    console.debug('Property.set: ', this.lastStatus);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.datatype = itm.datatype.replace(/^xsd:/, 'xs:');
            this.minCount = itm.minCount || 0;
            this.maxCount = itm.maxCount || 1;
            this.maxLength = itm.maxLength;
            this.pattern = itm.pattern;
            this.minInclusive = itm.minInclusive;
            this.maxInclusive = itm.maxInclusive;
            this.composedProperty = itm.composedProperty;
            this.defaultValue = itm.defaultValue;
        }
        return this; // make chainable
    }
    get() {
        return LIB.stripUndefined({
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
        });
    }
    getHTML() {
        return '<div>not implemented yet</div>';
    }
    validate(itm: IProperty) {
        // id and itemType checked in superclass
    //    const rsp = validateIdString(itm.datatype);
    //    if (!rsp.ok) return rsp;
        if (!isXsDataType(itm.datatype))
            return { status: 699, statusText: `Invalid datatype: ${itm.datatype}. Must be one of the XsDataType values.`, ok: false };

        // ToDo: implement further validation logic
        return super.validate(itm);
    }
}
export interface IReference extends IIdentifiable {
    eligibleTarget: TPigId[]; // must be IRI of an Entity or Relationship (class)
}
export class Reference extends Identifiable implements IReference {
    eligibleTarget!: TPigId[];
    constructor() {
        super({ itemType: PigItemType.Reference });
    }
    set(itm: IReference) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            super.set(itm);
            this.eligibleTarget = itm.eligibleTarget;
        }
        return this;
    }
    get() {
        return LIB.stripUndefined({
            ...super.get(),
            eligibleTarget: this.eligibleTarget
        });
    }
    getHTML() {
        return '<div>not implemented yet</div>';
    }
    validate(itm: IReference) {
        // id and itemType checked in superclass
        // At metamodel level, simple id strings are listed:
        const rsp = validateIdStringArray(itm.eligibleTarget, 'eligibleTarget');
        if (!rsp.ok) return rsp;
        return super.validate(itm);
    }
}

export interface IEntity extends IElement {
    specializes?: TPigId;  // must be IRI of another Entity, no cyclic references, translates to rdfs:subClassOf
    eligibleReference?: TPigId[];  // must hold Reference IRIs
}
export class Entity extends Element implements IEntity {
    specializes?: TPigId;
    eligibleReference?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.Entity });
    }
    set(itm: IEntity) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            super.set(itm);
            this.specializes = itm.specializes;
            this.eligibleReference = itm.eligibleReference;
        }
        return this;  // make chainable
    }
    get() {
        return {
            ...super.get(),
            specializes: this.specializes,
            eligibleReference: Array.isArray(this.eligibleReference) ? this.eligibleReference : undefined
        };
    }
    validate(itm: IEntity) {
        console.debug('Entity.validate: ', itm);
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        try {
            const ok = validateEntitySchema(itm as unknown as object);
            if (!ok) {
                const msg = ajv.errorsText(validateEntitySchema.errors, { separator: '; ' });
                return { status: 400, statusText: `Schema validation failed for IEntity: ${msg}`, ok: false };
            }
        } catch (err: any) {
            return { status: 500, statusText: `Schema validator error: ${err?.message ?? String(err)}`, ok: false };
        }

        // runtime guards:
        // id and itemType checked in superclass
        if (this.specializes && this.specializes !== itm.specializes)
            throw new Error(`Cannot change the specialization of an Entity after creation (tried to change from ${this.specializes} to ${itm.specializes})`);
        // If eligibleReference is not present, all references are allowed;
        // if present and empty, no references are allowed:
        const rsp = validateIdStringArray(itm.eligibleReference, 'eligibleReference', { canBeUndefined: true, minCount: 0 });
        if (!rsp.ok) return rsp;
        // ToDo: implement further validation logic
        return super.validate(itm);
    }
}

export interface IRelationship extends IElement {
    specializes?: TPigId;  // must be IRI of another Relationship, no cyclic references, translates to rdfs:subClassOf
    eligibleSource?: TPigId[];  // must hold Reference IRIs
    eligibleTarget?: TPigId[];  // must hold Reference IRIs
}
export class Relationship extends Element implements IRelationship {
    specializes?: TPigId;
    eligibleSource?: TPigId[];
    eligibleTarget?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.Relationship });
    }
    set(itm: IRelationship) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            super.set(itm);
            this.specializes = itm.specializes;
            this.eligibleSource = itm.eligibleSource;
            this.eligibleTarget = itm.eligibleTarget;
        }
        return this;
    }
    get() {
        return {
            ...super.get(),
            specializes: this.specializes,
            eligibleSource: Array.isArray(this.eligibleSource) ? this.eligibleSource : undefined,
            eligibleTarget: Array.isArray(this.eligibleTarget) ? this.eligibleTarget : undefined
        };
    }
    validate(itm: IRelationship) {
        // id and itemType checked in superclass
        if (this.specializes && this.specializes !== itm.specializes)
            throw new Error(`Cannot change the specialization of a Relationship after creation (tried to change from ${this.specializes} to ${itm.specializes})`);

        // If eligibleSource/eligibleTarget are not present, sources resp. targets of all classes are allowed;
        // if present, at least one entry must be there, because a relationship without source or target makes no sense:
        let rsp = validateIdStringArray(itm.eligibleSource, 'eligibleSource', { canBeUndefined: true, minCount: 1 });
        if (!rsp.ok) return rsp;
        rsp = validateIdStringArray(itm.eligibleTarget, 'eligibletarget', { canBeUndefined: true, minCount: 1 });
        if (!rsp.ok) return rsp;
        // ToDo: implement further validation logic
        return super.validate(itm);
    }
}

// For the instances/individuals, the 'payload':
export interface IAProperty extends IItem {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Property, translates to @type resp. rdf:type
    value?: string;
    aComposedProperty?: TPigId[];
}
export class AProperty extends Item implements IAProperty {
    hasClass!: TPigId;
    value?: string;
    aComposedProperty?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.aProperty });
    }
    set(itm: IAProperty) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            this.hasClass = itm.hasClass;
            this.aComposedProperty = itm.aComposedProperty;
            this.value = itm.value;
        }
        return this;
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
    validate(itm: IAProperty) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            throw new Error(`'${PigItemType.aProperty}' must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return rspOK;
    }
}
export interface IAReference extends IItem {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Reference, translates to @type resp. rdf:type
    element: TPigId;
}
export class AReference extends Item implements IAReference {
    hasClass!: TPigId;
    element!: TPigId;
    constructor() {
        super({ itemType: PigItemType.aReference });
    }
    set(itm: IAReference) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            this.hasClass = itm.hasClass;
            this.element = itm.element;
        }
        return this;
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
    validate(itm: IAReference) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            throw new Error(`'${PigItemType.aReference}' must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Reference IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return rspOK;
    }
}

export interface IAnEntity extends IAnElement {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Entity, translates to @type resp. rdf:type
    hasReference?: IAReference[];  // optional, must hold anEntity or aRelationship IRIs
}
export class AnEntity extends AnElement implements IAnEntity {
    hasClass!: TPigId;
    hasReference!: AReference[];
    constructor() {
        super({ itemType: PigItemType.anEntity });
    }
    set(itm: IAnEntity) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            super.set(itm);
            this.hasClass = itm.hasClass;
            this.hasReference = itm.hasReference ? itm.hasReference.map(i => new AReference().set(i)) : [];
        }
        return this;
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
    validate(itm: IAnEntity) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            throw new Error(`'${PigItemType.anEntity}' must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Entity IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
}

export interface IARelationship extends IAnElement {
    hasClass: TPigId;  // must be IRI of an element of type Pig:Relationship, translates to @type resp. rdf:type
    hasSource: IAReference;
    hasTarget: IAReference;
}
export class ARelationship extends AnElement implements IARelationship {
    hasClass!: TPigId;
    hasSource!: AReference;
    hasTarget!: AReference;
    constructor() {
        super({ itemType: PigItemType.aRelationship });
    }
    set(itm: IARelationship) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus) {
            super.set(itm);
            this.hasClass = itm.hasClass;
            this.hasSource = new AReference().set(itm.hasSource);
            this.hasTarget = new AReference().set(itm.hasTarget);
        }
        return this;
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
    validate(itm: IARelationship) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            throw new Error(`'${PigItemType.aRelationship}' must have a hasClass reference`);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship IRI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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
// -------- Helper functions --------

// Extract an id string from common shapes:
// - { id: 'xyz' } -> 'xyz'
// - { '@id': 'xyz' } -> 'xyz'
// - 'xyz' -> 'xyz'
// Returns undefined when no usable id found.
function extractId(obj: unknown): string | undefined {
    if (obj === null || obj === undefined)
        return undefined;
//    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
        const o = obj as Record<string, unknown>;
        if (typeof o.id === 'string' && o.id.trim().length>0)
            return o.id;
    //    if (typeof o['@id'] === 'string' && (o['@id'] as string).trim() !== '') return o['@id'] as string;
    }
    return undefined;
}

/**
 * Validate that an input is an id-object or id-string.
 * Returns rspOK on success, else an IRsp error object.
 * Accepts:
 * - 'xyz'                -> ok
 * - { id: 'xyz' }        -> ok
 * - { '@id': 'xyz' }     -> ok
 * Anything else -> error IRsp
 */
function validateIdObject(input: unknown, fieldName = 'id'): IRsp {
    if (input === null || input === undefined) {
        return { status: 400, statusText: `${fieldName} is missing`, ok: false };
    }
    // if (typeof input === 'string') {
    //    return input.trim() === '' ? { status: 400, statusText: `${fieldName} must be a non-empty string`, ok: false } : rspOK;
    // }
    if (typeof input === 'object') {
        const id = extractId(input);
        return id ? validateIdString(id, fieldName) : { status: 400, statusText: `${fieldName} is missing id`, ok: false };
    }
    return { status: 400, statusText: `${fieldName} has invalid type`, ok: false };
}
function validateIdString(input: unknown, fieldName = 'id'): IRsp {
    if (typeof input === 'string') {
        if (input.trim().length < 1) {
            return { status: 400, statusText: `${fieldName} must be a non-empty string`, ok: false };
        }
        if (isValidIdString(input))
            return rspOK;
    }
    return { status: 400, statusText: `${fieldName} must be a string with a term having a namespace or an URI`, ok: false };
}
function isValidIdString(input: string): boolean {
    return typeof(input) == 'string' && (RE.termWithNamespace.test(input) || RE.uri.test(input));
}
/**
 * Validate that a value is a non-empty array whose elements are id-strings.
 * - id-string: a string accepted by `isValidIdString`
 * @param input  value to check
 * @param fieldName  name used in error messages
 * @returns IRsp (rspOK on success, error IRsp on failure)
 */
export function validateIdStringArray(
    input: unknown,
    fieldName = 'ids',
    options?: { canBeUndefined?: boolean, minCount?: number }
): IRsp {
    const canBeUndefined = options?.canBeUndefined ?? false;
    if (canBeUndefined && (input === null || input === undefined)) {
        return rspOK;
    }
    if (!Array.isArray(input)) {
        return { status: 400, statusText: `${fieldName} must be an array`, ok: false };
    }

    const minCount = options?.minCount ?? 1;
    if (input.length < minCount ) {
        return { status: 400, statusText: `${fieldName} must contain at least ${minCount} element(s)`, ok: false };
    }

    for (let i = 0; i < input.length; i++) {
        if (!isValidIdString(input[i])) {
            return { status: 400, statusText: `${fieldName}[${i}] must be a valid id string`, ok: false };
        }
    }

    return rspOK;
}
/**
 * Convert valid id-strings to id-objects.
 * - Accepts any JsonValue (string/number/boolean/null/object/array).
 * - Recursively processes arrays and objects (non-flat).
 * - Skips converting the actual id property (default '@id').
 * - options.idKey: output id key (default '@id')
 * - options.mutate: if true modify in-place, otherwise return a new structure
 */
/**
 * Validate that a value is a non-empty array whose elements are id-objects.
 * - id-object = plain object (not array) with a single string property 'id' or '@id'
 *   whose value matches `isValidIdString`.
 * @param input  value to check
 * @param fieldName  name used in error messages
 * @returns IRsp (rspOK on success, error IRsp on failure)
 */
function validateIdObjectArray(input: unknown, fieldName = 'ids'): IRsp {
    if (!Array.isArray(input)) {
        return { status: 400, statusText: `${fieldName} must be an array`, ok: false };
    }
    if (input.length === 0) {
        return { status: 400, statusText: `${fieldName} must contain at least one element`, ok: false };
    }

    for (let i = 0; i < input.length; i++) {
        const el = input[i];
        if (el === null || el === undefined || typeof el !== 'object' || Array.isArray(el)) {
            return { status: 400, statusText: `${fieldName}[${i}] must be an object with an 'id' or '@id' string`, ok: false };
        }
        const obj = el as Record<string, unknown>;
        // prefer '@id' then 'id'
        const candidate = Object.prototype.hasOwnProperty.call(obj, '@id') ? obj['@id'] : obj['id'];
        if (typeof candidate !== 'string' || !isValidIdString(candidate)) {
            return { status: 400, statusText: `${fieldName}[${i}] must contain a valid 'id' or '@id' string`, ok: false };
        }
        // enforce single-key id-objects uncomment the check below:
        const keys = Object.keys(obj);
        if (keys.length !== 1 || (keys[0] !== 'id' && keys[0] !== '@id')) {
            return { status: 400, statusText: `${fieldName}[${i}] must be an id-object with a single 'id' or '@id' property`, ok: false };
        }
    }

    return rspOK;
} function makeIdObjects(
    node: JsonValue,
    options?: { idKey?: string; mutate?: boolean }
): JsonValue {
    const idKey = options?.idKey ?? '@id';
    const mutate = !!options?.mutate;

    // primitives
    if (node === null || node === undefined) return node;
    if (typeof node === 'string') {
        return isValidIdString(node) ? ({ [idKey]: node } as JsonObject) : node;
    }
    if (typeof node === 'number' || typeof node === 'boolean') return node;

    // array: map elements
    if (Array.isArray(node)) {
        if (mutate) {
            for (let i = 0; i < node.length; i++) {
                node[i] = makeIdObjects(node[i], options);
            }
            return node;
        }
        const outArr: JsonArray = [];
        for (let i = 0; i < node.length; i++) {
            outArr[i] = makeIdObjects(node[i], options);
        }
        return outArr;
    }

    // object: handle the idKey specially (do not convert its string value)
    const obj = node as JsonObject;
    if (mutate) {
        for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (k === idKey) {
                // keep the actual id property unchanged
                obj[k] = v;
            } else if (typeof v === 'string' && isValidIdString(v)) {
                obj[k] = { [idKey]: v } as unknown as JsonValue;
            } else {
                obj[k] = makeIdObjects(v, options);
            }
        }
        return obj;
    }

    const out: JsonObject = {};
    for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (k === idKey) {
            // preserve '@id' raw value
            out[k] = v;
        } else if (typeof v === 'string' && isValidIdString(v)) {
            out[k] = { [idKey]: v } as unknown as JsonValue;
        } else {
            out[k] = makeIdObjects(v, options);
        }
    }
    return out;
}
/**
 * Replace top-level string values that are valid id-strings with id-objects.
 * - Non-recursive (flat): only replaces direct properties of the provided object.
 * - Uses existing `isValidIdString` to decide whether a string is an ID.
 * - options.idKey: property name for the id-object (default '@id')
 * - options.mutate: if true, modify the input object in-place; otherwise return a shallow copy
 *
function makeIdObjects(
    obj: JsonObject,
    options?: { idKey?: string; mutate?: boolean }
): JsonObject {
    const idKey = options?.idKey ?? '@id';
    const mutate = !!options?.mutate;
    const target: JsonObject = mutate ? obj : { ...obj };

    for (const k of Object.keys(obj)) {
        const v = obj[k];
        // replace all id-strings except for the '@id' property itself:
        if (k !== idKey && typeof v === 'string' && isValidIdString(v)) {
            // replace string by an id-object, using the configured idKey
            target[k] = { [idKey]: v } as unknown as JsonValue;
        } else if (!mutate) {
            // ensure non-mutating mode copies non-id values
            target[k] = v;
        }
    }

    return target;
} */
/**
 * Replace id-objects (e.g. { id: "xyz" } or { "@id": "xyz" }) by the id string.
 * - options.idKeys: array of keys to treat as id keys (default ['id','@id'])
 * - options.mutate: if true mutate in-place, otherwise operate on a deep clone
 */
function replaceIdObjects(
    node: JsonValue,
    options ?: { idKeys?: string[]; mutate?: boolean }
): JsonValue {
    const idKeys = options?.idKeys ?? ['id', '@id'];
    const mutate = !!options?.mutate;

    // work on a clone when not mutating
    const root: JsonValue = mutate ? node : JSON.parse(JSON.stringify(node));

    function isIdObject(v: unknown): v is JsonObject {
        if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
        const keys = Object.keys(v as JsonObject);
        return keys.length === 1 && idKeys.includes(keys[0]) && typeof (v as any)[keys[0]] === 'string';
    }

    function walk(n: JsonValue): JsonValue {
        if (n === null || n === undefined) return n;
        if (LIB.isLeaf(n)) return n;
        if (Array.isArray(n)) {
            for (let i = 0; i < n.length; i++) {
                n[i] = walk(n[i]);
            }
            return n;
        }
        // object
        const obj = n as JsonObject;
        if (isIdObject(obj)) {
            // replace whole object by its id string
            const k = Object.keys(obj)[0];
            return obj[k] as JsonPrimitive;
        }
        for (const k of Object.keys(obj)) {
            //    obj[k] = walk(obj[k]);
            const key = String(k);
            const newVal = walk((obj as JsonObject)[key]);
            (obj as JsonObject)[key] = newVal as JsonValue;
        }
        return obj;
    }

    return walk(root);
}
/**
 * Build a simple id-object.
 * - useJsonLd=false => { id: 'xyz' }
 * - useJsonLd=true  => { '@id': 'xyz' }
 *
function buildIdObject(id: string, useJsonLd = false): JsonObject {
    return useJsonLd ? { ['@id']: id } : { id };
}
makeIdObject(str: string): JsonObject {
        return { id: str };
},*/
// Helper: normalize language tags/values ---
function normalizeLanguageText(src: any): ILanguageText {
//    console.debug('normalizeLanguageText', src);
    if (!src)
        return { value: '' };
    if (typeof src === 'object') {
        return {
            value: (src.value ?? '') as string,
            lang: src.lang as tagIETF | undefined
        };
    }
    if (typeof src === 'string')
        return { value: src };
    return { value: String(src) };
}

function normalizeMultiLanguageText(src: any): ILanguageText[] {
    if (!src) return [];
    if (Array.isArray(src)) return src.map(normalizeLanguageText);
    return [normalizeLanguageText(src)];
}
/* Helper: validate that a value is an array of ILanguageText with the rule:
   - if array length === 0 -> OK
   - if array length === 1 -> 'lang' may be missing
   - if array length > 1 -> each entry must have a string 'lang' and string 'value'
   Returns IRsp (rspOK on success, error IRsp on failure)
*/
function validateMultiLanguageText(arr: any, fieldName: string): IRsp {
//    console.debug('validateMultiLanguageText',arr,fieldName);
    if (!Array.isArray(arr)) {
        return { status: 698, statusText: `Invalid ${fieldName}: expected an array of language-tagged texts`, ok: false };
    }
    if (arr.length === 0) return rspOK;
    if (arr.length === 1) {
        const e = arr[0];
        if (!e || typeof e !== 'object' || typeof (e as any).value !== 'string') {
            return { status: 698, statusText: `Invalid ${fieldName} entry: expected object with string 'value'`, ok: false };
        }
        // single entry: lang optional
        if ((e as any).lang !== undefined && typeof (e as any).lang !== 'string') {
            return { status: 698, statusText: `Invalid ${fieldName} entry: 'lang' must be a string when present`, ok: false };
        }
        return rspOK;
    }
    // length > 1: every entry must have value:string and lang:string
    for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (!e || typeof e !== 'object') {
            return { status: 698, statusText: `Invalid ${fieldName} entry at index ${i}: expected object with 'value' and 'lang'`, ok: false };
        }
        if (typeof (e as any).value !== 'string') {
            return { status: 698, statusText: `Invalid ${fieldName} entry at index ${i}: 'value' must be a string`, ok: false };
        }
        if (typeof (e as any).lang !== 'string' || (e as any).lang.trim() === '') {
            return { status: 698, statusText: `Invalid ${fieldName} entry at index ${i}: 'lang' must be a non-empty string`, ok: false };
        }
    }
    return rspOK;
}
const ENTITY_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://gfse.org/schemas/pig/IEntity',
    type: 'object',
    properties: {
        id: { $ref: '#/$defs/idString' },
        itemType: {
            type: 'string',
            enum: ['pig:Entity'],
            description: 'The PigItemType'
        },
        hasClass: { $ref: '#/$defs/idString' },
        specializes: { $ref: '#/$defs/idString' },
        eligibleReference: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        eligibleProperty: {
            type: 'array',
            items: { $ref: '#/$defs/idString' }
        },
        icon: { type: 'string' },
        title: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        },
        description: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#/$defs/LanguageText' }
        }
    },
    additionalProperties: false,
    required: ['id', 'itemType'],
    // One of 'hasClass' and 'specializes' must be there but not both:
    oneOf: [
        { required: ['hasClass'] },
        { required: ['specializes'] }
    ],
    // One of 'title' and 'description' must be there, or both:
    anyOf: [
        { required: ['title'] },
        { required: ['description'] }
    ],
    $defs: {
        idString: {
            type: 'string',
            description: 'TPigId — term with namespace (prefix:local) or an URI',
            pattern: '^(?:[A-Za-z0-9_\\-]+:[^:\\s]+|https?:\\/\\/[^\\s]+)$'
        },
        LanguageText: {
            type: 'object',
            required: ['value'],
            additionalProperties: false,
            properties: {
                value: { type: 'string' },
                lang: { type: 'string' }
            }
        }
    }
}; const validateEntitySchema = ajv.compile(ENTITY_SCHEMA);
