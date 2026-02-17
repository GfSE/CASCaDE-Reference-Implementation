/*!
 * Product Information Graph (PIG) Metaclasses
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/** Product Information Graph (PIG) Metaclasses - the basic object structure representing the PIG
 *  Dependencies: none
 *  Authors: oskar.dungern@gfse.org
 *
 *  Design Decisions:
 *  - The PIG classes contain *only *the elements in the metamodel; it could be generated from the metamodel.
 *  - Abstract classes are not exported, only the concrete classes.
 *  - All names are always in singular form, even if they have multiple values.
 *  - The itemType is explicitly stored with each item to support searching (in the cache or database) ... and for runtime checking.
 *  - The 'AProperty' instances are instantiated as part their parent objects 'AnEntity' or 'ARelationship'.
 *  - Similarly, the 'ALink' instances are instantiated as part their parent objects 'AnEntity' or 'ARelationship'.
 *  - Both 'AProperty' and 'ALink' have no identifier and no revision history of their own.
 *  - Other objects are referenced by URIs (TPigId) to avoid inadvertant duplication of objects ... at the cost of repeated cache access.
 *    This means the code must resolve any reference by reading the referenced object explicitly from cache, when needed.
 *  - To avoid access to the cache in the validation methods, the validation of references to classes shall be done in an overall consistency check
 *    before the items are instantiated here.
 *  - Links to other items are stored as simple strings (the URIs) to avoid deep object graphs;
 *    those references are expanded to id objects only when serializing to JSON-LD.
 *  - The 'get' methods return plain JSON objects matching the interfaces, suitable for serialization and persistence.
 *  - The 'getJSONLD' and 'setJSONLD' methods handle conversion to/from JSON-LD representation.
 *  - The 'set' methods are chainable to allow concise code when creating new instances.
 *  - Programming errors result in exceptions, data errors in IMsg return values.
 *
 *  ToDo:
 *  - Check use of normalizeId() in the setJSONLD() thread
 *  - normalizeId() shortly before validate() in set() ?
 *  - Check the result of normalizeId in the setXML() thread in case of eligible values: must be 'o:'
 *  - Add dummy namespaces for 'o:' and 'd:' in case they have been added to a package with local names
 *  - allow packages to be nested
 *  - Consider the storage of numeric and boolean values: should be string?
 *  - Consider the storage of namespaces: now object with properties tag and uri: should be objects with {tag: uri}?
 */

import { IRsp, rspOK, Msg, Rsp } from "../../../lib/messages";
import { DEF, RE } from "../../../lib/definitions";
import { LIB, LOG } from "../../../lib/helpers";
import { MVF } from "../../../lib/mvf";
import { PIN, NodeType } from "../../../lib/platform-independence";
import { JsonPrimitive, JsonValue, JsonArray, JsonObject, tagIETF, TISODateString } from "../../../lib/helpers";
import { SCH } from '../json/pig-schemata';
import { checkConstraintsForPackage } from './pig-package-constraints';

export type TPigId = string;  // an URI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Property | Link | Entity | Relationship;
export type TPigElement = Entity | Relationship;
export type TPigAnElement = AnEntity | ARelationship;
export type TPigItem = APackage | TPigClass | TPigAnElement;
export type stringHTML = string;  // contains HTML code
export type stringXML = string;  // contains XML code
export type ElementXML = globalThis.Element;  // DOM Element typ

export const PigItemType = {
    aPackage: 'pig:aPackage',
    // PIG classes:
    Property: 'pig:Property',
    Link: 'pig:Link', 
    Entity: 'pig:Entity',
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    aSourceLink: 'pig:aSourceLink',
    aTargetLink: 'pig:aTargetLink',
    anEntity: 'pig:anEntity',
    aRelationship: 'pig:aRelationship'
} as const;
export type PigItemTypeValue = typeof PigItemType[keyof typeof PigItemType];

const PIG_CLASSES = new Set<PigItemTypeValue>([
    PigItemType.Property,
    PigItemType.Link,
    PigItemType.Entity,
    PigItemType.Relationship
]);

const PIG_INSTANCES = new Set<PigItemTypeValue>([
    PigItemType.aPackage,
    // PigItemType.aProperty,
    // PigItemType.aSourceLink,
    // PigItemType.aTargetLink,
    PigItemType.anEntity,
    PigItemType.aRelationship
]);

/**
 * Factory class for creating PIG items based on itemType
 * Provides type-safe instantiation of all PIG metaclasses
 */
export class PigItem {
    /**
     * Create a PIG item instance based on itemType
     * @param itemType - PIG item type to instantiate
     * @returns New instance of the corresponding PIG class, or null if invalid type
     * 
     * @example
     * const property = PigItemFactory.create(PigItemType.Property);
     * const entity = PigItemFactory.create(PigItemType.anEntity);
     */
    static create(itemType: PigItemTypeValue): TPigItem | null {
        switch (itemType) {
            // PIG Classes
            case PigItemType.Property:
                return new Property();
            case PigItemType.Link:
                return new Link();
            case PigItemType.Entity:
                return new Entity();
            case PigItemType.Relationship:
                return new Relationship();

            // PIG Instances
            case PigItemType.anEntity:
                return new AnEntity();
            case PigItemType.aRelationship:
                return new ARelationship();

            // Package
            case PigItemType.aPackage:
                return new APackage();

        /*    // Embedded types (not typically instantiated standalone)
            case PigItemType.aProperty:
                return new AProperty();
            case PigItemType.aSourceLink:
                return new ASourceLink();
            case PigItemType.aTargetLink:
                return new ATargetLink();
        */
            default:
                LOG.error(`PigItemFactory.create: unknown itemType '${itemType}'`);
                return null;
        }
    }
    /**
     * Check if itemType is a PIG class (Property, Link, Entity, Relationship)
     */
    static isClass(itemType: PigItemTypeValue): boolean {
        return PIG_CLASSES.has(itemType);
    }
    /**
     * Check if itemType is a PIG instance (anEntity, aRelationship, aProperty, aSourceLink, aTargetLink)
     */
    static isInstance(itemType: PigItemTypeValue): boolean {
        return PIG_INSTANCES.has(itemType);
    }
    /**
     * Check if item type is allowed for instantiation.
     * The following types are not allowed in a graph:
        PigItemType.aPackage,      // Packages cannot be nested
        PigItemType.aProperty,     // Embedded in anEntity/aRelationship
        PigItemType.aSourceLink,   // Embedded in aRelationship
        PigItemType.aTargetLink    // Embedded in anEntity/aRelationship

     */
    static isInstantiable(itype: any): boolean {
        return [
            PigItemType.Property,
            PigItemType.Link,
            PigItemType.Entity,
            PigItemType.Relationship,
            PigItemType.anEntity,
            PigItemType.aRelationship
        ].includes(itype);
    }

    /**
     * Check if an itemType can be instantiated by the factory
     * @param itemType - Item type to check
     * @returns true if type is valid and can be instantiated
     */
    static isSupportedType(itemType: unknown): itemType is PigItemTypeValue {
        return typeof itemType === 'string' &&
            Object.values(PigItemType).includes(itemType as PigItemTypeValue);
    }

    /**
     * Get all supported item types
     * @returns Array of all PigItemTypeValue values
     */
    static getSupportedTypes(): PigItemTypeValue[] {
        return Object.values(PigItemType);
    }

    /** Simple runtime type-guard
     * Usage:
     * if (PigItem.isType(obj, PigItemType.Property)) {
     *   // obj is Property
     * }
     * /
    isType<T extends PigItemTypeValue>(
        obj: Identifiable,
        type: T
    ): obj is Extract<TPigItem, { itemType: T }> {
        return !!obj && obj.itemType === type;
    } */

    // Type guard: checks whether a value is one of the XsDataType values
    static isSupportedDataType(value: unknown): value is XsDataType {
        if (typeof value !== 'string') return false;
        const norm = value.replace(/^xsd:/, 'xs:');
        return (Object.values(XsDataType) as string[]).includes(norm);
    }
}
export enum XsDataType {
    anyType = 'xs:anyType',
    Boolean = 'xs:boolean',
    Integer = 'xs:integer',
    Double = 'xs:double',
    String = 'xs:string',
    AnyURI = 'xs:anyURI',
    Date = 'xs:date',
    DateTime = 'xs:dateTime',
    Duration = 'xs:duration',
    ComplexType = 'xs:complexType'
}
export interface INamespace {
    tag: string; // e.g. a namespace tag, e.g. "pig:"
    uri: string; // e.g. a namespace value, e.g. "https://product-information-graph.gfse.org/"
}
export interface ILanguageText {
    value: string;
    lang?: tagIETF;
}
export interface IText {
    value: string;
}
export interface IOptionsHTML {
    widthMain?: string;  // width of the main column, e.g. '150px' or '67%'
    itemType?: PigItemTypeValue[]; // itemTypes to include
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
    hasClass?: TPigId;  // must be URI of the item's respective class, translates to @type resp. rdf:type
}
abstract class Item implements IItem {
    readonly itemType!: PigItemTypeValue;
    // All items may have a hasClass reference, some require it;
    // concrete subclasses enforce that in their validate() methods:
    hasClass?: TPigId;
    protected lastStatus!: IRsp;
    protected constructor(itm: IItem) {
        this.itemType = itm.itemType;
    }
    status(): IRsp {
        return this.lastStatus as IRsp;
    }
    protected validate(itm: IItem) {
        if (itm.itemType !== this.itemType)
            return Msg.create(601, this.itemType, itm.itemType);
        return rspOK;
    }
    protected set(itm: IItem) {
        this.hasClass = itm.hasClass;
    }
    protected get() {
        return {
            itemType: this.itemType,
            hasClass: this.hasClass
        };
    }
}
interface IIdentifiable extends IItem {
    id: TPigId;  // translates to @id in JSON-LD
    specializes?: TPigId;  // must be URI of a pig:item with equal itemType, no cyclic references, translates to rdfs:subClassOf
    // Any one or both of the following must be present and have at least one item; see schemata:
    title?: ILanguageText[];
    description?: ILanguageText[];
}
abstract class Identifiable extends Item implements IIdentifiable {
    id!: TPigId;
    specializes?: TPigId;
    title?: ILanguageText[];
    description?: ILanguageText[];
    protected constructor(itm: IItem) {
        super(itm); // actual itemType set in concrete class
    }
    protected validate(itm: IIdentifiable) {
        if (this.id && itm.id !== this.id)
            return Msg.create(603, this.id, itm.id);

        this.id = itm.id; // to complement status messages

        if (this.specializes && this.specializes !== itm.specializes)
            return Msg.create(604, this.specializes, itm.specializes ?? '');

        // Runtime guards:
        /* this is now checked in schema validation: */
        // Ensure title is a multi-language text (array of ILanguageText)
        if (itm.title !== undefined) {
            const tRes = validateMultiLanguageText(itm.title, 'title');
            if (!tRes.ok) return tRes;
        }
        // description is optional, but when present must be an array of ILanguageText
        if (itm.description !== undefined) {
            const dRes = validateMultiLanguageText(itm.description, 'description');
            if (!dRes.ok) return dRes;
        }

        // ToDo: implement further validation logic
        return super.validate(itm);
    }
    protected set(itm: IIdentifiable): this {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
//        LOG.debug('Identifiable.set i: ', itm);
        super.set(itm);
        this.id = itm.id;  // redundant, because it has (should have) been set by validate()
        this.specializes = itm.specializes;
        this.title = itm.title;
        this.description = itm.description;
//        LOG.debug('Identifiable.set o: ', this);
        // made chainable in concrete subclass
        return this;
    }
    protected get() {
        return LIB.stripUndefined({
            ...super.get(),
            id: this.id,
            specializes: this.specializes,
            title: this.title,
            description: this.description
        });
    }
    protected fromJSONLD(itm: any) {
        let ld = { ...itm };

        // 1. Rename JSON-LD tags to internal format
        ld = MVF.renameJsonTags(ld as JsonValue, MVF.fromJSONLD, { mutate: false }) as any;

        // 2. Replace id-objects with id-strings
        ld = replaceIdObjects(ld);

        // 3. Normalize multi-language texts (from abstract normalize)
        ld.title = normalizeMultiLanguageText(ld.title);
        ld.description = normalizeMultiLanguageText(ld.description);

        // Set the normalized object in the concrete subclass
        return ld;
    }
    protected getJSONLD() {
        const jld = MVF.renameJsonTags(this.get() as unknown as JsonObject, MVF.toJSONLD, { mutate: false }) as JsonObject;
    //    LOG.debug('Identifiable.getJSONLD: ', jld);
        return makeIdObjects(jld) as JsonObject;
    }
    /**
     * Generic XML parsing for all Identifiable subclasses
     * Parses XML to JSON and delegates to set()
     */
    setXML(itm: stringXML): this {
        const rsp = xmlToJson(itm);
        if (rsp.ok) {
            return this.set(rsp.response as any);
        }
        this.lastStatus = rsp;
        return this;
    }
}

