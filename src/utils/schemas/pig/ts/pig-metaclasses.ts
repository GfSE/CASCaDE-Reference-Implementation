/*!
 * Product Information Graph (PIG) Metaclasses
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/** Product Information Graph (PIG) Metaclasses - the basic object structure representing the PIG
 *  Dependencies: none
 *  Authors: oskar.dungern@gfse.org, ..
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *  We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Link-Implementation/issues)
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
 *  - Programming errors result in exceptions, data errors in IRsp return values.
 */

import { IRsp, rspOK, Msg, Rsp } from "../../../lib/messages";
import { RE } from "../../../lib/definitions";
import { LIB, logger } from "../../../lib/helpers";
import { JsonPrimitive, JsonValue, JsonArray, JsonObject } from "../../../lib/helpers";
// use central Ajv instance from the Vue plugin:
import { SCH } from '../json/pig-schemata';
import { checkConstraintsForPackage } from './pig-package-constraints';
// optional: import type for better TS typing where needed

export type TPigId = string;  // an URI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Property | Link | Entity | Relationship;
export type TPigElement = Entity | Relationship;
export type TPigAnElement = AnEntity | ARelationship;
export type TPigItem = APackage | TPigClass | TPigAnElement;
export type stringHTML = string;  // contains HTML code
export type tagIETF = string; // contains IETF language tag
export type TISODateString = string;

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

/* same as above, but using 'type' instead of 'const enum':
export type PigItemTypeValue = 'pig:Property' | 'pig:Link' | 'pig:Entity' | 'pig:Relationship' | 'pig:aProperty' | 'pig:aLink' | 'pig:anEntity' | 'pig:aRelationship';
export const PigItemType: Record<'Property' | 'Link' | 'Entity' | 'Relationship' | 'aProperty' | 'aLink' | 'anEntity' | 'aRelationship', PigItemTypeValue> = {
    // PIG classes:
    Property: 'pig:Property',
    Link: 'pig:Link',
    Entity: 'pig:Entity',
    Relationship: 'pig:Relationship',
    // PIG instances/individuals:
    aProperty: 'pig:aProperty',
    aLink: 'pig:aLink',
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
function isSupportedXsDataType(value: unknown): value is XsDataType {
    if (typeof value !== 'string') return false;
    const norm = value.replace(/^xsd:/,'xs:');
    return (Object.values(XsDataType) as string[]).includes(norm);
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
        return this.lastStatus;
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
    protected validate(itm: IItem) {
        if (itm.itemType !== this.itemType)
            return Msg.create(600, this.itemType, itm.itemType);
        return rspOK;
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
    protected set(itm: IIdentifiable) {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        //        logger.debug('Identifiable.set i: ', itm);
        super.set(itm);
        this.id = itm.id;
        this.specializes = itm.specializes;
        this.title = itm.title;
        this.description = itm.description;
//        logger.debug('Identifiable.set o: ', this);
        // made chainable in concrete subclass
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
    protected setJSONLD(itm: any) {
        let _itm = { ...itm };

        // 1. Rename JSON-LD tags to internal format
        _itm = LIB.renameJsonTags(_itm as JsonValue, LIB.fromJSONLD, { mutate: false }) as any;

        // 2. Replace id-objects with id-strings
        _itm = replaceIdObjects(_itm);

        // 3. Normalize multi-language texts (from abstract normalize)
        _itm = { ..._itm };
        _itm.title = normalizeMultiLanguageText(_itm.title);
        _itm.description = normalizeMultiLanguageText(_itm.description);

        // Set the normalized object in the concrete subclass
        return _itm;
    }
    protected getJSONLD() {
        const jld = LIB.renameJsonTags(this.get() as unknown as JsonObject, LIB.toJSONLD, { mutate: false }) as JsonObject;
    //    logger.debug('Identifiable.getJSONLD: ', jld);
        return makeIdObjects(jld) as JsonObject;        
    }
    protected validate(itm: IIdentifiable) {
        if (this.id && itm.id !== this.id)
            return Msg.create(610, this.id, itm.id);
        if(this.specializes && this.specializes !== itm.specializes)
            return Msg.create(611, this.specializes, itm.specializes);

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
}

interface IALink extends IItem {
    idRef: TPigId;  // must point to an element according to eligibleTarget of the class
}
abstract class ALink extends Item implements IALink {
    idRef!: TPigId;
    constructor(itm: IItem) {
        super(itm);
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
    protected validate(itm: IALink) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, itm.itemType);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Link URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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
        // if present and empty, no properties are allowed.
        // This is tested via schema at concrete class level.
    /*    const rsp = validateIdStringArray(itm.eligibleProperty, 'eligibleProperty', { canBeUndefined: true, minCount: 0 });
        if (!rsp.ok) return rsp; */
        // ToDo: implement further validation logic
        return super.validate(itm);
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
    protected set(itm: IAnElement) {
    //    logger.debug('anEl.set 0', itm.hasProperty);
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;

        this.hasProperty = itm.hasProperty ? itm.hasProperty.map(p => new AProperty().set(p)) : [];
    //    logger.debug('anEl.set 9',itm.hasProperty, this.hasProperty);
        // made chainable in concrete subclass
    }
    protected get() {
    //    logger.debug('anElement.get():', this/*.hasProperty, this.hasProperty.map(p => p.get())*/);
        return {
            ...super.get(),
            revision: this.revision,
            priorRevision: this.priorRevision,
            modified: this.modified,
            creator: this.creator,
            hasProperty: this.hasProperty.map(p => p.get())
        };
    }
    protected setJSONLD(itm:any) {
        // In JSON-LD all configurable properties have an ID-string as tag and an itemType pig:aProperty;
        // collect them here in a hasProperty array, where the tag becomes hasClass;
        // they will be instantiated as AProperty items in set():
        const _itm = super.setJSONLD(itm) as any;

        _itm.hasProperty = collectConfigurablesFromJSONLD(_itm, PigItemType.aProperty) as IAProperty[] | undefined;
        _itm.modified = _itm.modified || new Date().toISOString();
        //    logger.debug('AnElement.setJSONLD: '+ JSON.stringify(_itm, null, 2));

        // Set the normalized object in the concrete subclass
        return _itm
    }
    protected getJSONLD() {
        const jld = super.getJSONLD();

        return addConfigurablesToJSONLD(jld, this, 'hasProperty');
    }
    protected validate(itm: IAnElement) {
        // ToDo: implement further validation logic
        return super.validate(itm);
    }
}

