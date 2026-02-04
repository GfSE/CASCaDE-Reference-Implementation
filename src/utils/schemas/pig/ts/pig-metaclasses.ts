/*!
 * Product Information Graph (PIG) Metaclasses
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/** Product Information Graph (PIG) Metaclasses - the basic object structure representing the PIG
 *  Dependencies: none
 *  Authors: oskar.dungern@gfse.org, ..
 *  License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
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
import { MVF } from "../../../lib/mvf";
import { JsonPrimitive, JsonValue, JsonArray, JsonObject } from "../../../lib/helpers";
// use central Ajv instance from the Vue plugin:
import { SCH } from '../json/pig-schemata';
import { checkConstraintsForPackage, ConstraintCheckType } from './pig-package-constraints';
// optional: import type for better TS typing where needed

export type TPigId = string;  // an URI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Property | Link | Entity | Relationship;
export type TPigElement = Entity | Relationship;
export type TPigAnElement = AnEntity | ARelationship;
export type TPigItem = APackage | TPigClass | TPigAnElement;
export type stringHTML = string;  // contains HTML code
export type stringXML = string;  // contains XML code
export type tagIETF = string; // contains IETF language tag
export type TISODateString = string;
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
        return this.lastStatus;
    }
    protected validate(itm: IItem) {
        if (itm.itemType !== this.itemType)
            return Msg.create(600, this.itemType, itm.itemType);
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
            return Msg.create(602, this.id, itm.id);
        if (this.specializes && this.specializes !== itm.specializes)
            return Msg.create(603, this.specializes, itm.specializes);

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
        // ToDo: consider to return this like in setXML()
    }
    protected getJSONLD() {
        const jld = MVF.renameJsonTags(this.get() as unknown as JsonObject, MVF.toJSONLD, { mutate: false }) as JsonObject;
    //    logger.debug('Identifiable.getJSONLD: ', jld);
        return makeIdObjects(jld) as JsonObject;        
    }
    protected setXML(itm: any) {
        this.lastStatus = xml2json(itm);
        // Set the normalized object in the concrete subclass
        return this; // differently than setJSOLD(), returns this
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
            return Msg.create(601, itm.itemType);
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
    protected setXML(itm: any) {
        this.lastStatus = xml2json(itm);
        // Set the normalized object in the concrete subclass
        return this;
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
/*    protected setXML(itm: stringXML) {
        return super.setXML(itm);
    }
    protected validate(itm: IAnElement) {
        // ToDo: implement further validation logic
        return super.validate(itm);
    } */
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
            const msg = Msg.create(680, itm.id, itm.datatype);
            logger.warn(msg.statusText);
            //            return msg */
        }

        // ToDo: implement further validation logic
        return super.validate(itm);
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
        const ld = super.setJSONLD(itm) as any;

        // Normalize datatype (Property-specific)
        if (ld.datatype) {
            ld.datatype = ld.datatype.replace(/^xsd:/, 'xs:');
        }

        return this.set(ld);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as IProperty);
        return this;
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
    setJSONLD(itm:any) {
        const _itm = super.setJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as ILink);
        return this;
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
        // logger.debug('Entity.validate: ', itm);
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
    setJSONLD(itm: any) {
        const _itm = super.setJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as ILink);
        return this;
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
    setJSONLD(itm: any) {
        const _itm = super.setJSONLD(itm) as any;
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        return super.getJSONLD();
    }
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as ILink);
        return this;
    /*    this.lastStatus = Msg.create(699, 'setXML');
        return this; */
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
    validate(itm: IAProperty) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, PigItemType.aProperty);
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
/*    setJSONLD(itm: any) {
        let _itm = MVF.renameJsonTags(itm as JsonValue, MVF.fromJSONLD, { mutate: false }) as any;
        _itm = replaceIdObjects(_itm);
        return this.set(_itm);
    }
    getJSONLD() {
        //        if (!this.lastStatus.ok) return undefined;
        const jld = MVF.renameJsonTags(this.get() as unknown as JsonObject, MVF.toJSONLD, { mutate: false }) as JsonObject;
        return makeIdObjects(jld) as JsonObject;
    }
    setXML(itm: stringXML) {
        this.lastStatus = Msg.create(699, 'setXML');
        return this;
        //    return itm;
    } */
}
export class ASourceLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aSourceLink });
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, PigItemType.aSourceLink);
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
/*    setJSONLD(itm: any) {
        return super.setJSONLD(itm);
    }
    getJSONLD() {
        return super.getJSONLD();
    }
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as IALink);
        return this;
    } */
}
export class ATargetLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aTargetLink });
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(601, PigItemType.aTargetLink);
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
/*    setJSONLD(itm: any) {
        return super.setJSONLD(itm);
    }
    getJSONLD() {
        return super.getJSONLD();
    }
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as IALink);
        return this;
    } */
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
            return Msg.create(601, PigItemType.anEntity);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Entity URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as IAnEntity);
        return this;
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
                    const propValue = passifyHTML(propData.value || propData.idRef || '—');
                    const propClass = passifyHTML(propData.hasClass);
                    propertiesHTML += `<dt>${propClass}</dt><dd>${propValue}</dd>`;
                }
            }
            propertiesHTML += '</dl></div>';
        }

        // Build metadata HTML with localized date
        const metadataHTML = `<div class="pig-metadata">
            <dl>
                <dt>ID</dt><dd>${passifyHTML(this.id)}</dd>
                <dt>Class</dt><dd>${passifyHTML(this.hasClass || '—')}</dd>
                <dt>Revision</dt><dd>${passifyHTML(this.revision)}</dd>
                <dt>Modified</dt><dd>${getLocalDate(this.modified, lang)}</dd>
                ${this.creator ? `<dt>Creator</dt><dd>${passifyHTML(this.creator)}</dd>` : ''}
                ${this.priorRevision && this.priorRevision.length > 0 ? `<dt>Prior Revisions</dt><dd>${this.priorRevision.map(r => passifyHTML(r)).join(', ')}</dd>` : ''}
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
            return Msg.create(601, PigItemType.aRelationship);
        // ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
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
    setXML(itm: stringXML) {
        super.setXML(itm);
        if (this.lastStatus.ok)
            return this.set(this.lastStatus.response as IARelationship);
        return this;
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

    validate(itm: IAPackage, checks?: ConstraintCheckType[] ): IRsp {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        // logger.debug('APackage.validate: ', itm);
        try {
            const ok = SCH.validateAPackageSchema(itm);
            if (!ok) {
                const msg = SCH.getValidateAPackageErrors();
                return Msg.create(681, 'aPackage', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(682, 'aRelationship', itm.id, err?.message ?? String(err));
        }

    /* checked by schema ..
        // graph must be present and be an array
        if (!Array.isArray(itm.graph) || itm.graph.length < 1) {
            return Msg.create(630, 'graph');
        }
    */
        // Call parent validation
        let rsp = super.validate(itm);
        if (!rsp.ok) {
            return rsp;
        }

        rsp = checkConstraintsForPackage(itm,checks);
        // if (itm.id == 'd:test-invalid-prop')
        // logger.debug(`APackage.validate: validating package `, itm, rsp);

        if (!rsp.ok) {
            return rsp;
        }

        return rspOK;
    }

    set(itm: IAPackage, checks?: ConstraintCheckType[]): APackage {
        this.lastStatus = this.validate(itm,checks);
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

    setJSONLD(doc: any, checks?: ConstraintCheckType[]): APackage {
        // Extract @context
        const ctx = this.extractContextJSONLD(doc);
        
        // Extract package metadata
        const meta = this.extractMetadataJSONLD(doc);
        
        // Extract and process @graph
        const graph: any[] = Array.isArray(doc['@graph']) 
            ? doc['@graph'] 
            : (Array.isArray(doc.graph) ? doc.graph : []);

        if (graph.length === 0) {
            logger.warn('APackage.setJSONLD: empty @graph');
        }

        // Instantiate each graph item
        const instantiatedGraph: TPigItem[] = [];
        const errors: string[] = [];

        for (const item of graph) {
            const result = this.instantiateItemJSONLD(item);

            if (result.ok && result.response) {
                instantiatedGraph.push(result.response as TPigItem);
            } else {
                const errorMsg = result.statusText || 'Unknown instantiation error';
                errors.push(errorMsg);
                logger.warn(`APackage.setJSONLD: ${errorMsg}`);
            }
        }

        if (errors.length > 0) {
            logger.warn(`APackage.setJSONLD: ${errors.length} item(s) failed instantiation`);
            this.lastStatus = Msg.create(679, 'JSON-LD Package Import', instantiatedGraph.length, graph.length);
            return this;
        }

    //    logger.debug(`APackage.setJSONLD: processing ${graph.length} items from package ${meta.id || 'unnamed'}`);
    //    logger.debug('APackage.setJSONLD: extracted context:', ctx);
    //    logger.debug('APackage.setJSONLD: extracted metadata:', meta);
    
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
            graph: instantiatedGraph,
            modified: meta.modified,
            creator: meta.creator
        } as IAPackage, checks);

        // logger.debug(`APackage.setJSONLD: package ${JSON.stringify(this, null, 2)} set with status`, this.lastStatus);
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
    setXML(xmlString: stringXML, checks?: ConstraintCheckType[]) {
        // 1. Parse XML string to JSON
        //    The context is skipped here, as it is extracted separately below.
        const parsed = xml2json(xmlString);
        // logger.debug('APackage.setXML: parsed XML to JSON', JSON.stringify(parsed,null,2));

        if (!parsed.ok) {
            this.lastStatus = parsed;
            logger.error(`APackage.setXML: XML parsing failed: ${parsed.statusText}`);
            return this;
        }

        const doc = parsed.response as JsonObject;
        // logger.debug('APackage.setXML: parsed XML to JSON', doc);

        // 2. Extract namespaces (if needed in future)
        const ctx = this.extractContextXML(xmlString);

        // 3. Extract package metadata
        //    ... can be obtained directly from parsed JSON.

        // 4. Extract and process graph items
        const graph: any[] = Array.isArray(doc.graph) ? doc.graph : [];

        if (graph.length === 0) {
            logger.warn('APackage.setXML: empty graph');
        }

        // 5. Instantiate each graph item from parsed JSON
        const instantiatedGraph: TPigItem[] = [];
        const errors: string[] = [];

        for (const item of graph) {
            const result = this.instantiateItemXML(item);

            if (result.ok && result.response) {
                instantiatedGraph.push(result.response as TPigItem);
            } else {
                const errorMsg = result.statusText || 'Unknown instantiation error';
                errors.push(errorMsg);
                logger.warn(`APackage.setXML: ${errorMsg}`);
            }
        }

        if (errors.length > 0) {
            logger.warn(`APackage.setXML: ${errors.length} item(s) failed instantiation`);
            this.lastStatus = Msg.create(679, 'XML Package Import', instantiatedGraph.length, graph.length);
            return this;
        }

        // logger.debug(`APackage.setXML: successfully instantiated ${instantiatedGraph.length} of ${graph.length} items`);

        // 6. Set default modified timestamp if not present
        if (!this.modified) {
            this.modified = new Date().toISOString();
        }

        // 7. Build and validate package
        this.set({
            itemType: PigItemType.aPackage,
            id: doc.id,
            title: doc.title,
            description: doc.description,
            context: ctx,
            graph: instantiatedGraph,
            modified: doc.modified,
            creator: doc.creator
        } as unknown as IAPackage, checks);

        // logger.debug(`APackage.setXML: package ${JSON.stringify(this,null,2)} set with status`, this.lastStatus);
        return this;
    }
    getHTML(options?: IOptionsHTML): stringHTML[] {
        if (!this.lastStatus.ok) {
            return [`<div class="pig-error">Invalid package; status: (${this.lastStatus.status}) ${passifyHTML(this.lastStatus.statusText || '')}</div>`];
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
                            <dt>ID</dt><dd>${passifyHTML(this.id)}</dd>
                            ${this.modified ? `<dt>Modified</dt><dd>${getLocalDate(this.modified, lang)}</dd>` : ''}
                            ${this.creator ? `<dt>Creator</dt><dd>${passifyHTML(this.creator)}</dd>` : ''}
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
     * Extract all items from an instantiated APackage with status validation
     * Returns an array with the package as first element (if valid), followed by all valid graph items
     * Invalid items (with lastStatus.ok === false) are filtered out and logged as warnings
     * 
     * @param pkg - Instantiated APackage with graph items
     * @returns Array with [APackage?, ...validGraphItems] - may be empty if package is invalid
     * 
     * @example
     * const pkg = new APackage().setJSONLD(jsonldDoc);
     * const allItems = LIB.allItems(pkg);
     * // allItems[0] === pkg (if valid)
     * // allItems[1..n] === all valid graph items
     */
    getAllItems(): TPigItem[] {

        if (!Array.isArray(this.graph)) {
            logger.warn('LIB.allItems: APackage has no valid graph array');
            return [];
        }

        const result: TPigItem[] = [];

        // Check package status
        const pkgStatus = this.status();
        if (!pkgStatus || !pkgStatus.ok) {
            logger.warn(
                `LIB.allItems: APackage '${this.id || 'unknown'}' has invalid status: ${pkgStatus?.statusText || 'unknown error'}`
            );
            return [];
        }
        else {
            // Package is valid, add it as first element
            result.push(this as TPigItem);
        }

        // Filter and validate graph items
        let validCount = 0;
        let invalidCount = 0;

        for (const item of this.graph) {
            if (!item || typeof item !== 'object') {
                logger.warn('LIB.allItems: encountered invalid graph item (not an object)');
                invalidCount++;
                continue;
            }

            // Check if item has status() method
            if (typeof (item as any).status !== 'function') {
                logger.warn(
                    `LIB.allItems: graph item '${(item as any).id || 'unknown'}' has no status() method`
                );
                invalidCount++;
                continue;
            }

            // Check item status
            const itemStatus = (item as any).status();
            if (!itemStatus || !itemStatus.ok) {
                logger.warn(
                    `LIB.allItems: graph item '${(item as any).id || 'unknown'}' (${(item as any).itemType || 'unknown type'}) has invalid status: ${itemStatus?.statusText || 'unknown error'}`
                );
                invalidCount++;
                continue;
            }

            // Item is valid, add it
            result.push(item);
            validCount++;
        }

        // Summary log
        if (invalidCount > 0) {
            logger.warn(
                `LIB.allItems: filtered out ${invalidCount} invalid item(s), kept ${validCount} valid item(s) from package '${this.id || 'unknown'}'`
            );
        }

        return result;
    }

    /**
     * Extract @context from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Context as INamespace[], string, Record<string, string>, or undefined
     */
    private extractContextJSONLD(doc: any): INamespace[] | string | Record<string, string> | undefined {
        const ctx = doc['@context'] || doc.context;
        // logger.debug('extractContextJSONLD (1): ',ctx);

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
    private extractContextXML(xmlString: stringXML): INamespace[] | string | Record<string, string> | undefined {
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
            logger.warn('extractContextXML: no namespaces found in XML');
            return undefined;
        }

        // logger.debug(`extractContextXML: extracted ${namespaces.length} namespace(s)`);
        return namespaces;
    }
    /**
     * Extract package metadata from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Metadata object with id, modified, creator, title, and description
     */
    private extractMetadataJSONLD(doc: any): {
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
     * @param item - JSON-LD object
     * @returns IRsp with instantiated TPigItem in response, or error status
     */
    private instantiateItemJSONLD(item: any): IRsp<unknown> {
        // Validate item has required pig:itemType
        if (!item['pig:itemType'] || !item['pig:itemType']['@id']) {
            const id = item['@id'] || item.id || 'unknown';
        //    logger.error(`APackage.instantiateItemJSONLD: @graph element missing pig:itemType, skipping ${id}`);
            return Msg.create(650, 'Instantiation from JSON-LD', 'pig:itemType', id);
        }

        const itype: any = item['pig:itemType']['@id'];

        // Filter allowed item types
        if (!this.isAllowedItemType(itype)) {
        //    logger.error(`APackage.instantiateItemJSONLD: skipping item type '${itype}' which is not allowed in a graph`);
            return Msg.create(651, 'Instantiation from JSON-LD', itype);
        }

        const instance = this.createInstance(itype);

        if (!instance) {
        //    logger.error(`APackage.instantiateItemJSONLD: unable to create instance for itemType '${itype}'`);
            return Msg.create(652, 'Instantiation from JSON-LD', itype);
        }

        try {
            (instance as any).setJSONLD(item);

            // Check if instantiation was successful
            const status = (instance as any).status();
            if (!status || !status.ok) {
            /*    logger.error(
                    `APackage.instantiateItemJSONLD: ${itype} '${item['@id'] || item.id || 'unknown'}' failed validation: ${status?.statusText || 'unknown error'}`
                ); */
                return status || Msg.create(653, 'Instantiation from JSON-LD', itype, item['@id'] || item.id || 'unknown');
            }

            // logger.debug(`APackage.instantiateItemJSONLD: successfully instantiated ${itype} with id ${item['@id']}`);
            return {
                ...rspOK,
                response: instance
            };
        } catch (err: any) {
            const errorMsg = `APackage.instantiateItemJSONLD: failed to populate instance with itemType '${itype}': ${err?.message ?? err}`;
        //    logger.error(errorMsg);
            return Msg.create(654, 'Instantiation from JSON-LD', itype, err?.message ?? String(err));
        }
    }
    /**
     * Instantiate a single PIG item from XML (already converted to JSON)
     * @param item - JSON object from xml2json conversion
     * @returns IRsp with instantiated TPigItem in response, or error status
     */
    private instantiateItemXML(item: any): IRsp<unknown> {
        // Validate item has required itemType
        if (!item.itemType) {
            const id = item.id || 'unknown';
            logger.error(`APackage.instantiateItemXML: element missing itemType, skipping ${id}`);
            return Msg.create(650, 'Instantiation from XML', 'itemType', id);
        }

        const itype: any = item.itemType;

        // Filter allowed item types
        if (!this.isAllowedItemType(itype)) {
        //    logger.error(`APackage.instantiateItemXML: skipping item type '${itype}' which is not allowed in a graph`);
            return Msg.create(651, 'Instantiation from XML', itype);
        }

        const instance = this.createInstance(itype);

        if (!instance) {
        //    logger.error(`APackage.instantiateItemXML: unable to create instance for itemType '${itype}'`);
            return Msg.create(652, 'Instantiation from XML', itype);
        }

        try {
            // When transforming individual items, use setXML which internally calls xml2json and then set();
            // but here we already have JSON from xml2json, so call set() directly:
            (instance as any).set(item);

            // Check if instantiation was successful
            const status = (instance as any).status();
            if (!status || !status.ok) {
            /*    logger.error(
                    `APackage.instantiateItemXML: ${itype} '${item.id || 'unknown'}' failed validation: ${status?.statusText || 'unknown error'}`
                ); */
                return status || Msg.create(653, 'Instantiation from XML', itype, item.id || 'unknown');
            }

            // logger.debug(`APackage.instantiateItemXML: successfully instantiated ${itype} with id ${item.id}`);
            return {
                ...rspOK,
                response: instance
            };
        } catch (err: any) {
            const errorMsg = `APackage.instantiateItemXML: failed to populate instance with itemType '${itype}': ${err?.message ?? err}`;
        //    logger.error(errorMsg);
            return Msg.create(654, 'Instantiation from XML', itype, err?.message ?? String(err));
        }
    }
    /**
     * Check if item type is allowed for instantiation.
     * The following types are not allowed in a graph:
        PigItemType.aPackage,      // Packages cannot be nested
        PigItemType.aProperty,     // Embedded in anEntity/aRelationship
        PigItemType.aSourceLink,   // Embedded in aRelationship
        PigItemType.aTargetLink    // Embedded in anEntity/aRelationship

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
    // the tags have already been renamed with MVF.renameJsonTags( ..., MVF.fromJSONLD):
    const skipKeys = new Set(MVF.toJSONLD.keys());

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
// const xmlParser = new DOMParser();
/**
 * Parse XML string and convert to JSON object
 * Recursively traverses the XML structure without assuming specific tag names
 * Hybrid approach: tries parsing without wrapper first, falls back to wrapper if needed
 * @param xml - XML string to parse
 * @returns IRsp with JsonObject on success, error message on failure
 */
function xml2json(xml: stringXML): IRsp<unknown> {
    try {
        const parser = new DOMParser();

        // Try 1: Parse without wrapper
        const doc = parser.parseFromString(xml, 'text/xml');
        const parserError = doc.querySelector('parsererror');

        if (!parserError && doc.documentElement) {
            // Success without wrapper
            const result = xmlElementToJson(doc.documentElement);
            // logger.debug('xml2json: successfully parsed XML without wrapper');

            return {
                ...rspOK,
                response: result as JsonObject,
                responseType: 'json'
            };
        }

        // Try 2: Parse with wrapper (for namespace issues)
        // logger.debug('xml2json: first attempt failed, trying with wrapper');
        const wrapped = LIB.makeXMLDoc(xml);
        const wrappedDoc = parser.parseFromString(wrapped, 'text/xml');

        const wrappedError = wrappedDoc.querySelector('parsererror');
        if (wrappedError) {
            const errorMessage = wrappedError.textContent || 'Unknown XML parsing error';
            logger.error('xml2json: XML parsing failed even with wrapper:', errorMessage);
            return Msg.create(690, 'XML', errorMessage);
        }

        const rootElement = wrappedDoc.documentElement;
        if (!rootElement || !rootElement.firstElementChild) {
            return Msg.create(690, 'XML', 'No valid element found in wrapped XML');
        }

        // Extract the actual content (skip the wrapper)
        const actualElement = rootElement.firstElementChild as ElementXML;
        const result = xmlElementToJson(actualElement);

        // logger.debug('xml2json: successfully parsed XML with wrapper',result);

        return {
            ...rspOK,
            response: result as JsonObject,
            responseType: 'json'
        };

    } catch (err: any) {
        logger.error('xml2json: exception:', err);
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
    const tagName = xmlElement.tagName;
    let currentItemType: string | undefined;
    if (Object.values(PigItemType).includes(tagName as PigItemTypeValue)) {
        result.itemType = tagName;
        currentItemType = tagName;
    }

    // 2. Extract all attributes as properties
    for (const attr of Array.from(xmlElement.attributes)) {
        const attrName = attr.name;
        const attrValue = attr.value;

        if (attrName.startsWith('xmlns')) {
            continue; // skip namespace declarations
        } else if (attrName === 'id') {
            result.id = attrValue;
        } else if (attrName === 'rdf:type' || attrName === 'type') {
            result.hasClass = attrValue;
        } else {
            result[attrName] = attrValue;
        }
    }

    // 3. Process child elements
    const childElementsByTag = new Map<string, ElementXML[]>();
    const textContent: string[] = [];

    // Collections for configurable properties and links
    const configurableProperties: JsonObject[] = [];
    const configurableSourceLinks: JsonObject[] = [];
    const configurableTargetLinks: JsonObject[] = [];

    for (const child of Array.from(xmlElement.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
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
            if (!childElementsByTag.has(childTagName)) {
                childElementsByTag.set(childTagName, []);
            }
            childElementsByTag.get(childTagName)!.push(childElement);

        } else if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent?.trim();
            if (text) {
                textContent.push(text);
            }
        }
    }

    // 4. Convert grouped child elements to JSON
    for (const [tagName, elements] of childElementsByTag) {

        // ✅ Special handling for 'graph' - always array of heterogeneous items
        if (tagName === 'graph' || tagName === 'pig:graph') {
            result.graph = elements.flatMap(graphContainer => {
                // Get all direct children of <graph> container
                return Array.from(graphContainer.children)
                    .map(childElement => xmlElementToJson(childElement as ElementXML));
            });
            continue;
        }

        // Special handling for xs:simpleType
        if (tagName === 'xs:simpleType' || tagName === 'simpleType') {
            xSimpleType(elements[0], result);
            continue;
        }

        // Map XML tag to internal property name
        const propertyName = MVF.mapTerm(tagName, MVF.fromXML) as string;

        // Check if this property is a multi-language text field
        const isMultiLang = isMultiLanguageText(propertyName);

        // Check if this property needs IText wrapping (icon)
        const needsTextWrapper = requiresIText(propertyName);

        // Pass parent itemType for context-aware array detection
        const mustBeArray = requiresArray(propertyName, currentItemType);

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
            // IText wrapper for icon
            else if (needsTextWrapper) {
                result[propertyName] = { value: childText };
            }
            // Regular fields
            else {
                const hasChildElements = Array.from(elem.childNodes).some(
                    node => node.nodeType === Node.ELEMENT_NODE
                );

                if (!hasChildElements && childText) {
                    result[propertyName] = childText;
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
                        node => node.nodeType === Node.ELEMENT_NODE
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
function requiresArray(propertyName: string, parentItemType?: string): boolean {
    // Remove namespace prefix for checking
    const localName = propertyName.includes(':') ? propertyName.split(':')[1] : propertyName;

    // Properties that ALWAYS require arrays
    const alwaysArrayProps = new Set([
        'eligibleValue',        // Property.eligibleValue: IEligibleValue[]
        'eligibleEndpoint',     // Link.eligibleEndpoint: TPigId[]
        'eligibleProperty',     // Entity/Relationship.eligibleProperty?: TPigId[]
        'composedProperty',     // Property.composedProperty?: TPigId[]
        'priorRevision'         // AnElement.priorRevision?: TRevision[]
    ]);

    if (alwaysArrayProps.has(localName) || alwaysArrayProps.has(propertyName)) {
        return true;
    }

    // Context-dependent: eligibleTargetLink
    if (localName === 'eligibleTargetLink' || propertyName === 'eligibleTargetLink') {
        // Entity: eligibleTargetLink?: TPigId[] (array)
        // Relationship: eligibleTargetLink?: TPigId (string)
        return parentItemType === PigItemType.Entity || parentItemType === 'pig:Entity';
    }

    // Context-dependent: eligibleSourceLink
    if (localName === 'eligibleSourceLink' || propertyName === 'eligibleSourceLink') {
        // Relationship: eligibleSourceLink?: TPigId (string)
        return false; // Never an array
    }

    return false;
}
/**
 * ✅ NEW: Process pig:aProperty element
 * Extracts:
 * - rdf:type → hasClass
 * - <value> → value
 * - itemType → pig:aProperty
 */
function processConfigurableProperty(elem: ElementXML): JsonObject {
    const prop: JsonObject = {
        itemType: PigItemType.aProperty
    };

    // Extract rdf:type as hasClass
    const rdfType = elem.getAttribute('rdf:type') || elem.getAttribute('type');
    if (rdfType) {
        prop.hasClass = rdfType;
    }

    // Extract child elements
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const childElement = child as ElementXML;
            const childTagName = childElement.tagName;

            if (childTagName === 'value') {
                prop.value = getXmlElementText(childElement);
            } else if (childTagName === 'idRef') {
                prop.idRef = childElement.textContent?.trim() as JsonValue;
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
 * ✅ NEW: Process pig:aSourceLink or pig:aTargetLink element
 * Extracts:
 * - rdf:type → hasClass
 * - <idRef> → idRef
 * - itemType → pig:aSourceLink or pig:aTargetLink
 */
function processConfigurableLink(elem: ElementXML, itemType: PigItemTypeValue): JsonObject {
    const link: JsonObject = {
        itemType: itemType
    };

    // Extract rdf:type as hasClass
    const rdfType = elem.getAttribute('rdf:type') || elem.getAttribute('type');
    if (rdfType) {
        link.hasClass = rdfType;
    }

    // Extract child elements
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
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
 * ✅ NEW: Check if a property name needs IText wrapper ({ value: "..." })
 * Currently only 'icon' according to IElement interface
 */
function requiresIText(propertyName: string): boolean {
    const localName = propertyName.includes(':') ? propertyName.split(':')[1] : propertyName;

    // Fields that need IText wrapper: { value: string }
    const textWrapperFields = new Set([
        'icon'  // pig:icon in Entity/Relationship classes
    ]);

    return textWrapperFields.has(localName) || textWrapperFields.has(propertyName);
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
    // Find xs:restriction element
    const restriction = Array.from(simpleTypeElement.children).find(
        child => child.tagName === 'xs:restriction' || child.tagName === 'restriction'
    ) as ElementXML | undefined;

    if (!restriction) return;

    // Extract base attribute as datatype
    const baseAttr = restriction.getAttribute('base');
    if (baseAttr) {
        result.datatype = baseAttr;
    }

    // Process restriction children
    for (const child of Array.from(restriction.children)) {
        const tagName = child.tagName;
        const localName = tagName.includes(':') ? tagName.split(':')[1] : tagName;

        // Extract value attribute or text content
        const value = child.getAttribute('value') || child.textContent?.trim();
        if (!value) continue;

        // Map XSD constraints to PIG properties
        switch (localName) {
            case 'maxLength':
                result.maxLength = parseInt(value, 10);
                break;
            case 'minLength':
                result.minLength = parseInt(value, 10);
                break;
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
            case 'minExclusive':
                result.minExclusive = parseFloat(value);
                break;
            case 'maxExclusive':
                result.maxExclusive = parseFloat(value);
                break;
            default:
                // Unknown constraint - log warning
                logger.warn(`processSimpleType: unknown constraint '${localName}' with value '${value}'`);
        }
    }
}

/**
 * Get the text content of an XML DOM element, handling both simple text and HTML content
 * @param xmlElement - XML DOM Element
 * @returns Text content, preserving HTML if present
 */
function getXmlElementText(xmlElement: ElementXML): string {
    // Check if element contains HTML elements (p, div, span, etc.)
    const hasHtmlContent = Array.from(xmlElement.childNodes).some(node =>
        node.nodeType === Node.ELEMENT_NODE &&
        ['p', 'div', 'span', 'small', 'i', 'a', 'object'].includes((node as ElementXML).tagName.toLowerCase())
    );

    if (hasHtmlContent) {
        // Return innerHTML to preserve HTML structure
        return xmlElement.innerHTML.trim();
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
    const localName = propertyName.includes(':') ? propertyName.split(':')[1] : propertyName;

    // All multi-language fields from PIG schemas that use LanguageText[]
    const multiLangFields = new Set([
        // Common fields across all PIG classes and instances
        'title',           // dcterms:title - used in Property, Link, Entity, Relationship, AnEntity, ARelationship
        'description'      // dcterms:description - used in Property, Link, Entity, Relationship, AnEntity, ARelationship

        // Note: eligibleValue.title is handled separately in xmlElementToJson()
        // because it's nested within eligibleValue objects
    ]);

    return multiLangFields.has(localName) || multiLangFields.has(propertyName);
}

// Helper function to get localized text from multi-language array
function getLocalText(texts?: ILanguageText[], lang?: TISODateString): string {
    if (!texts || texts.length === 0) return '';

    lang = lang ?? 'en-US';

    // Try to find exact language match
    const exact = texts.find(t => t.lang === lang);
    if (exact) return passifyHTML(exact.value);

    // Try to find language prefix match (e.g., 'en' for 'en-US')
    const langPrefix = lang.split('-')[0];
    const prefixMatch = texts.find(t => t.lang?.startsWith(langPrefix));
    if (prefixMatch) return passifyHTML(prefixMatch.value);

    // Fallback to first available text
    return passifyHTML(texts[0].value);
}

// Format date using the specified locale
function getLocalDate(dateStr: string, lang?: TISODateString): string {
    try {
        return new Date(dateStr).toLocaleString(lang ?? 'en-US');
    } catch {
        return dateStr;
    }
}
/**
 * Sanitize HTML by removing dangerous elements and attributes that could execute code
 * Preserves safe XHTML formatting (p, div, span, strong, em, etc.)
 * Removes: <script>, <style>, <embed>, <iframe>, <object>, <link>, <meta>, <form>
 * Removes: All event handler attributes (onclick, onerror, onload, etc.)
 * Removes: javascript: and data: protocols in href and src attributes
 * 
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering, preserving XHTML structure
 * 
 * @example
 * const unsafe = '<p onclick="alert(1)">Text</p><script>alert(2)</script>';
 * const safe = passifyHTML(unsafe);
 * // Returns: '<p>Text</p>'
 */
function passifyHTML(html: string): string {
    if (!html || typeof html !== 'string') return '';

    let passified = html;

    // 1. Remove dangerous tags including their content
    const dangerousTags = [
        'script',
        'style',
        'embed',
        'iframe',
    //    'object',  
        'link',
        'meta',
        'base',
        'form'
    ];

    dangerousTags.forEach(tag => {
        // Remove tags with any attributes (case-insensitive, multiline, greedy)
        const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>`, 'gis');
        passified = passified.replace(regex, '');
        // Remove self-closing tags
        const selfClosing = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
        passified = passified.replace(selfClosing, '');
    });

    // 2. Remove event handler attributes (onXYZ="...")
    // Matches on followed by word characters, capturing until the closing quote
    passified = passified.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

    // 3. Remove dangerous protocols from href and src attributes
    // Replace javascript: and data: with # (safer than removing the attribute)
    passified = passified.replace(/\s+(href|src)\s*=\s*["']\s*(javascript|data):[^"']*["']/gi, ' $1="#"');

    // 4. Remove dangerous attributes
    const dangerousAttrs = [
        'formaction',
        'action',
        'dynsrc',
        'lowsrc'
    ];

    dangerousAttrs.forEach(attr => {
        const regex = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
        passified = passified.replace(regex, '');
    });

    return passified;
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