interface IALink extends IItem {
    idRef: TPigId;  // must point to an element according to eligibleTarget of the class
}
abstract class ALink extends Item implements IALink {
    idRef!: TPigId;
    constructor(itm: IItem) {
        super(itm);
    }
    protected validate(itm: IALink) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(602, itm.itemType);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Link URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    protected set(itm: IALink) {
        super.set(itm);
        this.idRef = itm.idRef;
        return this;
    }
    protected get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            idRef: this.idRef
        });
    }
    protected setJSONLD(itm: any) {
        let _itm = MVF.renameJsonTags(itm as JsonValue, MVF.fromJSONLD, { mutate: false }) as any;
        _itm = replaceIdObjects(_itm);
        return this.set(_itm);
    }
    protected getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        const jld = MVF.renameJsonTags(this.get() as unknown as JsonObject, MVF.toJSONLD, { mutate: false }) as JsonObject;
        return makeIdObjects(jld) as JsonObject;
    }
}
interface IElement extends IIdentifiable {
    eligibleProperty?: TPigId[];
    icon?: IText;  // optional, default is undefined (no icon)
}
abstract class Element extends Identifiable implements IElement {
    eligibleProperty?: TPigId[];
    icon?: IText;
    protected constructor(itm: IItem) {
        super(itm); // actual itemType set in concrete class
    }
/*    protected validate(itm: IElement) {
        // If eligibleProperty is not present, all properties are allowed;
        // if present and empty, no properties are allowed.
        // This is tested via schema at concrete class level.
        //const rsp = validateIdStringArray(itm.eligibleProperty, 'eligibleProperty', { canBeUndefined: true, minCount: 0 });
        //if (!rsp.ok) return rsp;
        // ToDo: implement further validation logic
        return super.validate(itm);
    } */
    protected set(itm: IElement) {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.eligibleProperty = itm.eligibleProperty;
        this.icon = itm.icon;
        // made chainable in concrete subclass
        return this;
    }
    protected get() {
        return {
            ...super.get(),
            eligibleProperty: Array.isArray(this.eligibleProperty) ? this.eligibleProperty : undefined,
            icon: this.icon
        };
    }
}

interface IAnElement extends IIdentifiable {
    revision: TRevision;
    priorRevision?: TRevision[];  // optional
    modified: TISODateString;
    creator?: string;
    hasProperty?: IAProperty[];
}
abstract class AnElement extends Identifiable implements IAnElement {
    revision!: TRevision;
    priorRevision?: TRevision[];
    modified!: TISODateString;
    creator?: string;
    hasProperty!: AProperty[]; // instantiated AProperty items
    protected constructor(itm: IItem) {
        super(itm);
    }
/*    protected validate(itm: IAnElement) {
        // ToDo: implement further validation logic
        return super.validate(itm);
    } */
    protected set(itm: IAnElement): this {
    //    LOG.debug('anEl.set 0', itm.hasProperty);
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;

        this.hasProperty = itm.hasProperty ? itm.hasProperty.map(p => new AProperty().set(p)) : [];
    //    LOG.debug('anEl.set 9',itm.hasProperty, this.hasProperty);
        // made chainable in concrete subclass
        return this;
    }
    protected get() {
    //    LOG.debug('anElement.get():', this/*.hasProperty, this.hasProperty.map(p => p.get())*/);
        return {
            ...super.get(),
            revision: this.revision,
            priorRevision: this.priorRevision,
            modified: this.modified,
            creator: this.creator,
            hasProperty: this.hasProperty.map(p => p.get())
        };
    }
    protected fromJSONLD(itm: any) {
        const _itm = super.fromJSONLD(itm) as any;

        // In JSON-LD all configurable properties have an ID-string as tag and an itemType pig:aProperty;
        // collect them here in a hasProperty array, where the tag becomes hasClass;
        // they will be instantiated as AProperty items in set():

        _itm.hasProperty = collectConfigurablesFromJSONLD(_itm, PigItemType.aProperty) as IAProperty[];
        _itm.hasTargetLink = collectConfigurablesFromJSONLD(_itm, PigItemType.aTargetLink) as IALink[];
        //    LOG.debug('AnElement.setJSONLD: '+ JSON.stringify(_itm, null, 2));

        // Set the normalized object in the concrete subclass
        return _itm;
    }
    setJSONLD(itm: any) {
        // ... for all subclasses:
        const _itm = this.fromJSONLD(itm) as any;
        return this.set(_itm);
    }
    protected getJSONLD() {
        const jld = super.getJSONLD();

        return addConfigurablesToJSONLD(jld, this, 'hasProperty');
    }
}

//////////////////////////////////////
// The concrete classes:
export interface IEligibleValue {
    id: TPigId;
    // with lang for xs:string with multiple languages, optional for lang for xs:string with a single language, without otherwise:
    value: ILanguageText[]; 
}
export interface IProperty extends IIdentifiable {
    datatype: string; // must be of XsDataType
    minCount?: number;
    maxCount?: number;
    maxLength?: number;  // only used for string datatype
    pattern?: string;  // a RegExp pattern, only used for string datatype
    minInclusive?: number;  // only used for numeric datatypes
    maxInclusive?: number;  // only used for numeric datatypes
    eligibleValue?: IEligibleValue[]; // array of allowed values, datatype-dependent
    defaultValue?: string;   // in PIG, values of all datatypes are strings
    unit?: string;  // according to SI units
    composedProperty?: TPigId[];  // must be URI of another Property, no cyclic references
}
export class Property extends Identifiable implements IProperty {
    datatype!: string;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    eligibleValue?: IEligibleValue[]; 
    defaultValue?: string;
    unit?: string;
    composedProperty?: TPigId[];
    constructor() {
        super({itemType:PigItemType.Property});
    }
    validate(itm: IProperty) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        try {
            const ok = SCH.validatePropertySchema(itm);
            if (!ok) {
                const msg = SCH.getValidatePropertyErrors();
                return Msg.create(681, 'Property', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'Property', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        //    const rsp = validateIdString(itm.datatype);
        //    if (!rsp.ok) return rsp;
        // all datatypes beginning with 'xs:' are allowed, however only those defined in XsDatatypes are specifically supported,
        // others shall be treated as strings (with a warning in the log):
        if (!PigItem.isSupportedDataType(itm.datatype)) {
            const msg = Msg.create(680, itm.id, itm.datatype);
            LOG.warn(msg.statusText);
            //            return msg */
        }

        // ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IProperty): this {
        this.lastStatus = this.validate(itm);
        // LOG.debug('Property.set: '+ JSON.stringify(this.lastStatus));
        if (this.lastStatus.ok) {
            super.set(itm);
            this.datatype = itm.datatype;
            this.minCount = itm.minCount || 0;
            this.maxCount = itm.maxCount || 1;
            this.maxLength = itm.maxLength;
            this.pattern = itm.pattern;
            this.minInclusive = itm.minInclusive;
            this.maxInclusive = itm.maxInclusive;
            this.eligibleValue = itm.eligibleValue;
            this.defaultValue = itm.defaultValue;
            this.unit = itm.unit;
            this.composedProperty = itm.composedProperty;
        }
        return this; // make chainable
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            datatype: this.datatype,
            minCount: this.minCount,
            maxCount: this.maxCount,
            maxLength: this.maxLength,
            pattern: this.pattern,
            minInclusive: this.minInclusive,
            maxInclusive: this.maxInclusive,
            eligibleValue: this.eligibleValue,
            defaultValue: this.defaultValue,
            unit: this.unit,
            composedProperty: this.composedProperty
        });
    }
    fromJSONLD(itm: any) {
        return super.fromJSONLD(itm) as any;
    }
    setJSONLD(itm: any) {
        const _itm = this.fromJSONLD(itm) as any;

        // Normalize datatype (Property-specific)
        if (_itm.datatype) {
            _itm.datatype = _itm.datatype.replace(/^xsd:/, 'xs:');
        }

        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    getHTML(options?: object): stringHTML {
        return '<div>not implemented yet</div>';
    }
}
export interface ILink extends IIdentifiable {
    eligibleEndpoint: TPigId[]; // must be URI of an Entity or Relationship (class)
}
export class Link extends Identifiable implements ILink {
    eligibleEndpoint!: TPigId[];
    constructor() {
        super({ itemType: PigItemType.Link });
    }
    validate(itm: ILink) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        try {
            const ok = SCH.validateLinkSchema(itm);
            if (!ok) {
                const msg = SCH.getValidateLinkErrors();
                return Msg.create(681, 'Link', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'Link', itm.id, err?.message ?? String(err));
        }

        /*    // id and itemType checked in superclass
            // At metamodel level, simple id strings are listed:
            const rsp = validateIdStringArray(itm.eligibleEndpoint, 'eligibleEndpoint');
            if (!rsp.ok) return rsp; */
        return super.validate(itm);
    }
    set(itm: ILink) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.eligibleEndpoint = itm.eligibleEndpoint;
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            eligibleEndpoint: this.eligibleEndpoint
        });
    }
    fromJSONLD(itm: any) {
        return super.fromJSONLD(itm) as any;
    }
    setJSONLD(itm: any) {
        const _itm = this.fromJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    getHTML(options?: object): stringHTML {
        return '<div>not implemented yet</div>';
    }
}