//////////////////////////////////////
// The concrete classes:
export interface IEligibleValue {
    id: TPigId;
    title: ILanguageText[];
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
    set(itm: IProperty) {
        this.lastStatus = this.validate(itm);
        // logger.debug('Property.set: '+ JSON.stringify(this.lastStatus));
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
    setJSONLD(itm: any) {
        const _itm = super.setJSONLD(itm) as any;

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
        if (!isSupportedXsDataType(itm.datatype)) {
            const msg = Msg.create(680,itm.id, itm.datatype);
            logger.warn(msg.statusText);
            //            return msg */
        }

        // ToDo: implement further validation logic
        return super.validate(itm);
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
    setJSONLD(itm:any) {
        const _itm = super.setJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    getHTML(options?: object): stringHTML {
        return '<div>not implemented yet</div>';
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
}

export interface IEntity extends IElement {
    eligibleTargetLink?: TPigId[];  // must hold Link URIs
}
export class Entity extends Element implements IEntity {
    eligibleTargetLink?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.Entity });
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
    setJSONLD(itm: any) {
        const _itm = super.setJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    validate(itm: IEntity) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
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
    setJSONLD(itm: any) {
        const _itm = super.setJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
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
}

// For the instances/individuals, the 'payload':
export interface IAProperty extends IItem {
    value?: string;  // a. literal value, string, number, boolean, date, ... all as string! 
    idRef?: TPigId;  // b. must point to an element of eligibleValue in its Property class
    aComposedProperty?: TPigId[];
}
export class AProperty extends Item implements IAProperty {
    value?: string;
    idRef?: TPigId;
    aComposedProperty?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.aProperty });
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
/*    setJSONLD(itm: any) {
        const _itm = { ...itm };
        return this.set(_itm);
    }
    getJSONLD() {
        return this.get();
    } */
    setJSONLD(itm: any) {
        let _itm = LIB.renameJsonTags(itm as JsonValue, LIB.fromJSONLD, { mutate: false }) as any;
        _itm = replaceIdObjects(_itm);
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        const jld = LIB.renameJsonTags(this.get() as unknown as JsonObject, LIB.toJSONLD, { mutate: false }) as JsonObject;
        return makeIdObjects(jld) as JsonObject;
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML snippet with the property value
        return '<div>not implemented yet</div>';
    }
    validate(itm: IAProperty) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, PigItemType.aProperty);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
}
export class ASourceLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aSourceLink });
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
    setJSONLD(itm: any) {
        let _itm = LIB.renameJsonTags(itm as JsonValue, LIB.fromJSONLD, { mutate: false }) as any;
        _itm = replaceIdObjects(_itm);
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        const jld = LIB.renameJsonTags(this.get() as unknown as JsonObject, LIB.toJSONLD, { mutate: false }) as JsonObject;
        return makeIdObjects(jld) as JsonObject;
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, PigItemType.aSourceLink);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
}
export class ATargetLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aTargetLink });
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
    setJSONLD(itm: any) {
        let _itm = LIB.renameJsonTags(itm as JsonValue, LIB.fromJSONLD, { mutate: false }) as any;
        _itm = replaceIdObjects(_itm);
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        const jld = LIB.renameJsonTags(this.get() as unknown as JsonObject, LIB.toJSONLD, { mutate: false }) as JsonObject;
        return makeIdObjects(jld) as JsonObject;
    }