export interface IEntity extends IElement {
    eligibleTargetLink?: TPigId[];  // must hold Link URIs
}
export class Entity extends Element implements IEntity {
    eligibleTargetLink?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.Entity });
    }
    validate(itm: IEntity) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        // LOG.debug('Entity.validate: ', itm);
        try {
            const ok = SCH.validateEntitySchema(itm);
            if (!ok) {
                const msg = SCH.getValidateEntityErrors();
                return Msg.create(682, 'Entity', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(683, 'Entity', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        // check whether specializes is another Entity URI is done in overall consistency check

        /*    // If eligibleTarget is not present, all references are allowed;
            // if present and empty, no references are allowed:
            const rsp = validateIdStringArray(itm.eligibleTargetLink, 'eligibleTargetLink', { canBeUndefined: true, minCount: 0 });
            if (!rsp.ok) return rsp; */
        // ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IEntity) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.eligibleTargetLink = itm.eligibleTargetLink;
        }
        return this;  // make chainable
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            eligibleTargetLink: Array.isArray(this.eligibleTargetLink) ? this.eligibleTargetLink : undefined
        });
    }
    fromJSONLD(itm: any) {
        return super.fromJSONLD(itm) as any;
    }
    setJSONLD(itm: any) {
        const _itm = this.fromJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
}

export interface IRelationship extends IElement {
    eligibleSourceLink?: TPigId;  // must hold Link URI
    eligibleTargetLink?: TPigId;  // must hold Link URI
}
export class Relationship extends Element implements IRelationship {
    eligibleSourceLink?: TPigId;
    eligibleTargetLink?: TPigId;
    constructor() {
        super({ itemType: PigItemType.Relationship });
    }
    validate(itm: IRelationship) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        try {
            const ok = SCH.validateRelationshipSchema(itm);
            if (!ok) {
                const msg = SCH.getValidateRelationshipErrors();
                return Msg.create(681, 'Relationship', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'Relationship', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        // check whether specializes is another Relationship URI is done in overall consistency check

        /*    // If eligibleSource/eligibleTarget are not present, sources resp. targets of all classes are allowed;
            // if present, at least one entry must be there, because a relationship without source or target makes no sense:
            let rsp = validateIdStringArray(itm.eligibleSourceLink, 'eligibleSourceLink', { canBeUndefined: true, minCount: 1 });
            if (!rsp.ok) return rsp;
            rsp = validateIdStringArray(itm.eligibleTargetLink, 'eligibleTargetLink', { canBeUndefined: true, minCount: 1 });
            if (!rsp.ok) return rsp; */
        // ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IRelationship) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.eligibleSourceLink = itm.eligibleSourceLink;
            this.eligibleTargetLink = itm.eligibleTargetLink;
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            eligibleSourceLink: this.eligibleSourceLink,
            eligibleTargetLink: this.eligibleTargetLink
        });
    }
    fromJSONLD(itm: any) {
        return super.fromJSONLD(itm) as any;
    }
    setJSONLD(itm: any) {
        const _itm = this.fromJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
}

// For the instances/individuals, the 'payload':
export interface IAProperty extends IItem {
    value?: string;       // a. Literal value (string, number, boolean, date - all as string)
    idRef?: TPigId;       // b. Reference to eligibleValue (for enumerations)
    aComposedProperty?: TPigId[];
}
export class AProperty extends Item implements IAProperty {
    value?: string;
    idRef?: TPigId;
    aComposedProperty?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.aProperty });
    }
    validate(itm: IAProperty) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(602, PigItemType.aProperty);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    set(itm: IAProperty) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.aComposedProperty = itm.aComposedProperty;
            this.value = itm.value;
            this.idRef = itm.idRef;
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            aComposedProperty: this.aComposedProperty,
            value: this.value,
            idRef: this.idRef
        });
    }
}
export class ASourceLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aSourceLink });
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(602, PigItemType.aSourceLink);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    set(itm: IALink) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return super.get();
    }
}
export class ATargetLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aTargetLink });
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(602, PigItemType.aTargetLink);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    set(itm: IALink) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return super.get();
    }
}

export interface IAnEntity extends IAnElement {
    hasTargetLink?: IALink[];  // optional, must hold anEntity or aRelationship URIs
}
export class AnEntity extends AnElement implements IAnEntity {
    hasTargetLink!: ATargetLink[];
    constructor() {
        super({ itemType: PigItemType.anEntity });
    }
    validate(itm: IAnEntity) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        try {
            const ok = SCH.validateAnEntitySchema(itm);
            if (!ok) {
                const msg = SCH.getValidateAnEntityErrors();
                return Msg.create(681, 'anEntity', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'anEntity', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(602, PigItemType.anEntity);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Entity URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    set(itm: IAnEntity) {
        const _itm: IAnEntity = LIB.stripUndefined(itm);

        _itm.modified = normalizeDateTime(_itm.modified) || new Date().toISOString();

        this.lastStatus = this.validate(_itm);
    //    LOG.debug('AnEntity.set status and input: ' + JSON.stringify(this.lastStatus), JSON.stringify(_itm, null, 2));
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.hasTargetLink = _itm.hasTargetLink ? _itm.hasTargetLink.map(r => new ATargetLink().set(r)) : [];
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ... super.get(),
            hasTargetLink: this.hasTargetLink.map(t => t.get())
        });
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        let jld = super.getJSONLD();
        jld = addConfigurablesToJSONLD(jld, this, 'hasTargetLink');
    //    LOG.debug('AnEntity.getJSONLD: ', out);
        return jld;
    }
    getHTML(options?: IOptionsHTML): stringHTML {
        if (!this.lastStatus.ok) return '<div class="pig-error">Invalid entity</div>';

        // Extract language preference from options, default to 'en-US'
        const lang = options?.lang || 'en-US';
        const widthMain = options?.widthMain || '67%';

        const titleText = getLocalText(this.title, lang);
        const descText = getLocalText(this.description, lang);

        // Build properties HTML
        let propertiesHTML = '';
        if (this.hasProperty && this.hasProperty.length > 0) {
            propertiesHTML = '<div class="pig-properties"><h3>Properties</h3><dl>';
            for (const prop of this.hasProperty) {
                const propData = prop.get();
                if (propData && propData.hasClass) {
                    const propValue = LIB.passifyHTML(propData.value || propData.idRef || '—');
                    const propClass = LIB.passifyHTML(propData.hasClass);
                    propertiesHTML += `<dt>${propClass}</dt><dd>${propValue}</dd>`;
                }
            }
            propertiesHTML += '</dl></div>';
        }

        // Build metadata HTML with localized date
        const metadataHTML = `<div class="pig-metadata">
            <dl>
                <dt>ID</dt><dd>${LIB.passifyHTML(this.id)}</dd>
                <dt>Class</dt><dd>${LIB.passifyHTML(this.hasClass || '—')}</dd>
                <dt>Revision</dt><dd>${LIB.passifyHTML(this.revision)}</dd>
                <dt>Modified</dt><dd>${LIB.getLocalDate(this.modified, lang)}</dd>
                ${this.creator ? `<dt>Creator</dt><dd>${LIB.passifyHTML(this.creator)}</dd>` : ''}
                ${this.priorRevision && this.priorRevision.length > 0 ? `<dt>Prior Revisions</dt><dd>${this.priorRevision.map(r => LIB.passifyHTML(r)).join(', ')}</dd>` : ''}
            </dl>
        </div>`;

        return `<div class="pig-anentity" style="display: flex; gap: 1rem;">
                    <div class="col-main" style="flex: 0 0 ${widthMain}; min-width: 0;">
                        ${titleText ? `<h3>${titleText}</h3>` : ''}
                        ${descText ? `<div class="pig-description">${descText}</div>` : ''}
                    </div>
                    <div class="col-right" style="flex: 1; min-width: 0;">
                        ${propertiesHTML}
                        ${metadataHTML}
                    </div>
                </div>`;
    }
}

export interface IARelationship extends IAnElement {
    hasSourceLink: IALink[];
    hasTargetLink: IALink[];
}
export class ARelationship extends AnElement implements IARelationship {
    hasSourceLink!: ASourceLink[];
    hasTargetLink!: ATargetLink[];
    constructor() {
        super({ itemType: PigItemType.aRelationship });
    }
    validate(itm: IARelationship) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        try {
            const ok = SCH.validateARelationshipSchema(itm);
            if (!ok) {
                const msg = SCH.getValidateARelationshipErrors();
                return Msg.create(681, 'aRelationship', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'aRelationship', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(602, PigItemType.aRelationship);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    set(itm: IARelationship) {
        const _itm: IARelationship = LIB.stripUndefined(itm);
        //LOG.debug('ARelationship.set():', _itm);
        // id is normalized in the caller (setXML or setJSONLD)
        _itm.modified = normalizeDateTime(_itm.modified) || new Date().toISOString();

        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.hasSourceLink = _itm.hasSourceLink ? _itm.hasSourceLink.map(s => new ASourceLink().set(s)) : [];
            this.hasTargetLink = _itm.hasTargetLink ? _itm.hasTargetLink.map(t => new ATargetLink().set(t)) : [];
        }
        return this;
    }
    get() {
        if (!this.lastStatus.ok) return undefined;
        return LIB.stripUndefined({
            ...super.get(),
            hasSourceLink: this.hasSourceLink.map(s => s.get()),
            hasTargetLink: this.hasTargetLink.map(t => t.get())
        });
    }
    fromJSONLD(itm: any) {
        const _itm = super.fromJSONLD(itm) as any;
        _itm.hasSourceLink = collectConfigurablesFromJSONLD(_itm, PigItemType.aSourceLink) as IALink[];
        return _itm;
    }
    getJSONLD() {
//        if (!this.lastStatus.ok) return undefined;
        let jld = super.getJSONLD();
        jld = addConfigurablesToJSONLD(jld, this, 'hasSourceLink');
        jld = addConfigurablesToJSONLD(jld, this, 'hasTargetLink');
        //    LOG.debug('AnEntity.getJSONLD: ', out);
        return jld;
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML representation of the relationship including its properties
        return '<div>not implemented yet</div>';
    }
}
// For packages:
export interface IAPackage extends IIdentifiable {
    context?: INamespace[] | string | Record<string, string>;
    graph: TPigItem[];
    modified?: TISODateString;
    creator?: string;
}
export class APackage extends Identifiable implements IAPackage {
    context?: INamespace[] | string | Record<string, string>;
    graph: TPigItem[] = [];
    modified?: TISODateString;
    creator?: string;

    constructor() {
        super({ itemType: PigItemType.aPackage });
    }

    validate(pkg: IAPackage, options?: any ): IRsp {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        // LOG.debug('APackage.validate: ', pkg);
        try {
            const ok = SCH.validateAPackageSchema(pkg);
            if (!ok) {
                const msg = SCH.getValidateAPackageErrors();
                return Msg.create(681, 'aPackage', pkg.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'aRelationship', pkg.id, err?.message ?? String(err));
        }

        // Call parent validation
        let rsp = super.validate(pkg);
        if (!rsp.ok) {
            return rsp;
        }

        rsp = checkConstraintsForPackage(pkg, options);
        // if (pkg.id == 'd:test-invalid-prop')
        // LOG.debug(`APackage.validate: validating package `, pkg, rsp);

        if (!rsp.ok) {
            return rsp;
        }

        return rspOK;
    }

    set(pkg: IAPackage, options?:any): this {
        const _pkg = { ...pkg };
        // ToDo: strip?

        // Instantiate each graph item:
        const instantiatedGraph: TPigItem[] = [];
        const errors: string[] = [];
    
        for (const item of _pkg.graph) {
            const result = this.createItem(item, { defaultModified: _pkg.modified, source: 'any' });
    
            if (result.ok && result.response) {
                instantiatedGraph.push(result.response as TPigItem);
            } else {
                const errorMsg = result.statusText || 'Unknown instantiation error';
                errors.push(errorMsg);
                // LOG.debug(`APackage.set: failed to instantiate item: `, JSON.stringify(item, null, 2));
                LOG.warn(`APackage ${pkg.id}: ${errorMsg}`);
            }
        }

        // ToDo: Rework the logic: Instantiate the package even with faulty items
        if (errors.length > 0) {
            LOG.warn(`APackage ${pkg.id}: ${errors.length} item(s) failed instantiation`);
            this.lastStatus = Msg.create(611, 'Package Import', instantiatedGraph.length, _pkg.graph.length);
            this.id = _pkg.id;
        } else {
            // id is normalized in the caller (setXML or setJSONLD)
            this.lastStatus = this.validate(_pkg, options);
            if (this.lastStatus.ok) {
                super.set(_pkg);
                this.context = _pkg.context;
                this.graph = instantiatedGraph;
                this.modified = _pkg.modified;
                this.creator = _pkg.creator;
            }
        }

        return this;
    }

    get() {
        if (!this.lastStatus.ok) return undefined;
        
        // Build complete package representation
        const pkg = {
            ...super.get(),
            context: this.context,
            graph: this.graph.map(item => {
                // LOG.debug(`APackage.get: processing item `, item);
                return item.get();
            }),
            modified: this.modified,
            creator: this.creator
        } as IAPackage;
        
        return LIB.stripUndefined(pkg);
    }

    setJSONLD(doc: any, options?:any): APackage {
        // ToDo: Perhaps we must normalize the ids like in XML import to assure they have a namespace or are an URI
        // Extract @context
        const ctx = this.extractContextJSONLD(doc);
        
        // Extract package metadata
        const meta = this.extractMetadataJSONLD(doc);
        
        // Extract and process @graph
        const graph: any[] = Array.isArray(doc['@graph']) 
            ? doc['@graph'] 
            : (Array.isArray(doc.graph) ? doc.graph : []);

        if (graph.length === 0) {
            LOG.warn(`APackage.setJSONLD: @graph of ${doc.id} is empty`);
        }

        // Transform the items to native JSON:
        const graphJson = graph.map(itm => this.ldToJson(itm));

        // Call set to validate and return all items including package
        this.set({
            itemType: PigItemType.aPackage,
            id: meta.id,
            title: meta.title,
            description: meta.description,
            context: ctx,
            graph: graphJson,
            modified: meta.modified,
            creator: meta.creator
        } as IAPackage, options);

        // LOG.debug(`APackage.setJSONLD: package ${JSON.stringify(this, null, 2)} set with status`, this.lastStatus);
        // return the instantiated graph with instantiated graph items:
        return this;
    }

/*    getJSONLD(): string {
        if (!this.lastStatus.ok) 
            return JSON.stringify({ error: this.lastStatus.statusText });

        // Start with parent's JSON-LD representation
        const jld = super.getJSONLD() as JsonObject;

        // Add @context
        if (this.context) {
            jld['@context'] = buildContextForJSONLD(this.context);
        }

        // Add @graph with full items (using their getJSONLD methods)
        jld['@graph'] = this.items.map(item => {
            if ('getJSONLD' in item && typeof item.getJSONLD === 'function') {
                const itemJLD = item.getJSONLD();
                // If getJSONLD returns a string, parse it back to object
                return typeof itemJLD === 'string' ? JSON.parse(itemJLD) : itemJLD;
            }
            return { '@id': (item as any).id };
        });

        // Add metadata
        if (this.modified) {
            jld['dcterms:modified'] = this.modified;
        }
        if (this.creator) {
            jld['dcterms:creator'] = this.creator;
        }

        // Return stringified JSON-LD
        return JSON.stringify(jld, null, 4);
    } */
    setXML(xmlString: stringXML, options?:any) {
        // 1. Parse XML string to JSON
        //    The context is skipped here, as it is extracted separately below.
        const parsed = xmlToJson(xmlString);
        // LOG.debug('APackage.setXML: parsed XML to JSON', JSON.stringify(parsed,null,2));

        if (!parsed.ok) {
            this.lastStatus = parsed;
            LOG.error(`APackage: XML parsing failed: ${parsed.statusText}`);
            return this;
        }

        const doc = parsed.response as JsonObject;
        doc.modified = normalizeDateTime(doc.modified) || new Date().toISOString();
        // LOG.debug('APackage.setXML: parsed XML to JSON', doc);

        // 2. Extract namespaces (if needed in future)
        const ctx = this.extractContextXML(xmlString, doc.id as string);

        // 3. Extract package metadata
        //    ... can be obtained directly from parsed JSON.

        // 4. Extract and process graph items
        const graph: any[] = Array.isArray(doc.graph) ? doc.graph : [];

        if (graph.length === 0) {
            LOG.warn(`APackage ${doc.id}: @graph is empty`);
        }

        // LOG.debug(`APackage.setXML: successfully instantiated ${instantiatedGraph.length} of ${graph.length} items`);

        // 6. Build and validate package
        this.set({
            itemType: PigItemType.aPackage,
            id: doc.id,
            title: doc.title,
            description: doc.description,
            context: ctx,
            graph: graph,
            modified: doc.modified,
            creator: doc.creator
        } as unknown as IAPackage, options);

        // LOG.debug(`APackage.setXML: package ${JSON.stringify(this,null,2)} set with status`, this.lastStatus);
        return this;
    }
    getHTML(options?: IOptionsHTML): stringHTML[] {
        if (!this.lastStatus.ok) {
            return [`<div class="pig-error">Invalid package; status: (${this.lastStatus.status}) ${LIB.passifyHTML(this.lastStatus.statusText || '')}</div>`];
        }

        const result: stringHTML[] = [];

        // Extract language preference from options, default to 'en-US'
        const lang = options?.lang ?? 'en-US';
        const widthMain = options?.widthMain ?? '67%';
        const includeItemTypes = options?.itemType ?? [PigItemType.anEntity];

        // 1. Package metadata as first element with localization
        const titleText = getLocalText(this.title, lang);
        const descText = getLocalText(this.description, lang);

        const pkgMetadata = `<div class="pig-apackage" style="display: flex; gap: 1rem;">
                    <div class="col-main" style="flex: 0 0 ${widthMain}; min-width: 0;">
                        <h3>${titleText || 'Untitled Package'}</h3>
                        ${descText ? `<div class="pig-description">${descText}</div>` : ''}
                    </div>
                    <div class="col-right" style="flex: 1; min-width: 0;">
                        <dl>
                            <dt>ID</dt><dd>${LIB.passifyHTML(this.id)}</dd>
                            ${this.modified ? `<dt>Modified</dt><dd>${LIB.getLocalDate(this.modified, lang)}</dd>` : ''}
                            ${this.creator ? `<dt>Creator</dt><dd>${LIB.passifyHTML(this.creator)}</dd>` : ''}
                            <dt>Items in Graph</dt><dd>${this.graph.length}</dd>
                        </dl>
                    </div>
                </div>`;
        result.push(pkgMetadata);

        // 2. Add HTML for all anEntity items (options are passed through)
        for (const item of this.graph) {
            if (includeItemTypes.includes(item.itemType)) {
                const entityHTML = (item as AnEntity).getHTML(options);
                result.push(entityHTML);
            }
        }

        return result;
    }
    /**
     * List all items from an instantiated APackage with status validation
     * Return an array with the package as first element (if valid), followed by the graph items
     * Invalid items (with lastStatus.ok === false) are filtered out and logged as warnings, if option 'validItemsOnly' is set.
     * 
     * @param pkg - Instantiated APackage with graph items
     * @returns Array with [APackage, ...graphItems]
     * 
     * @example
     * const pkg = new APackage().setJSONLD(jsonldDoc);
     * const allItems = pkg.getItems()
     * // allItems[0] === pkg
     * // allItems[1..n] === graph items
     */
    getItems(options?: any): TPigItem[] {
        const validItemsOnly = options?.validItemsOnly ?? false;

        const result: TPigItem[] = [];

        // Check package status
        const pkgStatus = this.status();
        if (!pkgStatus) {
            // ToDo: throw instead?
            LOG.error(
                `APackage '${this.id || 'unknown'}' is corrupt`
            );
            return [];
        }
        else if (!pkgStatus.ok) {
            LOG.warn(
                `APackage '${this.id || 'unknown'}' caused an error: ${pkgStatus?.statusText || 'unknown error'}`
            );
            return [(this as TPigItem)];
        }
        else if (!Array.isArray(this.graph)) {
            LOG.warn(
                `APackage '${this.id || 'unknown'}' has no valid graph array`
            );
            return [(this as TPigItem)];
        }
        else {
            // Package is valid, add it as first element
            result.push(this as TPigItem);
        }

        // Filter and validate graph items
        let validCount = 0;
        let invalidCount = 0;

        for (const item of this.graph) {
            // LOG.debug(`LIB.allItems: processing graph item `, item);

            if (!item || typeof item !== 'object') {
                LOG.error(`APackage ${ this.id || 'unknown' }: encountered invalid graph item (not an object)`);
                invalidCount++;
                continue;
            }

            // Check if item has status() method
            if (typeof (item as any).status !== 'function') {
                LOG.error(`APackage ${this.id || 'unknown' }: graph item '${(item as any).id || 'unknown'}' has no status() method`);
                invalidCount++;
                continue;
            }

            // Check item status
            const itemStatus = (item as any).status();
            if (itemStatus.ok) {
                validCount++;
            } else {
                LOG.warn(
                    `APackage ${this.id || 'unknown' }: graph item '${(item as any).id || 'unknown'}' (${(item as any).itemType || 'unknown type'}) has invalid status: ${itemStatus?.statusText || 'unknown error'}`
                );
                invalidCount++;
                if (validItemsOnly)
                    continue;
            }

            // Item is valid or invalid ones are not filtered:
            result.push(item);
        }

    /*    // Summary log
        if (invalidCount > 0) {
            LOG.warn(
                `APackage ${this.id || 'unknown' }: filtered out ${invalidCount} invalid item(s), kept ${validCount} valid item(s) from package '${this.id || 'unknown'}'`
            );
        } */

        return result;
    }

    /**
     * Transform an item in JSON-LD item to plain JSON format
     * Uses the same partial transformations as fromJSONLD()
     * 
     * @param itemJsonLD - JSON-LD representation of item
     * @returns Plain JSON object ready for instantiation
     */
    ldToJson(itemJsonLD: any): any {
        let json = { ...itemJsonLD };

        // 1. Rename JSON-LD tags to internal format (@id → id, etc.)
        json = MVF.renameJsonTags(json as JsonValue, MVF.fromJSONLD, { mutate: false }) as any;

        // 2. Replace id-objects with id-strings
        json = replaceIdObjects(json);

        // 3. Normalize multi-language texts
        json.title = normalizeMultiLanguageText(json.title);
        json.description = normalizeMultiLanguageText(json.description);

        // 4. Normalize datatype (Property-specific)
        if (json.datatype) {
            json.datatype = json.datatype.replace(/^xsd:/, 'xs:');
        }

        // 5. Collect configurable properties from JSON-LD format
        // In JSON-LD, configurable properties have ID-string as tag
        if ([PigItemType.anEntity, PigItemType.aRelationship].includes(json.itemType)) {
            json.hasProperty = collectConfigurablesFromJSONLD(json, PigItemType.aProperty) as IAProperty[];
            json.hasTargetLink = collectConfigurablesFromJSONLD(json, PigItemType.aTargetLink) as IALink[];
        }
        if ([PigItemType.aRelationship].includes(json.itemType)) {
            json.hasSourceLink = collectConfigurablesFromJSONLD(json, PigItemType.aSourceLink) as IALink[];
        }

        return json;
    }
    /**
     * Extract @context from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Context as INamespace[], string, Record<string, string>, or undefined
     */
    private extractContextJSONLD(doc: any): INamespace[]{
        const ctx = doc['@context'] || doc.context;
        // LOG.debug('extractContextJSONLD (1): ',ctx);

        if (!ctx) {
            LOG.warn(`JSON-LD Package ${doc.id || 'unknown' }: no @context found`);
            return [];
        }

    /*    // String context (URL)
        if (typeof ctx === 'string') {
            LOG.debug(`JSON-LD Package ${doc.id || 'unknown' }: extracted context URL: ${ctx}`);
            return ctx;
        } */

        // Object context - convert to namespace array
        if (typeof ctx === 'object' && !Array.isArray(ctx)) {
            const namespaces: INamespace[] = [];
            for (const [key, value] of Object.entries(ctx)) {
                if (typeof value === 'string') {
                    namespaces.push({
                        tag: key.endsWith(':') ? key : key + ':',
                        uri: value
                    });
                }
            }
            if (namespaces.length > 0) {
                // LOG.debug(`APackage: extracted ${namespaces.length} namespaces from context`);
                return namespaces;
            }
            // Return original object if no valid namespaces found
            // LOG.debug(`JSON-LD Package ${doc.id || 'unknown' }: extracted context object`);
            return ctx;
        }

    /*    // Array context
        if (Array.isArray(ctx)) {
            LOG.debug(`APackage: extracted array context with ${ctx.length} entries`);
            return ctx;
        } */

        LOG.warn(`JSON-LD Package ${doc.id || 'unknown' }: unsupported @context format`);
        return [];
    }
    /**
     * Extract XML namespaces from XML string and group them in a context object
     * Compatible with JSON-LD @context format
     * 
     * @param xmlString - XML string containing namespace declarations
     * @returns Context as INamespace[], string, Record<string, string>, or undefined
     * 
     * @example
     * Input XML:
     * <pig:aPackage xmlns:pig="https://pig.gfse.org/" 
     *               xmlns:dcterms="http://purl.org/dc/terms/"
     *               xmlns="http://default.org/">
     * 
     * Output:
     * [
     *   { tag: "pig:", uri: "https://pig.gfse.org/" },
     *   { tag: "dcterms:", uri: "http://purl.org/dc/terms/" },
     *   { tag: "@vocab", uri: "http://default.org/" }
     * ]
     */
    private extractContextXML(xmlString: stringXML, docId:string): INamespace[] {
        const namespaces: INamespace[] = [];

        // Global regex to find all xmlns declarations
        // Matches both xmlns:prefix="uri" and xmlns="uri"
        const xmlnsRegex = /xmlns(?::([a-zA-Z0-9_-]+))?=["']([^"']+)["']/g;

        let match;
        while ((match = xmlnsRegex.exec(xmlString)) !== null) {
            const prefix = match[1]; // undefined for default namespace
            const uri = match[2];

            if (prefix) {
                // Prefixed namespace: xmlns:prefix="uri"
                namespaces.push({
                    tag: prefix.endsWith(':') ? prefix : prefix + ':',
                    uri: uri
                });
            } else {
                // Default namespace: xmlns="uri"
                // Use '@vocab' as tag for default namespace (JSON-LD convention)
                namespaces.push({
                    tag: '@vocab',
                    uri: uri
                });
            }
        }

        if (namespaces.length === 0) {
            LOG.warn(`XML Package ${docId || 'unknown' }: no namespaces found`);
            return [];
        }

        // LOG.debug(`extractContextXML: extracted ${namespaces.length} namespace(s)`);
        return namespaces;
    }
    /**
     * Extract package metadata from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Metadata object with id, modified, creator, title, and description
     */
    private extractMetadataJSONLD(doc: any): {
        id: TPigId;
        modified?: TISODateString;
        creator?: string;
        title?: ILanguageText[];
        description?: ILanguageText[];
    } {
        const metadata = {
            id: normalizeId(doc['@id'] || doc.id, PigItemType.aPackage),
            modified: normalizeDateTime(doc['dcterms:modified'] || doc.modified) || new Date().toISOString(), // TISODateString
            creator: doc['dcterms:creator'] || doc.creator, // string
            title: undefined as ILanguageText[] | undefined, // to be extracted
            description: undefined as ILanguageText[] | undefined // to be extracted
        };

        // Extract dcterms:title (first language value)
        const titleArray = doc['dcterms:title'] || doc.title;
        if (Array.isArray(titleArray) && titleArray.length > 0) {
            metadata.title = [{
                value: titleArray[0]['@value'] || titleArray[0].value || titleArray[0],
                lang: titleArray[0]['@language'] || titleArray[0].language || 'en'
            }];
        } else if (typeof titleArray === 'string') {
            metadata.title = [{ value: titleArray, lang: 'en' }];
        }

        // Extract dcterms:description (first language value)
        const descArray = doc['dcterms:description'] || doc.description;
        if (Array.isArray(descArray) && descArray.length > 0) {
            metadata.description = [{
                value: descArray[0]['@value'] || descArray[0].value || descArray[0],
                lang: descArray[0]['@language'] || descArray[0].language || 'en'
            }];
        } else if (typeof descArray === 'string') {
            metadata.description = [{ value: descArray, lang: 'en' }];
        }

        // LOG.debug(`APackage metadata: id=${metadata.id}, title=${metadata.title?.[0]?.value}, modified=${metadata.modified}, creator=${metadata.creator}`);

        return metadata;
    }

    /**
     * Instantiate a single PIG item from XML (already converted to JSON)
     * @param item - JSON object from xmlToJson conversion
     * @returns IRsp with instantiated TPigItem in response, or error status
     */
    private createItem(item: any, options?: any): IRsp<unknown> {
        const source = options?.source || 'unknown source';
        const id = item.id ?? 'unknown';

        // Validate item has required itemType
        if (!item.itemType) {
            LOG.error(`APackage: item missing itemType, skipping ${id}`);
            return Msg.create(650, `Instantiation from ${source}`, 'itemType', id);
        }

        const itype: any = item.itemType;

        // Filter allowed item types
        if (!PigItem.isInstantiable(itype)) {
        //    LOG.error(`APackage.createItem: skipping item type '${itype}' which is not allowed in a graph`);
            return Msg.create(651, `Instantiation of ${id} from ${source}`, itype);
        }

        const itm = PigItem.create(itype);

        if (!itm) {
        //    LOG.error(`APackage.createItem: unable to create instance for itemType '${itype}'`);
            return Msg.create(652, `Instantiation of ${id} from ${source}`, itype);
        }

        try {
            // LOG.debug(`APackage.createItem: instantiating item from ${source}: ${JSON.stringify(itm,null,2)}`);

            // When transforming individual items, use setXML which internally calls xmlToJson and then set();
            // but here we already have JSON from xmlToJson, so call set() directly:
            (itm as any).set(item);

            // Check if instantiation was successful
            const status = (itm as any).status();
            if (!status || !status.ok) {
            /*    LOG.error(
                    `APackage.createItem: ${itype} '${item.id || 'unknown'}' failed validation: ${status?.statusText || 'unknown error'}`
                ); */
                return status || Msg.create(653, `Instantiation from ${source}`, itype, item.id || 'unknown');
            }

            // LOG.debug(`APackage.createItem: successfully instantiated ${itype} with id ${item.id}`);
            return Rsp.create(0, itm, 'json');
        } catch (err: any) {
        //    const errorMsg = `APackage.createItem: failed to populate instance with itemType '${itype}': ${err?.message ?? err}`;
        //    LOG.error(errorMsg);
            return Msg.create(654, `Instantiation from ${source}`, itype, err?.message ?? String(err));
        }
    }

}

// -------- Helper functions --------

/** Extract an id string from common shapes:
 * - { id: 'xyz' } -> 'xyz'
 * - { '@id': 'xyz' } -> 'xyz'
 * - 'xyz' -> 'xyz'
 * Returns undefined when no usable id found.
 */
function extractId(obj: unknown): string | undefined {
    if (obj === null || obj === undefined)
        return undefined;
//    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
        const o = obj as Record<string, unknown>;
        if (typeof o.id === 'string' && o.id.trim().length>0)
            return o.id;
    }
    return undefined;
}

/* function validateIdString(input: unknown, fieldName = 'id'): IRsp {
    if (typeof input === 'string') {
        if (input.trim().length < 1) {
            Msg.create(624, fieldName);
        }
        if (isValidIdString(input))
            return rspOK;
    }
    return Msg.create(625, fieldName);
} */
function isValidIdString(input: string): boolean {
    return typeof(input) == 'string' && (RE.termWithNamespace.test(input) || RE.uri.test(input));
}
/**
 * Validate that a value is a non-empty array whose elements are id-strings.
 * - id-string: a string accepted by `isValidIdString`
 * @param input  value to check
 * @param fieldName  name used in error messages
 * @returns IRsp (rspOK on success, error IRsp on failure)
 * /
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
        return Msg.create(630, fieldName);
    }

    const minCount = options?.minCount ?? 1;
    if (input.length < minCount) {
        return Msg.create(631, fieldName, minCount);
    }

    for (let i = 0; i < input.length; i++) {
        if (!isValidIdString(input[i])) {
            return Msg.create(632, fieldName, i);
        }
    }

    return rspOK;
} */
/**
 * Validate that an input is an id-object or id-string.
 * Returns rspOK on success, else an IRsp error object.
 * Accepts:
 * - 'xyz'                -> ok
 * - { id: 'xyz' }        -> ok
 * - { '@id': 'xyz' }     -> ok
 * Anything else -> error IRsp
 */
/* function validateIdObject(input: unknown, fieldName = 'id'): IRsp {
    if (input === null || input === undefined) {
        return Msg.create(620, fieldName);
    }
    // if (typeof input === 'string') {
    //    return input.trim() === '' ? { status: 400, statusText: `${fieldName} must be a non-empty string`, ok: false } : rspOK;
    // }
    if (typeof input === 'object') {
        const id = extractId(input);
        return id ? validateIdString(id, fieldName) : Msg.create(621, fieldName);
    }
    return Msg.create(622, fieldName);
} */
/**
 * Validate that a value is a non-empty array whose elements are id-objects.
 * - id-object = plain object (not array) with a single string property 'id' or '@id'
 *   whose value matches `isValidIdString`.
 * @param input  value to check
 * @param fieldName  name used in error messages
 * @returns IRsp (rspOK on success, error IRsp on failure)
 * /
function validateIdObjectArray(input: unknown, fieldName = 'ids'): IRsp {
    if (!Array.isArray(input)) {
        return Msg.create(630, fieldName);
    }
    if (input.length === 0) {
        return Msg.create(631, fieldName, 1);
    }

    for (let i = 0; i < input.length; i++) {
        const el = input[i];
        if (el === null || el === undefined || typeof el !== 'object' || Array.isArray(el)) {
            return Msg.create(633, fieldName, i);
        }
        const obj = el as Record<string, unknown>;
        const candidate = Object.prototype.hasOwnProperty.call(obj, '@id') ? obj['@id'] : obj['id'];
        if (typeof candidate !== 'string' || !isValidIdString(candidate)) {
            return Msg.create(634, fieldName, i);
        }
        const keys = Object.keys(obj);
        if (keys.length !== 1 || (keys[0] !== 'id' && keys[0] !== '@id')) {
            return Msg.create(635, fieldName, i);
        }
    }

    return rspOK;
} */

/**
 * Convert valid id-strings to id-objects.
 * - Accepts any JsonValue (string/number/boolean/null/object/array).
 * - Recursively processes arrays and objects (non-flat).
 * - Skips converting the actual id property (default '@id').
 * - options.idKey: output id key (default '@id')
 * - options.mutate: if true modify in-place, otherwise return a new structure
 */
function makeIdObjects(
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
            const key = String(k);
            const newVal = walk((obj as JsonObject)[key]);
            (obj as JsonObject)[key] = newVal as JsonValue;
        }
        return obj;
    }