/*    setJSONLD(itm: any) {
        const _itm = { ...itm };
        return this.set(_itm);
    }
    getJSONLD() {
        return this.get();
    } */
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, PigItemType.aTargetLink);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Property URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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
    set(itm: IAnEntity) {
        const _itm:IAnEntity = LIB.stripUndefined( itm );
    //    logger.debug('AnEntity.set():', _itm);
        this.lastStatus = this.validate(_itm);
    //    logger.debug('AnEntity.set status and input: ' + JSON.stringify(this.lastStatus), JSON.stringify(_itm, null, 2));
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
    setJSONLD(itm: any) {
        // In JSON-LD all configurable references have an ID-string as tag and an itemType pig:aLink;
        // collect them here in a hasTarget array, where the tag becomes hasClass;
        // they will be instantiated as AProperty items in set():
    //    logger.debug('AnEntity.setJSONLD input: ', JSON.stringify(itm, null, 2));
        const _itm = super.setJSONLD(itm) as any;
        _itm.hasTargetLink = collectConfigurablesFromJSONLD(_itm, PigItemType.aTargetLink) as IALink[] | undefined;
        // logger.debug('AnEntity.setJSONLD: ', JSON.stringify(_itm, null, 2));

        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        let jld = super.getJSONLD();
        jld = addConfigurablesToJSONLD(jld, this, 'hasTargetLink');
    //    logger.debug('AnEntity.getJSONLD: ', out);
        return jld;
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML representation of the entity including its properties
        return '<div>not implemented yet</div>';
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
            return Msg.create(601, PigItemType.anEntity);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Entity URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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
    set(itm: IARelationship) {
        const _itm: IARelationship = LIB.stripUndefined(itm);
        //logger.debug('ARelationship.set():', _itm);
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
    setJSONLD(itm: any) {
        // In JSON-LD all configurable references have an ID-string as tag and an itemType pig:aLink;
        // collect them here in a hasTarget array, where the tag becomes hasClass;
        // they will be instantiated as AProperty items in set():
        const _itm = super.setJSONLD(itm) as any;
        _itm.hasSourceLink = collectConfigurablesFromJSONLD(_itm, PigItemType.aSourceLink) as IALink[];
        _itm.hasTargetLink = collectConfigurablesFromJSONLD(_itm, PigItemType.aTargetLink) as IALink[];
        return this.set(_itm);
    }
    getJSONLD() {
//        if (!this.lastStatus.ok) return undefined;
        let jld = super.getJSONLD();
        jld = addConfigurablesToJSONLD(jld, this, 'hasSourceLink');
        jld = addConfigurablesToJSONLD(jld, this, 'hasTargetLink');
        //    logger.debug('AnEntity.getJSONLD: ', out);
        return jld;
    }
    getHTML(options?: object): stringHTML {
        // ToDo: implement a HTML representation of the relationship including its properties
        return '<div>not implemented yet</div>';
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
            return Msg.create(601, PigItemType.aRelationship);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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

    set(itm: IAPackage): APackage {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.context = itm.context;
            this.graph = itm.graph;
            this.modified = itm.modified;
            this.creator = itm.creator;
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
                // logger.debug(`APackage.get: processing item `, item);
                return item.get();
            }),
            modified: this.modified,
            creator: this.creator
        } as IAPackage;
        
        return LIB.stripUndefined(pkg);
    }

    setJSONLD(doc: any): TPigItem[] {
        // Extract @context
        const ctx = this.extractContext(doc);
        
        // Extract package metadata
        const meta = this.extractMetadata(doc);
        
        // Extract and process @graph
        let graph: any[] = Array.isArray(doc['@graph']) 
            ? doc['@graph'] 
            : (Array.isArray(doc.graph) ? doc.graph : []);

        if (graph.length === 0) {
            logger.warn('APackage.setJSONLD: empty @graph');
        }

        graph = graph.map(
            item => {
                const instance = this.instantiateItem(item);
                if (instance) {
                    // logger.debug(`APackage.set: `, instance);
                    return instance;
                }
                else
                    logger.warn(`APackage.setJSONLD: could not instantiate item ${JSON.stringify(item)}`);
            }
        );

    /*    logger.debug(`APackage.setJSONLD: processing ${graph.length} items from package ${meta.id || 'unnamed'}`);
        logger.debug('APackage.setJSONLD: extracted context:', ctx);
        logger.debug('APackage.setJSONLD: extracted metadata:', meta);
    */
        // Set default modified timestamp if not present
        if (!this.modified) {
            this.modified = new Date().toISOString();
        }

        // Call set to validate and return all items including package
        this.set({
            itemType: PigItemType.aPackage,
            id: meta.id,
            title: meta.title,
            description: meta.description,
            context: ctx,
            graph: graph,
            modified: meta.modified,
            creator: meta.creator
        } as IAPackage);

        // return the instantiated graph and graph items:
        return [this as TPigItem].concat(this.graph);
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

    validate(itm: IAPackage): IRsp {
        // graph must be present and be an array
        if (!Array.isArray(itm.graph) || itm.graph.length<1) {
            return Msg.create(630, 'graph');
        }

        // Call parent validation
        let rsp = super.validate(itm);
        if (!rsp.ok) {
            return rsp;
        }

        rsp = checkConstraintsForPackage(itm);
        // if (itm.id == 'd:test-invalid-prop')
            // logger.debug(`APackage.validate: validating package `, itm, rsp);

        if (!rsp.ok) {
            return rsp;
        }

        return rspOK;
    }

    /**
     * Extract @context from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Context as INamespace[], string, Record<string, string>, or undefined
     */
    private extractContext(doc: any): INamespace[] | string | Record<string, string> | undefined {
        const ctx = doc['@context'] || doc.context;
        // logger.debug('extractContext (1): ',ctx);

        if (!ctx) {
            logger.warn('APackage: no @context found in document');
            return undefined;
        }

    /*    // String context (URL)
        if (typeof ctx === 'string') {
            logger.debug(`APackage: extracted context URL: ${ctx}`);
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
                // logger.debug(`APackage: extracted ${namespaces.length} namespaces from context`);
                return namespaces;
            }
            // Return original object if no valid namespaces found
            // logger.debug('APackage: extracted context object');
            return ctx;
        }

    /*    // Array context
        if (Array.isArray(ctx)) {
            logger.debug(`APackage: extracted array context with ${ctx.length} entries`);
            return ctx;
        } */

        logger.warn('APackage: unsupported @context format');
        return undefined;
    }
    /**
     * Extract package metadata from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Metadata object with id, modified, creator, title, and description
     */
    private extractMetadata(doc: any): {
        id?: TPigId;
        modified?: TISODateString;
        creator?: string;
        title?: ILanguageText[];
        description?: ILanguageText[];
    } {
        const metadata: {
            id?: TPigId;
            modified?: TISODateString;
            creator?: string;
            title?: ILanguageText[];
            description?: ILanguageText[];
        } = {};

        // Extract ID
        metadata.id = doc['@id'] || doc.id;

        // Extract dcterms:modified
        metadata.modified = doc['dcterms:modified'] || doc.modified;

        // Extract dcterms:creator
        metadata.creator = doc['dcterms:creator'] || doc.creator;

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

        // logger.debug(`APackage metadata: id=${metadata.id}, title=${metadata.title?.[0]?.value}, modified=${metadata.modified}, creator=${metadata.creator}`);

        return metadata;
    }

    /**
     * Instantiate a single PIG item from JSON-LD
     */
    private instantiateItem(item: any): TPigItem | undefined {
        // Validate item has required pig:itemType
        if (!item['pig:itemType'] || !item['pig:itemType']['@id']) {
            logger.error('APackage: @graph element missing pig:itemType, skipping ' + (item['@id'] || item.id || 'unknown'));
            return;
        }

        const itype: any = item['pig:itemType']['@id'];

        // Filter allowed item types
        if (!this.isAllowedItemType(itype)) {
            logger.error(`APackage: skipping unknown item type '${itype}'`);
            return;
        }

        const instance = this.createInstance(itype);
        
        if (!instance) {
            logger.error(`APackage: unable to create instance for itemType '${itype}'`);
            return;
        }

        try {
            (instance as any).setJSONLD(item);
            // logger.debug(`APackage: successfully instantiated ${itype} with id ${item['@id']}`);
            return instance;
        } catch (err: any) {
            logger.error(`APackage: failed to populate instance with itemType '${itype}': ${err?.message ?? err}`);
        }
    }

    /**
     * Check if item type is allowed for instantiation
     */
    private isAllowedItemType(itype: any): boolean {
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
     * Create a new instance based on item type
     */
    private createInstance(itype: any): TPigItem | null {
        try {
            switch (itype) {
                case PigItemType.Property:
                    return new Property();
                case PigItemType.Link:
                    return new Link();
                case PigItemType.Entity:
                    return new Entity();
                case PigItemType.Relationship:
                    return new Relationship();
                case PigItemType.anEntity:
                    return new AnEntity();
                case PigItemType.aRelationship:
                    return new ARelationship();
                default:
                    return null;
            }
        } catch (err: any) {
            logger.error(`APackage: error creating instance for '${itype}': ${err?.message ?? err}`);
            return null;
        }
    }
}

/* Simple runtime type-guards */
export function isProperty(obj: Identifiable): obj is Property {
    return !!obj && obj.itemType === PigItemType.Property;
}
export function isLink(obj: Identifiable): obj is Link {
    return !!obj && obj.itemType === PigItemType.Link;
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
export function isAPackage(obj: Identifiable): obj is APackage {
    return !!obj && obj.itemType === PigItemType.aPackage;
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
    //    if (typeof o['@id'] === 'string' && (o['@id'] as string).trim() !== '') return o['@id'] as string;
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
 */
/* export function validateIdStringArray(
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
        return id ? validateIdString(id, fieldName) : Msg.create(623, fieldName);
    }
    return Msg.create(622, fieldName);
} */
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
/*function validateIdObjectArray(input: unknown, fieldName = 'ids'): IRsp {
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
            //    obj[k] = walk(obj[k]);
            const key = String(k);
            const newVal = walk((obj as JsonObject)[key]);
            (obj as JsonObject)[key] = newVal as JsonValue;
        }
        return obj;
    }

    return walk(root);
}
// Helper: normalize language tags/values ---
function normalizeLanguageText(src: any): ILanguageText {
//    logger.debug('normalizeLanguageText', src);
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
//    logger.debug('validateMultiLanguageText',arr,fieldName);
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
    // the tags have already been renamed with LIB.renameJsonTags( ..., LIB.fromJSONLD):
    const skipKeys = new Set(LIB.toJSONLD.map(([key]) => key));

    //logger.debug('collect 1',obj,itype);
    for (const key of Object.keys(obj)) {
        // Skip known metadata keys and standard PIG fields
        if (skipKeys.has(key)) continue;

        // Check if key is a valid ID string (namespace:name or URI)
        if (!isValidIdString(key)) continue;

        const val = obj[key];
        //logger.debug('collect 2', key,val);

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
    //    return properties.length > 0 ? properties : undefined;
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
//    logger.debug('addConfigurablesToJSONLD:', jld, anEl, hasX, items);

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
},*/