    return walk(root);
}
/**
 * Normalize ID by adding namespace prefix if missing
 * Logs transformations for debugging ReqIF imports
 * 
 * @param id - Raw ID from import (may lack namespace)
 * @param itemType - PIG item type to determine correct prefix
 * @returns Normalized ID with namespace prefix
 */

/**
 * Normalize ID by adding namespace prefix if missing
 */
function normalizeId(id: string, itemType: PigItemTypeValue): string {
    if (!id || typeof id !== 'string') {
        return id;
    }

    // Already has namespace or is URI?
    if (isValidIdString(id)) {
        return id;
    }

    // Determine prefix using optimized type guards
    // ToDo: Check whether the namespaces for eligible value types are correctly normalized with 'o:'
    // and also their references in properties
    let prefix: string;
    if (PigItem.isClass(itemType)) {
        prefix = 'o:';
//    else if (PigItem.isInstance(itemType)) {
//        prefix = 'd:';
    } else {
        prefix = 'd:'; // Default for unknown
    }

    const normalized = `${prefix}${id}`;
    LOG.info(`ID normalized: '${id}' → '${normalized}' (${itemType})`);

    return normalized;
}
// Normalize dateTime strings by ensuring they are in ISO format (e.g. '2024-06-01T12:00:00Z')
function normalizeDateTime(dateStr: any): string | undefined {
    // return if it is already a valid ISO string:
    if (typeof dateStr === 'string') {
        const match = dateStr.match(RE.isoDateTime);
        if (match) {
            // match[1] ist die Timezone-Gruppe (oder undefined)
            const normalized = match[1] ? dateStr : dateStr + DEF.defaultTimezone;
            LOG.info(`ID normalized: '${dateStr}' → '${normalized}'`);
            return normalized;
        }
    }
    if (!dateStr || typeof dateStr !== 'string')
        return undefined;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        LOG.warn(`Invalid date string: '${dateStr}'`);
        return undefined;
    }
    const normalized = date.toISOString();
    LOG.info(`ID normalized: '${dateStr}' → '${normalized}'`);
    return normalized;
}

// Normalize language tags/values ---
function normalizeLanguageText(src: any): ILanguageText {
//    LOG.debug('normalizeLanguageText', src);
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

function normalizeMultiLanguageText(src: any): ILanguageText[] | undefined {
    if (!src) return;
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
//    LOG.debug('validateMultiLanguageText',arr,fieldName);
    if (!Array.isArray(arr)) {
        return Msg.create(640, fieldName);
    }
    if (arr.length === 0) return rspOK;
    if (arr.length === 1) {
        const e = arr[0];
        if (!e || typeof e !== 'object' || typeof (e as any).value !== 'string') {
            return Msg.create(641, fieldName);
        }
        // single entry: lang optional
        if ((e as any).lang !== undefined && typeof (e as any).lang !== 'string') {
            return Msg.create(642, fieldName);
        }
        return rspOK;
    }
    // length > 1: every entry must have value:string and lang:string
    for (let i = 0; i < arr.length; i++) {
        const e = arr[i];
        if (!e || typeof e !== 'object') {
            return Msg.create(643, fieldName, i);
        }
        if (typeof (e as any).value !== 'string') {
            return Msg.create(644, fieldName, i);
        }
        if (typeof (e as any).lang !== 'string' || (e as any).lang.trim() === '') {
            return Msg.create(645, fieldName, i);
        }
    }
    return rspOK;
}
/**
 * Collect configurable properties and references from a JSON-LD object.
 * In JSON-LD, configurable properties have an ID-string as key (namespace:name or URI)
 * and their value is an array of objects with itemType 'pig:aProperty'.
 * This function extracts those properties and transforms them into a hasProperty array,
 * where the original key becomes the 'hasClass' field of each property.
 * 
 * @param obj - The input object (typically from JSON-LD)
 * @returns Array of IAProperty objects, or undefined if no properties found
 */
function collectConfigurablesFromJSONLD(obj: any, itype: PigItemTypeValue): IAProperty[] | IALink[] | undefined {
    if (!obj || typeof obj !== 'object') return undefined;

    const properties: IAProperty[] = [];

    // Standard PIG fields that should NOT be collected as properties;
    // the tags have already been renamed with MVF.renameJsonTags( ..., MVF.fromJSONLD):
    const skipKeys = new Set(MVF.toJSONLD.keys());

    //LOG.debug('collect 1',obj,itype);
    for (const key of Object.keys(obj)) {
        // Skip known metadata keys and standard PIG fields
        if (skipKeys.has(key)) continue;

        // Check if key is a valid ID string (namespace:name or URI)
        if (!isValidIdString(key)) continue;

        const val = obj[key];
        //LOG.debug('collect 2', key,val);

        // Handle array of property values
        if (Array.isArray(val)) {
            for (const item of val) {
                if (item && typeof item === 'object') {
                    // Check if it has itemType 'pig:aProperty' (may be an id-object)
                    // the tags have already been renamed:
                    const itemTypeValue = item.itemType /* || (item['pig:itemType'] && extractId(item['pig:itemType'])) */;

                    if (itemTypeValue === itype /* || !itemTypeValue*/) {
                        // Add the property with the key as its hasClass reference
                        properties.push({
                            itemType: itype,
                            hasClass: key,
                            // itype == PigItemType.Property: value in case of a plain value 
                            value: item.value /*|| item['@value'] */,
                            // itype == PigItemType.Property: idRef in case of an enumeration value(from eligibleValue),
                            // itype == PigItemType.Link: idRef is mandatory
                            idRef: item.id,
                            aComposedProperty: item.aComposedProperty
                        });
                    delete obj[key]; // remove processed property
                    }
                }
            }
        }
        // Handle single property value (non-array)
        else if (val && typeof val === 'object') {
            const itemTypeValue = val.itemType || (val['pig:itemType'] && extractId(val['pig:itemType']));

            if (itemTypeValue === itype /* || !itemTypeValue */) {
                properties.push({
                    itemType: itype,
                    hasClass: key,
                    // itype == PigItemType.Property: value in case of a plain value 
                    value: val.value /*|| item['@value'] */,
                    // itype == PigItemType.Property: idRef in case of an enumeration value(from eligibleValue),
                    // itype == PigItemType.Link: idRef is mandatory
                    idRef: val.id,
                    aComposedProperty: val.aComposedProperty
                });
                delete obj[key]; // remove processed property
            }
        }
        // Handle primitive values (string, number, boolean) - create simple properties
        else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            properties.push({
                itemType: itype,
                hasClass: key,
                value: String(val)
            });
            delete obj[key]; // remove processed property
        }
    }

    return properties;
}
/**
 * Add hasProperty, hasSourceLink or hasTargetLink arrays to JSON-LD output
 */
function addConfigurablesToJSONLD(
    jld: JsonObject,
    anEl: IAnElement | AnEntity | ARelationship,
    hasX: 'hasProperty' | 'hasSourceLink' | 'hasTargetLink'
): JsonObject {
    const items = (anEl as any)[hasX];
//    LOG.debug('addConfigurablesToJSONLD:', jld, anEl, hasX, items);

    if (!Array.isArray(items)) {
        return jld;
    }

    const grouped = new Map<TPigId, JsonObject[]>();

    for (const item of items) {
        const propValue: Record<string, JsonValue> = {
            ['pig:itemType']: { ['@id']: item.itemType } as JsonObject
        };

        // Add value if present (only for AProperty)
        if ('value' in item && item.value !== undefined) {
            propValue['@value'] = item.value;
        }

        // Add idRef if present
        if (item.idRef !== undefined) {
            propValue['@id'] = item.idRef;
        }

        const key = item.hasClass as TPigId;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(propValue as JsonObject);
    }

    // Add grouped items to JSON-LD
    for (const [key, values] of grouped) {
        jld[key] = values as JsonValue;
    }

    delete jld[hasX];
    return jld;
}
/**
 * Parse XML string and convert to JSON object
 * Recursively traverses the XML structure without assuming specific tag names
 * Hybrid approach: tries parsing without wrapper first, falls back to wrapper if needed
 * @param xml - XML string to parse
 * @returns IRsp with JsonObject on success, error message on failure
 */
function xmlToJson(xml: stringXML): IRsp<unknown> {
    try {
        const parser = PIN.createDOMParser();

        // Try 1: Parse without wrapper
        const doc = parser.parseFromString(xml, 'text/xml');
        const parserError = PIN.getXmlParseError(doc);

        if (!parserError && doc.documentElement) {
            // Success without wrapper
            const result = xmlElementToJson(doc.documentElement);
            // LOG.debug('xmlToJson: successfully parsed XML without wrapper');

            return {
                ...rspOK,
                response: result as JsonObject,
                responseType: 'json'
            };
        }

        // Try 2: Parse with wrapper (for namespace issues)
        // LOG.debug('xmlToJson: first attempt failed, trying with wrapper');
        const wrapped = LIB.makeXMLDoc(xml);
        const wrappedDoc = parser.parseFromString(wrapped, 'text/xml');

        const wrappedError = PIN.getXmlParseError(wrappedDoc);
        if (wrappedError) {
            const errorMessage = wrappedError.textContent || 'Unknown XML parsing error';
            LOG.error('xmlToJson: XML parsing failed even with wrapper:', errorMessage);
            return Msg.create(690, 'XML', errorMessage);
        }

        const rootElement = wrappedDoc.documentElement;
        if (!rootElement || !rootElement.firstElementChild) {
            return Msg.create(690, 'XML', 'No valid element found in wrapped XML');
        }

        // Extract the actual content (skip the wrapper)
        const actualElement = rootElement.firstElementChild as ElementXML;
        const result = xmlElementToJson(actualElement);

        // LOG.debug('xmlToJson: successfully parsed XML with wrapper',result);

        return {
            ...rspOK,
            response: result as JsonObject,
            responseType: 'json'
        };

    } catch (err: any) {
        LOG.error('xmlToJson: exception:', err);
        return Msg.create(690, 'XML', err?.message ?? String(err));
    }
}
/**
 * Convert an XML DOM Element to a JSON object recursively
 * Handles:
 * - PIG classes (Property, Link, Entity, Relationship)
 * - PIG instances (anEntity, aRelationship)
 * - Configurable properties (pig:aProperty)
 * - Configurable links (pig:aSourceLink, pig:aTargetLink)
 * 
 * @param xmlElement - XML DOM Element to convert
 * @returns JSON representation of the element
 */
function xmlElementToJson(xmlElement: ElementXML): JsonObject {
    const result: JsonObject = {};

    // 1. Extract itemType from element tag name (only for valid PIG types)
    const tagName = xmlElement.tagName as PigItemTypeValue;
    // ✅ Check if this is a valid PIG element
    const isValidPigElement = Object.values(PigItemType).includes(tagName);

    if (isValidPigElement) {
        result.itemType = tagName;
    }

    // 2. Extract all attributes as properties
    for (const attr of Array.from(xmlElement.attributes)) {
        const attrName = attr.name;
        const attrValue = attr.value;

        if (attrName.startsWith('xmlns')) {
            continue;
        } else if (attrName === 'id') {
            // normalize always, including eligible values
            result.id = normalizeId(attrValue, tagName);
        } else if (attrName.endsWith('type') || attrName.endsWith('hasClass')) {
            // normalize if we have a valid PIG type
            result.hasClass = isValidPigElement
                ? normalizeId(attrValue, tagName)
                : attrValue;
        } else if (attrName.endsWith('specializes')) {
            // normalize if we have a valid PIG type
            result.specializes = isValidPigElement
                ? normalizeId(attrValue, tagName)
                : attrValue;
        } else {
            result[attrName] = attrValue;
        }
    }
    // LOG.debug('xmlElementToJson: ', xmlElement.attributes, '\n', JSON.stringify(result,null,2)) ;

    // 3. Process child elements
    const childElementsByTag = new Map<string, ElementXML[]>();
    const textContent: string[] = [];

    // Collections for configurable properties and links
    const configurableProperties: JsonObject[] = [];
    const configurableSourceLinks: JsonObject[] = [];
    const configurableTargetLinks: JsonObject[] = [];

    for (const child of Array.from(xmlElement.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const childElement = child as ElementXML;
            const childTagName = childElement.tagName;

            // Special handling for configurable properties and links
            if (childTagName === 'pig:aProperty') {
                configurableProperties.push(processConfigurableProperty(childElement));
                continue;
            }
            if (childTagName === 'pig:aSourceLink') {
                configurableSourceLinks.push(processConfigurableLink(childElement, PigItemType.aSourceLink));
                continue;
            }
            if (childTagName === 'pig:aTargetLink') {
                configurableTargetLinks.push(processConfigurableLink(childElement, PigItemType.aTargetLink));
                continue;
            }

            // Group regular child elements by tag name
            const elements = childElementsByTag.get(childTagName);
            if (elements) {
                elements.push(childElement);
            } else {
                childElementsByTag.set(childTagName, [childElement]);
            }

        } else if (child.nodeType === NodeType.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text) {
                textContent.push(text);
            }
        }
    }

    // 4. Convert grouped child elements to JSON
    for (const [tagName, elements] of childElementsByTag) {

        // Special handling for 'graph' - always array of heterogeneous items
        if (tagName === 'graph' || tagName === 'pig:graph') {
            result.graph = elements.flatMap(graphContainer => {
                // Get all direct children of <graph> container
                // ✅ Use childNodes instead of children for @xmldom compatibility
                const graphItems: JsonObject[] = [];
                for (const child of Array.from(graphContainer.childNodes)) {
                    if (child.nodeType === NodeType.ELEMENT_NODE) {
                        graphItems.push(xmlElementToJson(child as ElementXML));
                    }
                }
                return graphItems;
            });
            continue;
        }

        // Special handling for xs:simpleType
        if (tagName.endsWith('simpleType')) {
        //    LOG.debug('Processing xs:simpleType element',elements);
            xSimpleType(elements[0], result);
            // LOG.debug('Result after processing xs:simpleType', result);
            continue;
        }

        // Map XML tag to internal property name
        const propertyName = MVF.mapTerm(tagName, MVF.fromXML) as string;

        // Check if this property is a multi-language text field
        const isMultiLang = isMultiLanguageText(propertyName);

        // Check if this property needs IText wrapping (e.g. icon)
        const needsTextWrapper = requiresIText(propertyName);

        // Pass parent itemType for context-aware array detection
        const mustBeArray = requiresArray(propertyName, result.itemType as PigItemTypeValue );

        if (elements.length === 1 && !mustBeArray) {
            // Single element (and not forced to be array)
            const elem = elements[0];
            const childText = getXmlElementText(elem);
            const langAttr = elem.getAttribute('xml:lang') || elem.getAttribute('lang');

            // Multi-language field check FIRST
            if (isMultiLang || langAttr) {
                result[propertyName] = [{
                    value: childText,
                    ...(langAttr && { lang: langAttr })
                }];
            }
            // IText wrapper for icon and perhaps other fields:
            else if (needsTextWrapper) {
                result[propertyName] = { value: childText };
            }
            // Regular fields
            else {
                const hasChildElements = Array.from(elem.childNodes).some(
                    node => node.nodeType === NodeType.ELEMENT_NODE
                );

                if (!hasChildElements && childText) {
                    // the following restrictions don't come the preferred way, but we extract them anyways:
                    if (propertyName.endsWith('maxLength')) {
                        result.maxLength = parseInt(childText, 10);
                    } else if (propertyName.endsWith('minCount')) {
                        result.minCount = parseInt(childText, 10);
                    } else if (propertyName.endsWith('maxCount')) {
                        result.maxCount = parseInt(childText, 10);
                    } else if (propertyName.endsWith('minInclusive')) {
                        result.minInclusive = parseFloat(childText);
                    } else if (propertyName.endsWith('maxInclusive')) {
                        result.maxInclusive = parseFloat(childText);
                    } else {
                        result[propertyName] = childText;
                    }
                } else {
                    result[propertyName] = xmlElementToJson(elem);
                }
            }
        } else {
            // Multiple elements OR single element that must be array
            result[propertyName] = elements.map(elem => {
                const childText = getXmlElementText(elem);
                const langAttr = elem.getAttribute('xml:lang') || elem.getAttribute('lang');

                if (isMultiLang || langAttr) {
                    return {
                        value: childText,
                        ...(langAttr && { lang: langAttr })
                    };
                } else {
                    const hasChildElements = Array.from(elem.childNodes).some(
                        node => node.nodeType === NodeType.ELEMENT_NODE
                    );

                    if (!hasChildElements && childText) {
                        return childText;
                    } else {
                        return xmlElementToJson(elem);
                    }
                }
            });
        }
    }

    // 5. If element has only text content and no child elements, add as value
    if (childElementsByTag.size === 0 && textContent.length > 0) {
        result.value = textContent.join(' ');
    }

    // 6. Add collected configurable properties and links
    if (configurableProperties.length > 0) {
        result.hasProperty = configurableProperties;
    }
    if (configurableSourceLinks.length > 0) {
        result.hasSourceLink = configurableSourceLinks;
    }
    if (configurableTargetLinks.length > 0) {
        result.hasTargetLink = configurableTargetLinks;
    }
    // LOG.debug('xmlElementToJson: ', /*xmlElement.attributes, '\n',*/ JSON.stringify(result,null,2)) ;

    return result;
}
/**
 * Check if a property must always be represented as an array
 * Even when only a single element is present in XML
 * 
 * Note: Some properties are context-dependent:
 * - eligibleTargetLink: array for Entity, string for Relationship
 * - eligibleSourceLink: always string (Relationship only)
 * 
 * Context detection is done via the parent element's itemType
 */
function requiresArray(propertyName: string, parentItemType?: PigItemTypeValue): boolean {
    // Remove namespace prefix for checking
    const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

    // Properties that ALWAYS require arrays
    const alwaysArrayProps = new Set([
        'eligibleValue',        // Property.eligibleValue: IEligibleValue[]
        'eligibleEndpoint',     // Link.eligibleEndpoint: TPigId[]
        'eligibleProperty',     // Entity/Relationship.eligibleProperty?: TPigId[]
        'composedProperty',     // Property.composedProperty?: TPigId[]
        'priorRevision'         // AnElement.priorRevision?: TRevision[]
    ]);

    if (alwaysArrayProps.has(localName)) {
        return true;
    }

    // Context-dependent: eligibleTargetLink
    if (localName === 'eligibleTargetLink') {
        // Entity: eligibleTargetLink?: TPigId[] (array)
        // Relationship: eligibleTargetLink?: TPigId (string)
        return parentItemType === PigItemType.Entity;
    }

    // Context-dependent: eligibleSourceLink
    if (localName === 'eligibleSourceLink') {
        // Relationship: eligibleSourceLink?: TPigId (string)
        return false; // Never an array
    }

    return false;
}
/**
 * Process pig:aProperty element
 * Extracts:
 * - rdf:type → hasClass
 * - <value> → value
 * - itemType → pig:aProperty
 */
function processConfigurableProperty(elem: ElementXML): JsonObject {
    const prop: JsonObject = {
        itemType: PigItemType.aProperty
    };

    // Extract rdf:type and pig:hasClass as hasClass
    const rdfType = elem.getAttribute('rdf:type') || elem.getAttribute('type') || elem.getAttribute('pig:hasClass') || elem.getAttribute('hasClass');
    if (rdfType) {
        prop.hasClass = rdfType;
    }

    // Extract child elements
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const childElement = child as ElementXML;
            const childTagName = childElement.tagName;

            if (childTagName === 'value') {
                prop.value = getXmlElementText(childElement);
            } else if (childTagName === 'idRef') {
                prop.idRef = childElement.textContent?.trim() as JsonValue;
            } else if (childTagName.endsWith('type')  || childTagName.endsWith('hasClass')) {
                prop.hasClass = childElement.textContent?.trim() as JsonValue;
            } else if (childTagName === 'aComposedProperty') {
                if (!prop.aComposedProperty) {
                    prop.aComposedProperty = [];
                }
                (prop.aComposedProperty as string[]).push(childElement.textContent?.trim() || '');
            }
        }
    }

    return prop;
}

/**
 * Process pig:aSourceLink or pig:aTargetLink element
 * Extracts:
 * - rdf:type → hasClass
 * - <idRef> → idRef
 * - itemType → pig:aSourceLink or pig:aTargetLink
 */
function processConfigurableLink(elem: ElementXML, itemType: PigItemTypeValue): JsonObject {
    const link: JsonObject = {
        itemType: itemType
    };

    // Extract rdf:type and pig:hasClass as hasClass
    const rdfType = elem.getAttribute('rdf:type') || elem.getAttribute('type') || elem.getAttribute('pig:hasClass') || elem.getAttribute('hasClass');
    if (rdfType) {
        link.hasClass = rdfType;
    }

    // Extract child elements
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const childElement = child as ElementXML;
            const childTagName = childElement.tagName;

            if (childTagName === 'idRef') {
                link.idRef = childElement.textContent?.trim() as JsonValue;
            }
        }
    }

    return link;
}

/**
 * Check if a property name needs IText wrapper ({ value: "..." })
 * Currently only 'icon' according to IElement interface
 */
function requiresIText(propertyName: string): boolean {
    const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

    // Fields that need IText wrapper: { value: string }
    const textWrapperFields = new Set([
        'icon'    // 'pig:Icon' after mvf
    ]);

    return textWrapperFields.has(localName);
}

/**
 * Transform xs:simpleType element and extract datatype constraints
 * From:
 *   <xs:simpleType>
 *     <xs:restriction base="xs:string">
 *       <xs:maxLength value="256"/>
 *       <xs:maxOccurs>1</xs:maxOccurs>
 *     </xs:restriction>
 *   </xs:simpleType>
 * To:
 *   datatype: "xs:string"
 *   maxLength: 256
 *   maxCount: 1
 */
function xSimpleType(simpleTypeElement: ElementXML, result: JsonObject): void {
    // Find xs:restriction element using childNodes instead of children
    let restriction: ElementXML | undefined;

    for (const child of Array.from(simpleTypeElement.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const elem = child as ElementXML;
            if (elem.tagName.endsWith('restriction')) {
                restriction = elem;
                break;
            }
        }
    }

    if (!restriction) return;

    // Extract base attribute as datatype
    const baseAttr = restriction.getAttribute('base');
    if (baseAttr) {
        result.datatype = baseAttr;
    }

    // Process restriction children using childNodes
    for (const child of Array.from(restriction.childNodes)) {
        if (child.nodeType !== NodeType.ELEMENT_NODE) continue;

        const elem = child as ElementXML;
        const tagName = elem.tagName;
        const localName = tagName.includes(':') ? tagName.split(':')[1] : tagName;

        // Extract value attribute or text content
        const value = elem.getAttribute('value') || elem.textContent?.trim();
        if (!value) continue;

        // Map XSD constraints to PIG properties
        switch (localName) {
            case 'maxLength':
                result.maxLength = parseInt(value, 10);
                break;
        /*    case 'minLength':
                result.minLength = parseInt(value, 10);
                break; */
            case 'maxOccurs':
                result.maxCount = parseInt(value, 10);
                break;
            case 'minOccurs':
                result.minCount = parseInt(value, 10);
                break;
            case 'pattern':
                result.pattern = value;
                break;
            case 'minInclusive':
                result.minInclusive = parseFloat(value);
                break;
            case 'maxInclusive':
                result.maxInclusive = parseFloat(value);
                break;
        /*    case 'minExclusive':
                result.minExclusive = parseFloat(value);
                break;
            case 'maxExclusive':
                result.maxExclusive = parseFloat(value);
                break; */
            default:
                // Unknown constraint - log warning
                LOG.warn(`xSimpleType: unknown constraint '${localName}' with value '${value}'`);
        }
    }
}

/**
 * Get the text content of an XML DOM element, handling both simple text and HTML content
 * @param xmlElement - XML DOM Element
 * @returns Text content, preserving HTML if present
 */
/**
 * Get the text content of an XML DOM element, handling both simple text and HTML content
 * @param xmlElement - XML DOM Element
 * @returns Text content, preserving HTML if present (without escaping)
 */
function getXmlElementText(xmlElement: ElementXML): string {
    // Check if element contains HTML elements (p, div, span, etc.)
    const hasHtmlContent = Array.from(xmlElement.childNodes).some(node =>
        node.nodeType === NodeType.ELEMENT_NODE &&
        ['p', 'div', 'span', 'small', 'i', 'a', 'object'].includes((node as ElementXML).tagName.toLowerCase())
    );

    if (hasHtmlContent) {
        // ✅ Use platform-independent serialization WITHOUT escaping
        /* In the browser, we could use:
        return xmlElement.innerHTML?.trim() || ''; */
        // return serializeXmlContent(xmlElement);
        return PIN.innerHTML(xmlElement) || '';
    } else {
        // Return plain text content
        return xmlElement.textContent?.trim() || '';
    }
}

/**
 * Check if a property name represents a multi-language text field
 * These fields must always be arrays of ILanguageText objects according to pig-schemata.ts
 * 
 * Multi-language fields found in schemas:
 * - Property: title, description, eligibleValue.title // the latter is handled through recursive iteration
 * - Link: title, description
 * - Entity: title, description
 * - Relationship: title, description
 * - AnEntity: title, description
 * - ARelationship: title, description
 *
 * ToDo: multiLanguageText also occurs in instances aProperty of configurable Property with datatype = 'string'
 */
function isMultiLanguageText(propertyName: string): boolean {
    // Remove namespace prefix for checking
    const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

    // All multi-language fields from PIG schemas that use LanguageText[]
    const multiLangFields = new Set([
        // Common fields across all PIG classes and instances
        'title',           // dcterms:title - used in Property, Link, Entity, Relationship, AnEntity, ARelationship
        'description'      // dcterms:description - used in Property, Link, Entity, Relationship, AnEntity, ARelationship

        // Note: eligibleValue.title is handled separately in xmlElementToJson()
        // because it's nested within eligibleValue objects
    ]);

    return multiLangFields.has(localName);
}

// Helper function to get localized text from multi-language array
function getLocalText(texts?: ILanguageText[], lang?: TISODateString): string {
    if (!texts || texts.length === 0) return '';

    lang = lang ?? 'en-US';

    // Try to find exact language match
    const exact = texts.find(t => t.lang === lang);
    if (exact) return LIB.passifyHTML(exact.value);

    // Try to find language prefix match (e.g., 'en' for 'en-US')
    const langPrefix = lang.split('-')[0];
    const prefixMatch = texts.find(t => t.lang?.startsWith(langPrefix));
    if (prefixMatch) return LIB.passifyHTML(prefixMatch.value);

    // Fallback to first available text
    return LIB.passifyHTML(texts[0].value);
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
 * Build a simple id-object.
 * - useJsonLd=false => { id: 'xyz' }
 * - useJsonLd=true  => { '@id': 'xyz' }
 *
function buildIdObject(id: string, useJsonLd = false): JsonObject {
    return useJsonLd ? { ['@id']: id } : { id };
}
makeIdObject(str: string): JsonObject {
        return { id: str };
}
*/
