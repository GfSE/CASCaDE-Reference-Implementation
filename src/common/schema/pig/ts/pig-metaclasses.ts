/*!
 * CASCaRA Graph (cas:) Metaclasses - the basic object structure
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaRA Graph (cas:) Metaclasses - the basic object structure
 * -------------------------------------------------------------
 * Authors: oskar.dungern@gfse.org
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * Notice:
 * - Initially the metamodel had been called "Product Information Graph" (PIG) with namespace prefix 'pig:'.
 * - Now it is called CASCaRA with namespace prefix 'cas:'.
 * - The codebase still uses the abbreviation PIG or pig in many places for historical reasons,
 * - but the namespace prefix for the metamodel and for the semantic infrastructure has been set to 'cas:', see definitions.ts. 
 * 
 * Design Decisions:
 * - The CASCaRA (PIG) classes in this module contain *only* the elements in the metamodel; it could be generated from the metamodel.
 * - Abstract classes are not exported to other modules, only the concrete classes.
 * - All names are always in singular form, even if they have multiple values.
 * - The itemType is explicitly stored with each item to support searching (in the cache or database) ... and for runtime checking.
 * - The 'aProperty' instances are instantiated as part their parent objects 'anEntity', 'aRelationship' or 'aPackage'.
 * - Similarly, the 'aLink' instances are instantiated as part their parent objects 'anEntity', 'aRelationship' or 'aPackage'.
 * - Both 'aProperty' and 'aLink' have no identifier and no revision history of their own.
 * - Other objects are referenced by URIs (TPigId) to avoid inadvertant duplication of objects ... at the cost of repeated cache access.
 *   This means the code must resolve any reference by reading the referenced object explicitly from cache, when needed.
 * - aRelationship.hasTargetLink is an array with maxCount=1 to have the same structure as anEntity.hasTargetLink.
 * - same for hasSourceLink
 * - To avoid access to the cache in the validation methods, the validation of references to classes shall be done in an overall consistency check;
 * - Links to other items are stored as simple strings (the URIs) to avoid deep object graphs;
 *   those references are expanded to id objects only when serializing to JSON-LD.
 * - The 'set' methods are chainable to allow concise code when creating new instances.
 * - The 'get' methods return plain JSON objects matching the interfaces, suitable for serialization and persistence.
 * - The 'setJSONLD' methods handles conversion from JSON-LD representation.
 * - There are no 'getJSONLD' methods for the core classes. Instead, the data is transformed to JSON-LD in a separate module
 *   providing a getJSONLD() function for all itemTypes. The reason is to avoid that this module is getting huge.
 * - Similar for getHTML() and others.
 * - Programming errors result in exceptions, data errors in IMsg return values.
 * - The namespace prefixes are defined in definitions.ts and used consistently in the code; it was initially 'pig:'
 *   and is now pfxNsMeta: 'cas:' for the metamodel and pfxNsSemi: 'cas:' for the semantic infrastructure.
 * - CASCaRA (PIG) classes (as derived from the ontology) get revision information it their URL path.
 * - All others must at least specify the 'modified' attribute to capture the revision history of the item;
 *   it is recommended to maintain revision and priorRevision as well for better configuration management and traceability.
 *
 * @ToDo:
 * ✅ Must a Link specify minCount and maxCount for hasEndpoint of its instances? How to handle cardinality of links in the overall consistency check?
 * ✅ This does also concern enumerations, which have minCount and maxCount at present --> (perhaps) move it to the link class!
 * - allow packages to be nested
 * - implement 'composes' (formerly composedProperty) for Property and aProperty
 * - implement the inheritance of enumeratedProperty, enumeratedSourceLink, enumeratedTargetLink and enumeratedEndpoint
 * - implement abstract class 'Configurable' for Property and Link to avoid code duplication
 * ✅ implement 'revisionAware' for Link.
 * - include revision as part of a pointer in aSourceLink and aTargetLink, if the link class specifies revisionAware=true, both schema and code.
 * - Assign defaultValue, when a aProperty is instantiated as part of anEntity or aRelationship.
 * - Prohibit aProperty or aLink to be updated or deleted, if readOnly=true in its class.
 * - Consequently aSourceLink and aTargetLink must specify the endpoints by identifier and revision, if their class specifies revisionAware=true.
 * - Check use of PigItem.normalizeId() in the setJSONLD() thread
 *   PigItem.normalizeId() shortly before validate() in set() ?
 * ✅ Check the result of PigItem.normalizeId in the setXML() thread in case of enumerated values
 * ✅ Reconsider aSourceLink and aTargetLink use: empty list means none allowed and no list means all allowed? --> YES.
 * ✅ Add dummy namespaces for 'o:' and 'd:' in case they have been added to a package with local names using normalizeId()
 * ✅ implement the import of configurable properties and links for aPackage.
 * - Consider the storage of numeric and boolean values: should be string?
 * ✅ Consider the storage of namespaces: now object with properties tag and uri: should be objects with {tag: uri}? --> keep as is
 * - Consider: In the schemata, additionalProperties=false is widely used. This prevents upward compatibility.
 *   This code could just *ignore* additional properties.
 * - Consider the schema of cas.xml: In RDF and JSON-LD the class names of aLink and aProperty are used as predicate.
 * - Consolidate XsDataType and PigItem.isSupportedDataType() to avoid duplication and inconsistencies.
 * - Include valid datatypes in the schemata for Property and Link.
 * - Consolidate redundant transformations from JSON-LD to internal format for individual items and a whole package.
 * - set lastStatus also on JSON-LD import
 */

import { IRsp, rspOK, Msg, Rsp } from "../../../lib/messages";
import { DEF, RE } from "../../../lib/definitions";
import { LIB, LOG, INamespace, ILanguageText, IText } from "../../../lib/helpers";
import { MVF } from "../../../lib/mvf";
import { PLI, NodeType } from "../../../lib/platform-independence";
import { JsonPrimitive, JsonValue, JsonObject, tagIETF, TISODateString } from "../../../lib/helpers";
import { SCH } from '../json/pig-schemata';
import { checkConstraintsForPackage } from './pig-package-constraints';

export type TPigId = string;  // an URI, typically a UUID with namespace (e.g. 'ns:123e4567-e89b-12d3-a456-426614174000') or a URL
export type TRevision = string;  // @ToDo: should be better described using a pattern (RegExp)
export type TPigClass = Enumeration | Property | Link | Entity | Relationship;
export type TPigElement = Entity | Relationship;
export type TPigAnElement = APackage | AnEntity | ARelationship;
export type TPigItem = TPigClass | TPigAnElement;
export type stringXML = string;  // contains XML code
export type ElementXML = globalThis.Element;  // DOM Element type

export const PigItemType = {
    // PIG classes:
    Package: `${DEF.pfxNsMeta}Package`,
//    Ontology: `${DEF.pfxNsMeta}Ontology`,
    Enumeration: `${DEF.pfxNsMeta}Enumeration`,
    Property: `${DEF.pfxNsMeta}Property`,
    Link: `${DEF.pfxNsMeta}Link`, 
    Entity: `${DEF.pfxNsMeta}Entity`,
    Relationship: `${DEF.pfxNsMeta}Relationship`,
    // PIG instances/individuals:
    aPackage: `${DEF.pfxNsMeta}aPackage`,
    anOntology: `${DEF.pfxNsMeta}anOntology`,
    aProperty: `${DEF.pfxNsMeta}aProperty`,
    aSourceLink: `${DEF.pfxNsMeta}aSourceLink`,
    aTargetLink: `${DEF.pfxNsMeta}aTargetLink`,
    anEntity: `${DEF.pfxNsMeta}anEntity`,
    aRelationship: `${DEF.pfxNsMeta}aRelationship`
} as const;
export type PigItemTypeValue = typeof PigItemType[keyof typeof PigItemType];
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

// Must coincide with TPigClass
const PIG_CLASSES = new Set<PigItemTypeValue>([
    PigItemType.Enumeration,
    PigItemType.Property,
    PigItemType.Link,
    PigItemType.Entity,
    PigItemType.Relationship
]);

// PigItemType.aProperty, PigItemType.aSourceLink and PigItemType.aTargetLink
// are embedded in aPackage, anEntity and aRelationship and cannot be instantiated standalone.
const PIG_INSTANCE_ARRAY = [
    PigItemType.aPackage,
    PigItemType.anEntity,
    PigItemType.aRelationship
] as const;

export type TPigInstance = typeof PIG_INSTANCE_ARRAY[number];

// Set für fast checks at runtime, e.g. in PigItemFactory.isInstance():
const PIG_INSTANCES = new Set<PigItemTypeValue>(PIG_INSTANCE_ARRAY);

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
            case PigItemType.Enumeration:
                return new Enumeration();
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
            case PigItemType.aPackage:
                return new APackage();

            default:
                LOG.error(`PigItemFactory.create: unknown itemType '${itemType}'`);
                return null;
        }
    }
    static isValidItemType = (item: string): boolean => Object.values(PigItemType).includes(item as PigItemTypeValue);
    /**
     * Check if a string is a valid ID
     * @param input - String to check
     * @returns true if valid ID
     */
    static isValidIdString(input: string|undefined|null): boolean {
        return typeof (input) == 'string' && (RE.termWithNamespace.test(input) || RE.uri.test(input));
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
        PigItemType.aProperty,     // embedded in aPackage/anEntity/aRelationship
        PigItemType.aSourceLink,   // embedded in aRelationship
        PigItemType.aTargetLink    // embedded in aPackage/anEntity/aRelationship
     */
    static isInstantiable(itype: PigItemTypeValue): boolean {
        return ([
            PigItemType.Enumeration,
            PigItemType.Property,
            PigItemType.Link,
            PigItemType.Entity,
            PigItemType.Relationship,
            PigItemType.anEntity,
            PigItemType.aRelationship,
            PigItemType.aPackage
        ] as unknown as PigItemTypeValue).includes(itype);
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

    /**
     * Check if a datatype is a string type
     * @param datatype - XSD datatype as string
     * @returns true if string type
     */
    static isSupportedStringDatatype(datatype: string): boolean {
        return [
            'xs:string', 'xsd:string'
        ].includes(datatype);
    }

    /**
     * Check if a datatype is numeric
     * @param datatype - XSD datatype as string
     * @returns true if numeric type
     */
    static isSupportedNumericDatatype(datatype: string): boolean {
        return [
            'xs:integer', 'xsd:integer',
            'xs:int', 'xsd:int',
            'xs:long', 'xsd:long',
            'xs:short', 'xsd:short',
            'xs:byte', 'xsd:byte',
            'xs:decimal', 'xsd:decimal',
            'xs:float', 'xsd:float',
            'xs:double', 'xsd:double',
            'xs:positiveInteger', 'xsd:positiveInteger',
            'xs:negativeInteger', 'xsd:negativeInteger',
            'xs:nonNegativeInteger', 'xsd:nonNegativeInteger',
            'xs:nonPositiveInteger', 'xsd:nonPositiveInteger',
            'xs:unsignedLong', 'xsd:unsignedLong',
            'xs:unsignedInt', 'xsd:unsignedInt',
            'xs:unsignedShort', 'xsd:unsignedShort',
            'xs:unsignedByte', 'xsd:unsignedByte'
        ].includes(datatype);
    }

    /**
     *  Type guard: checks whether a value is one of the XsDataType values
     */
    static isSupportedDatatype(value: unknown): boolean {
        if (typeof value !== 'string') return false;
        const norm = value.replace(/^xsd:/, 'xs:');
        return PigItem.isSupportedStringDatatype(norm)
            || PigItem.isSupportedNumericDatatype(norm)
            || (Object.values(XsDataType) as string[]).includes(norm);
    }

    /**
     * Check if a property name represents a multi-language text field
     * These fields must always be arrays of ILanguageText objects according to pig-schemata.ts
     * 
     * Multi-language fields found in schemata:
     * - Property: title, description, enumeratedValue.title
     * - Link: title, description
     * - Entity: title, description
     * - Relationship: title, description
     * - AnEntity: title, description
     * - ARelationship: title, description
     *
     * @ToDo: multiLanguageText also occurs in instances aProperty of configurable Property with datatype = 'string'
     * @ToDo:consolidate with validate MultiLanguageText() to avoid duplication of logic
     */
    static isMultiLanguageText(value: unknown): boolean {

        // Structure-based: Array of ILanguageText
        // If length > 1, lang is mandatory for all items; if length = 1, lang is optional
        if (Array.isArray(value) && value.length > 0) {
            const requireLang = value.length > 1;

            return value.every(
                v =>
                    typeof v === 'object' &&
                    v !== null &&
                    typeof (v as any).value === 'string' &&
                    (
                        requireLang
                            ? typeof (v as any).lang === 'string'  // lang required when length > 1
                            : ((v as any).lang === undefined || typeof (v as any).lang === 'string')  // lang optional when length = 1
                    )
            );
        }

        return false;
    }
    /**
     * Check if a property requires multi-language text format (ILanguageText[])
     * @param propertyName - Property name to check (with or without namespace prefix)
     * @returns true if the property is title, description, or definition
     */
    static needsMultiLanguageText(propertyName: string): boolean {

        // Name-based: title or description
        // Remove namespace prefix for checking
        const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

        // All multi-language fields from PIG schemata that use LanguageText[]
        return [
            'title',
            'description',
            'definition'
        ].includes(localName);
    }
    /**
     * Check if a property needs IText wrapper ({ value: "..." })
     * Currently only 'icon' according to IElement interface
     */
    static needsIText(propertyName: string): boolean {
        const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

        // Fields that need IText wrapper: { value: string }
        const textWrapperFields = new Set([
            'icon'
        ]);

        return textWrapperFields.has(localName);
    }
    /**
     * Check if a property must always be represented as an array
     * Even when only a single element is present in XML
     * 
     * Context detection is done via the parent element's itemType
     */
    static needsArray(propertyName: string /*, parentItemType?: PigItemTypeValue */): boolean {
        // Remove namespace prefix for checking
        const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

        // Properties that ALWAYS require arrays
        return [
            'enumeratedValue',        // Property.enumeratedValue: IEnumeratedValue[]
            'enumeratedEndpoint',     // Link.enumeratedEndpoint: TPigId[]
            'enumeratedProperty',     // Entity/Relationship.enumeratedProperty?: TPigId[]
            'enumeratedSourceLink',   // Relationship.enumeratedSourceLink?: TPigId[]'
            'enumeratedTargetLink',   // Entity/Relationship.enumeratedTargetLink?: TPigId[]
            'composedProperty',     // Property.composedProperty?: TPigId[]
            'priorRevision'         // AnElement.priorRevision?: TRevision[]
        ].includes(localName);
    }
    /**
     * Check if a property contains IDs that should be normalized
     * These properties reference other PIG items and need namespace prefixes
     */
    static needsIdNormalization(propertyName: string): boolean {
        // Remove namespace prefix for checking
        const localName = RE.termWithNamespace.test(propertyName) ? propertyName.split(':')[1] : propertyName;

        // Properties that contain TPigId references to other items
        return [
            'enumeratedEndpoint',     // Link.enumeratedEndpoint: TPigId[]
            'enumeratedProperty',     // Entity/Relationship.enumeratedProperty?: TPigId[]
            'enumeratedSourceLink',   // Relationship.enumeratedSourceLink?: TPigId[]
            'enumeratedTargetLink',   // Entity/Relationship.enumeratedTargetLink?: TPigId[]
            'composedProperty',       // Property.composedProperty?: TPigId[]
            'specializes',            // Class.specializes?: TPigId
            'hasClass'                // Instance hasClass references a class
        ].includes(localName);
    }

    // Normalize language tags/values ---
    static normalizeLanguageText(src: any, options?: { stripHTML?: boolean; stripCtrlFromHTML?: boolean }): ILanguageText {
        //    LOG.debug('normalizeLanguageText', src);
        if (!src)
            return { value: '' };

        let value: string;
        let lang: tagIETF | undefined;

        if (typeof src === 'object') {
            // Extract value from ILanguageText object
            value = (src.value ?? '') as string;
            lang = src.lang as tagIETF | undefined;
        } else if (typeof src === 'string') {
            // Use string directly as value
            value = src;
        } else {
            // Convert other types to string
            value = String(src);
        }

        // Strip control characters from HTML-formatted content if requested
        // This must happen BEFORE stripHTML
        if (options?.stripCtrlFromHTML && value) {
            // Check if value contains HTML: either paired tags <tag>...</tag> or self-closing tags <tag />
            if (RE.hasHTML.test(value)) {
                // Process control characters based on context:
                // - REMOVE if at beginning/end or between tags (e.g., \n<div>, </p>\n<div>, </p>\n)
                // - REPLACE with space if within text or between text and tag

                // Step 1: Remove control chars at the beginning before first tag
                // eslint-disable-next-line no-control-regex
                value = value.replace(/^[\x00-\x20\x7F]+(?=<)/, '');

                // Step 2: Remove control chars at the end after last tag
                // eslint-disable-next-line no-control-regex
                value = value.replace(/(?<=>)[\x00-\x20\x7F]+$/, '');

                // Step 3: Remove control chars between tags (only whitespace between tags)
                // Pattern: > followed by only whitespace/control chars followed by <
                // eslint-disable-next-line no-control-regex
                value = value.replace(/>[\x00-\x20\x7F]+</g, '><');

                // Step 4: Replace remaining control chars with space
                // These are within text content or between text and tags
                // eslint-disable-next-line no-control-regex
                value = value.replace(/[\x00-\x1F\x7F]/g, ' ');

                // Step 5: Normalize multiple consecutive spaces to single space
                value = value.replace(/ {2,}/g, ' ');
            }
        }

        // Strip HTML from the value if requested (applies to both strings and ILanguageText.value)
        if (options?.stripHTML && value) {
            value = LIB.stripHTML(value);
        }

        return {
            value: value,
            lang: lang
        };
    }
    static normalizeMultiLanguageText(src: any, options?: { stripHTML?: boolean; stripCtrlFromHTML?: boolean }): ILanguageText[] | undefined {
        if (!src) return undefined;
        if (Array.isArray(src)) return src.map(item => PigItem.normalizeLanguageText(item, options));
        return [PigItem.normalizeLanguageText(src, options)];
    }
    /* Validate that a value is an array of ILanguageText with the rule:
       - if array length < 1 -> OK
       - if array length === 1 -> 'lang' may be missing
       - if array length > 1 -> each entry must have a string 'lang' and string 'value'
       Returns IRsp (rspOK on success, error IRsp on failure)
    */
    static validateMultiLanguageText(arr: any, fieldName: string): IRsp {
        //    LOG.debug('PigItem.validateMultiLanguageText',arr,fieldName);
        if (!Array.isArray(arr)) {
            return Msg.create(640, fieldName);
        }
        if (arr.length < 1) return rspOK;
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
     * Normalize ID by adding namespace prefix if missing
     * 
     * @param id - Raw ID from import (may lack namespace)
     * @param itemType - PIG item type to determine correct prefix
     *                 - is undefined in case of references, which are always classes
     * @returns Normalized ID with namespace prefix
     */
    static normalizeId(id: string, itemType?: PigItemTypeValue): string {
        if (!id || typeof(id) !== 'string') {
            return id;
        }

        // Already has namespace or is URI?
        if (PigItem.isValidIdString(id)) {
            return id;
        }

        // Determine prefix using optimized type guards
        // @ToDo: Check whether the namespaces for enumerated value types are correctly normalized with 'o:'
        // and also their references in properties
        let prefix: string;
        if (!itemType || PigItem.isClass(itemType)) {
            prefix = DEF.defaultOntologyNamespace; // add a default namespace prefix for classes if missing
            PigItem.usedDefaultNamespaces.add(prefix);
        //  else if (PigItem.isInstance(itemType)) {
        } else {
            // includes all references within instances where itemType is undefined
            prefix = DEF.defaultDataNamespace; // add a default namespace prefix for instances if missing
            PigItem.usedDefaultNamespaces.add(prefix);
        }

        const normalized = `${prefix}${id}`;
        // LOG.info(`ID normalized: '${id}' → '${normalized}' (${itemType})`);

        return normalized;
    }

    /**
     * Track which default namespaces ('o:', 'd:') have been assigned by normalizeId()
     * This allows APackage to add only the namespaces that are actually being used.
     */
    static usedDefaultNamespaces: Set<string> = new Set<string>();

    /**
     * Clear the set of used default namespaces.
     * Should be called before processing a new package.
     */
    static clearUsedDefaultNamespaces(): void {
        PigItem.usedDefaultNamespaces.clear();
    }
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
    hasClass: TPigId;  // required for ALL itemTypes according to JSON schema
}
// Constructor parameter type: hasClass is not used in constructor, set later via .set()
type TConstructItem = Pick<IItem, 'itemType'>;

abstract class Item implements IItem {
    readonly itemType!: PigItemTypeValue;
    hasClass!: TPigId;  // required for ALL itemTypes according to JSON schema
    protected lastStatus!: IRsp;
    protected constructor(itm: TConstructItem) {
        this.itemType = itm.itemType;
    }
    status(): IRsp {
        return this.lastStatus as IRsp;
    }
    protected validate(itm: IItem) {
        if (itm.itemType !== this.itemType)
            return Msg.create(613, this.itemType, itm.itemType);
        return rspOK;
    }
    protected set(itm: IItem): this {
        this.hasClass = itm.hasClass;
        return this;
    }
    protected get() {
        return {
        //    lastStatus: this.lastStatus,
            itemType: this.itemType,
            hasClass: this.hasClass
        } as IItem;
    }
}
export interface IIdentifiable extends IItem {
    id: TPigId;  // translates to @id in JSON-LD
    specializes?: TPigId;  // must be URI of a cas:item with equal itemType, no cyclic references, translates to rdfs:subClassOf
    // Any one or both of the following must be present and have at least one item; see schemata:
    title?: ILanguageText[];
    description?: ILanguageText[];
    definition?: ILanguageText[]; // mandatory for classes, not allowed for instances as controlled be the schemata
    revision?: TRevision;
    priorRevision?: TRevision[];
    modified?: TISODateString;  // mandatory for instances, see schemata
    creator?: string;
}
abstract class Identifiable extends Item implements IIdentifiable {
    id!: TPigId;
    specializes?: TPigId;
    title?: ILanguageText[];
    description?: ILanguageText[];
    definition?: ILanguageText[];
    revision?: TRevision;
    priorRevision?: TRevision[];
    modified?: TISODateString;
    creator?: string;
    protected constructor(itm: TConstructItem) {
        super(itm); // actual itemType set in concrete class
    }
    protected validate(itm: IIdentifiable) {
        if (this.id && itm.id !== this.id)
            return Msg.create(614, this.id, itm.id);

        this.id = itm.id; // to complement status messages

        if (this.specializes && this.specializes !== itm.specializes)
            return Msg.create(615, this.specializes, itm.specializes ?? '');

        // Runtime guards:
        // This is more constraining than the schema,
        // as the presence of 'lang' is required when there are multiple values
        // Normalize and validate title (optional for anEntity), strip HTML from title:
        if (itm.title) {
            itm.title = PigItem.normalizeMultiLanguageText(itm.title, { stripCtrlFromHTML: true, stripHTML: true });
            const tRes = PigItem.validateMultiLanguageText(itm.title, 'title');
            if (!tRes.ok) return tRes;
        }
        // Normalize and validate description (optional, but when present must be an array of ILanguageText):
        if (itm.description) {
            itm.description = PigItem.normalizeMultiLanguageText(itm.description, { stripCtrlFromHTML: true });
            const dRes = PigItem.validateMultiLanguageText(itm.description, 'description');
            if (!dRes.ok) return dRes;
        }
        // Normalize and validate definition (mandatory for classes):
        if (itm.definition) {
            itm.definition = PigItem.normalizeMultiLanguageText(itm.definition, { stripCtrlFromHTML: true });
            const dRes = PigItem.validateMultiLanguageText(itm.definition, 'definition');
            if (!dRes.ok) return dRes;
        }

        // @ToDo: implement further validation logic
        return super.validate(itm);
    }
    protected set(itm: IIdentifiable): this {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
//        LOG.debug('Identifiable.set i: ', itm);
        super.set(itm);
        this.id = itm.id;  // redundant, because it has (should have) been set by validate()
        this.specializes = itm.specializes;
        // Multi-language texts have been normalized in validate()
        this.title = itm.title;
        this.description = itm.description;
        this.definition = itm.definition;
        this.revision = itm.revision;
        this.priorRevision = itm.priorRevision;
        this.modified = itm.modified;
        this.creator = itm.creator;
//        LOG.debug('Identifiable.set o: ', this);
        // made chainable in concrete subclass
        return this;
    }
    protected get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            id: this.id,
            specializes: this.specializes,
            title: this.title,
            description: this.description,
            definition: this.definition,
            revision: this.revision,
            priorRevision: this.priorRevision,
            modified: this.modified,
            creator: this.creator
        } as IIdentifiable);
    }
    protected fromJSONLD(itm: any) {
        let ld = { ...itm };

        // 1. Rename JSON-LD tags to internal format
        ld = MVF.renameJsonTags(ld, MVF.fromJSONLD, { mutate: false });

        // 2. Replace id-objects with id-strings
        ld = replaceIdObjects(ld);

        // Multi-language text normalization now happens in set() method

        // Set the normalized object in the concrete subclass
        return ld;
    }
    setJSONLD(itm: any) {
        const _itm = this.fromJSONLD(itm) as any;
        return this.set(_itm);
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
    idRef: TPigId;  // must point to an element according to enumeratedTarget of the class
}
abstract class ALink extends Item implements IALink {
    idRef!: TPigId;
    constructor(itm: TConstructItem) {
        super(itm);
    }
    protected validate(itm: IALink) {
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(612, itm.itemType);
        // @ToDo: implement further validation logic
        // - Check class reference; must be an existing Link URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    protected set(itm: IALink): this {
        super.set(itm);
        this.idRef = itm.idRef;
        return this;
    }
    protected get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            idRef: this.idRef
        }) as IALink;
    }
    protected setJSONLD(itm: any): this {
        let _itm = MVF.renameJsonTags(itm, MVF.fromJSONLD, { mutate: false }) as any;
        _itm = replaceIdObjects(_itm) as any;
        return this.set(_itm);
    }
}
interface IElement extends IIdentifiable {
    enumeratedProperty?: TPigId[];
    icon?: IText;  // optional, default is undefined (no icon)
}
abstract class Element extends Identifiable implements IElement {
    enumeratedProperty?: TPigId[];
    icon?: IText;
    protected constructor(itm: TConstructItem) {
        super(itm); // actual itemType set in concrete class
    }
    protected set(itm: IElement) {
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.enumeratedProperty = itm.enumeratedProperty;
        this.icon = itm.icon;
        return this;
    }
    protected get() {
        return {
            ...super.get(),
            enumeratedProperty: this.enumeratedProperty, // undefined: all allowed, empty array: none allowed, array with items: only those allowed
            icon: this.icon
        } as IElement;
    }
}

interface IAnElement extends IIdentifiable {
    hasProperty?: IAProperty[];
    hasTargetLink?: IALink[];  // array must have exactly one element as checked by the JSON schema
}
abstract class AnElement extends Identifiable implements IAnElement {
    hasProperty!: AProperty[]; // instantiated AProperty items
    hasTargetLink!: ATargetLink[];  // array must have exactly one element as checked by the JSON schema
    protected constructor(itm: TConstructItem) {
        super(itm);
    }
/*    protected validate(itm: IAnElement) {
        // @ToDo: implement further validation logic
        return super.validate(itm);
    } */
    protected set(itm: IAnElement): this {
    //    LOG.debug('anEl.set 0', itm.hasProperty);
        // validated in concrete subclass before calling this;
        // also lastStatus set in concrete subclass.
        super.set(itm);
        this.hasProperty = itm.hasProperty ? itm.hasProperty.map(p => new AProperty().set(p)) : [];
        this.hasTargetLink = itm.hasTargetLink ? itm.hasTargetLink.map(t => new ATargetLink().set(t)) : [];
    //    LOG.debug('anEl.set 9',itm.hasProperty, this.hasProperty);
        // made chainable in concrete subclass
        return this;
    }
    protected get() {
        return {
            ...super.get(),
            hasProperty: this.hasProperty.length>0? this.hasProperty.map(p => p.get()) : undefined,
            hasTargetLink: this.hasTargetLink.length > 0 ? this.hasTargetLink.map(t => t.get()) : undefined
        } as IAnElement;
    }
    protected fromJSONLD(itm: any) {
        const _itm = super.fromJSONLD(itm) as any;

        // In JSON-LD all configurable properties have an ID-string as tag and an itemType cas:aProperty;
        // collect them here in a hasProperty array, where the tag becomes hasClass;
        // they will be instantiated as AProperty items in set():

        _itm.hasProperty = this.collectConfigurablePropertiesFromJSONLD(_itm) as IAProperty[];
        _itm.hasTargetLink = this.collectConfigurableLinksFromJSONLD(_itm, PigItemType.aTargetLink) as IALink[];
        //    LOG.debug('AnElement.setJSONLD: '+ JSON.stringify(_itm, null, 2));

        // Set the normalized object in the concrete subclass
        return _itm;
    }
    /**
     * Collect configurable properties from a JSON-LD object.
     * In JSON-LD, configurable properties have an ID-string as key (namespace:name or URI)
     * and their value is an array of objects with itemType 'cas:aProperty'.
     * This function extracts those properties and transforms them into a hasProperty array,
     * where the original key becomes the 'hasClass' field of each property.
     * 
     * @param obj - The input object
     * @returns Array of IAProperty objects, or undefined if no properties found
     */
    protected collectConfigurablePropertiesFromJSONLD(
        obj: any
    ): IAProperty[] | undefined {

        if (!obj || typeof obj !== 'object') return undefined;

        const configurables: IAProperty[] = [];

        // Standard PIG fields that should NOT be collected as properties;
        // the tags have already been renamed with MVF.renameJsonTags( ..., MVF.fromJSONLD):
        const skipKeys = new Set(MVF.toJSONLD.keys());

        //LOG.debug('collect 1',obj,itype);
        for (const key of Object.keys(obj)) {
            // Skip known metadata keys and standard PIG fields
            if (skipKeys.has(key)) continue;

            // Check if key (configurable property or link) is a valid ID string (namespace:name or URI)
            const isValid = PigItem.isValidIdString(key);
            // LOG.info(`collectConfigurablePropertiesFromJSONLD: checking key="${key}", isValid=${isValid}, itype=${itype}`);
            if (!isValid) continue;   // the schema should reject invalid keys, so we skip them here

            const val = obj[key];
            //LOG.debug('collect 2', key,val);

            // Handle array of property values
            if (LIB.isArrayWithContent(val)) {
                for (const item of val as any[]) {
                    // The tags have already been renamed:
                    if (item && typeof item === 'object') {
                        const aProp: Partial<IAProperty> = item;
                        // const nameItemType = `${DEF.pfxNsMeta}itemType`;
                        const itemTypeValue = aProp.itemType /* || (item[nameItemType] && extractId(item[nameItemType])) */;

                        // Add the property with the key as its hasClass reference
                        if (itemTypeValue === PigItemType.aProperty /* || !itemTypeValue*/) {
                            if (aProp.value !== undefined || aProp.composes) {
                                configurables.push({
                                    itemType: PigItemType.aProperty,
                                    hasClass: key,
                                    value: aProp.value /*|| item['@value'] */,
                                    composes: aProp.composes
                                });
                            }
                            delete obj[key]; // remove processed property
                        }
                    }
                }
            }
            // Handle single property or link values (non-array)
            else if (val && typeof val === 'object') {
                const aProp: Partial<IAProperty> = val;
                // const nameItemType = `${DEF.pfxNsMeta}itemType`;
                const itemTypeValue = aProp.itemType /* || (val[nameItemType] && extractId(val[nameItemType])) */;

                if (itemTypeValue === PigItemType.aProperty /* || !itemTypeValue */) {
                    if (aProp.value !== undefined || aProp.composes) {
                        configurables.push({
                            itemType: PigItemType.aProperty,
                            hasClass: key,
                            value: aProp.value /*|| item['@value'] */,
                            composes: aProp.composes
                        });
                    }
                    delete obj[key]; // remove processed property
                }
            }
            // Handle primitive values (string, number, boolean) - create simple properties
            else if (val !== undefined && val !== null && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')) {
                configurables.push({
                    itemType: PigItemType.aProperty,
                    hasClass: key,
                    value: String(val)
                });
                delete obj[key]; // remove processed property
            }
        }

        return configurables.length > 0 ? configurables : undefined;
    }
    /**
     * Collect configurable links from a JSON-LD object.
     * In JSON-LD, configurable links have an ID-string as key (namespace:name or URI)
     * and their value is an array of objects with itemType 'cas:aLink'.
     * This function extracts those links and transforms them into a hasLink array,
     * where the original key becomes the 'hasClass' field of each link.
     * 
     * @param obj - The input object (typically from JSON-LD)
     * @param itype - The expected itemType for the links (PigItemType.aSourceLink or PigItemType.aTargetLink)
     * @returns Array of IALink objects, or undefined if no links found
     */
    protected collectConfigurableLinksFromJSONLD(
        obj: any,
        itype: typeof PigItemType.aSourceLink | typeof PigItemType.aTargetLink
    ): IALink[] | undefined {

        if (!obj || typeof obj !== 'object') return undefined;

        const configurables: IALink[] = [];

        // Standard PIG fields that should NOT be collected as configurables;
        // the tags have already been renamed with MVF.renameJsonTags( ..., MVF.fromJSONLD):
        const skipKeys = new Set(MVF.toJSONLD.keys());

        //LOG.debug('collect 1',obj,itype);
        for (const key of Object.keys(obj)) {
            // Skip known metadata keys and standard PIG fields
            if (skipKeys.has(key)) continue;

            // Check if key (configurable property or link) is a valid ID string (namespace:name or URI)
            const isValid = PigItem.isValidIdString(key);
            // LOG.info(`collectConfigurableLinksFromJSONLD: checking key="${key}", isValid=${isValid}, itype=${itype}`);
            if (!isValid) continue;   // the schema should reject invalid keys, so we skip them here

            const val = obj[key];
            //LOG.debug('collect 2', key,val);

            // Handle array of property or link values
            if (LIB.isArrayWithContent(val)) {
                for (const item of val as any[]) {
                    if (item && typeof item === 'object') {
                        const aLink: Partial<IALink> & { id?: TPigId } = item;
                        // The tags have already been renamed:

                        // const nameItemType = `${DEF.pfxNsMeta}itemType`;
                        const itemTypeValue = aLink.itemType /* || (item[nameItemType] && extractId(item[nameItemType])) */;

                        // Check if it has itemType 'cas:aSourceLink' or 'cas:aTargetLink' (may be an id-object)
                        if (itemTypeValue === itype /* || !itemTypeValue*/) {
                            // Add the property with the key as its hasClass reference
                            if (PigItem.isValidIdString(aLink.id)) {
                                configurables.push({
                                    itemType: itype,
                                    hasClass: key,
                                    idRef: aLink.id as TPigId
                                });
                            }
                            delete obj[key]; // remove processed property
                        }
                    }
                }
            }
            // Handle single property or link values (non-array)
            else if (val && typeof val === 'object') {
                const aLink: Partial<IALink> & { id?: TPigId } = val;
                // const nameItemType = `${DEF.pfxNsMeta}itemType`;
                const itemTypeValue = aLink.itemType /* || (val[nameItemType] && extractId(val[nameItemType])) */;

                if (itemTypeValue === itype /* || !itemTypeValue */) {
                    if (aLink.id !== undefined && PigItem.isValidIdString(aLink.id)) {
                        configurables.push({
                            itemType: itype,
                            hasClass: key,
                            idRef: aLink.id as TPigId
                        });
                    }
                    delete obj[key]; // remove processed property
                }
            }
            // Handle primitive value - create simple configurables
            else if (PigItem.isValidIdString(val)) {
                configurables.push({
                    itemType: itype,
                    hasClass: key,
                    idRef: val
                });
                delete obj[key]; // remove processed property
            }
        }

        return configurables.length > 0 ? configurables : undefined;
    }
}

//////////////////////////////////////
// The concrete classes:
export interface IEnumeratedValue {
    id: TPigId;
    // Either title or value must be present, but not both; see schemata:
    // with lang for xs:string with multiple languages, optional lang for xs:string with a single language:
    title?: ILanguageText[];
    // in PIG, values of all datatypes are strings; the datatype is defined in the respective Property
    value?: string;  
}
export interface IEnumeration extends IElement {
    datatype: string; // must be of XsDataType
    enumeratedValue: IEnumeratedValue[]; // array of allowed values, datatype-dependent
//    unit?: string;  // according to SI units
}
export class Enumeration extends Element implements IEnumeration {
    datatype!: string;
    enumeratedValue!: IEnumeratedValue[]; 
//    unit?: string;
    constructor() {
        super({itemType:PigItemType.Enumeration});
    }
    validate(itm: IEnumeration) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // LOG.debug('Enumeration.validate: ', itm);
        try {
            const ok = SCH.validateEnumerationSchema(itm);
            if (!ok) {
                const msg = SCH.getValidateEnumerationErrors();
                return Msg.create(681, 'Enumeration', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(681, 'Enumeration', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // - id and itemType checked in superclass
        //    const rsp = validateIdString(itm.datatype);
        //    if (!rsp.ok) return rsp;
        // - all datatypes beginning with 'xs:' are allowed, however only those defined in XsDatatypes are specifically supported,
        // - undefined datatype is allowed for all enumerations that are not referenced (which is checked in the overall consistency check)
        // - others shall be treated as strings (with a warning in the log):
        if (itm.datatype && !PigItem.isSupportedDatatype(itm.datatype)) {
            const msg = Msg.create(680, itm.id, itm.datatype);
            LOG.warn(msg.statusText);
            //            return msg */
        }

        // @ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IEnumeration): this {
        const _itm = LIB.stripUndefinedAndNull(itm) as IEnumeration;
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
        // For classes, the change information is optional and shall be used only for self-defined classes (as delivered in the package):
        if (_itm.modified)
            _itm.modified = normalizeDateTime(_itm.modified);

        // LOG.debug('Enumeration.set: '+ JSON.stringify(itm,null,2));
        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.datatype = _itm.datatype;
            this.enumeratedValue = _itm.enumeratedValue;
            // this.unit = _itm.unit;
        }
        return this; // make chainable
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            datatype: this.datatype,
            enumeratedValue: this.enumeratedValue,
            // unit: this.unit
        }) as IEnumeration;
    }
    fromJSONLD(itm: any) {
        // Normalize datatype (Property-specific)
        if (itm.datatype) {
            itm.datatype = itm.datatype.replace(/^xsd:/, 'xs:');
        }
        return super.fromJSONLD(itm) as any;
    }
}
export interface IProperty extends IIdentifiable {
    datatype: string; // must be of XsDataType
    readOnly?: boolean;  // if true, the property value of an instance cannot be changed once assigned; default is false
    minCount?: number;
    maxCount?: number;
    maxLength?: number;  // only used for string datatype
    pattern?: string;  // a RegExp pattern, only used for string datatype
    minInclusive?: number;  // only used for numeric datatypes
    maxInclusive?: number;  // only used for numeric datatypes
    defaultValue?: string;   // assigned when an instance is created without a value for this property; it may be changed afterwards
    // unit?: string;  // according to SI units
    composes?: TPigId[];  // must be URI of another Property, no cyclic references
}
export class Property extends Identifiable implements IProperty {
    datatype!: string;
    readOnly?: boolean;
    minCount?: number;
    maxCount?: number;
    maxLength?: number;
    pattern?: string;
    minInclusive?: number;
    maxInclusive?: number;
    defaultValue?: string;
    // unit?: string;
    composes?: TPigId[];
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
            return Msg.create(681, 'Property', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // - id and itemType checked in superclass
        //    const rsp = validateIdString(itm.datatype);
        //    if (!rsp.ok) return rsp;
        // - all datatypes beginning with 'xs:' are allowed, however only those defined in XsDatatypes are specifically supported,
        // - undefined datatype is allowed for all properties that are not referenced (which is checked in the overall consistency check)
        // - others shall be treated as strings (with a warning in the log):
        if (itm.datatype && !PigItem.isSupportedDatatype(itm.datatype)) {
            const msg = Msg.create(680, itm.id, itm.datatype);
            LOG.warn(msg.statusText);
            //            return msg */
        }

        // @ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IProperty): this {
        const _itm = LIB.stripUndefinedAndNull(itm) as IProperty;
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
        // For classes, the change information is optional and shall be used only for self-defined classes (as delivered in the package):
        if (_itm.modified)
            _itm.modified = normalizeDateTime(_itm.modified);

        // LOG.debug('Property.set: '+ JSON.stringify(itm,null,2));
        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.datatype = _itm.datatype;
            this.minCount = _itm.minCount;
            this.maxCount = _itm.maxCount;
            this.maxLength = _itm.maxLength;
            this.pattern = _itm.pattern;
            this.minInclusive = _itm.minInclusive;
            this.maxInclusive = _itm.maxInclusive;
            this.defaultValue = _itm.defaultValue;
            this.readOnly = _itm.readOnly;
            // this.unit = _itm.unit;
            this.composes = _itm.composes;
        }
        return this; // make chainable
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            datatype: this.datatype,
            minCount: this.minCount,
            maxCount: this.maxCount,
            maxLength: this.maxLength,
            pattern: this.pattern,
            minInclusive: this.minInclusive,
            maxInclusive: this.maxInclusive,
            defaultValue: this.defaultValue,
            readOnly: this.readOnly,
            // unit: this.unit,
            composes: this.composes
        }) as IProperty;
    }
    fromJSONLD(itm: any) {
        // Normalize datatype (Property-specific)
        if (itm.datatype) {
            itm.datatype = itm.datatype.replace(/^xsd:/, 'xs:');
        }
        return super.fromJSONLD(itm) as any;
    }
}
export interface ILink extends IIdentifiable {
    enumeratedEndpoint: TPigId[]; // must be URI of an Entity or Relationship (class)
    readOnly?: boolean; // if true, the link value of an instance cannot be changed once assigned; default is false
    revisionAware?: boolean; // optional, default is false
    minCount?: number;
    maxCount?: number;
    defaultValue?: TPigId;   // assigned when an instance is created without a value for this property; it may be changed afterwards
}
export class Link extends Identifiable implements ILink {
    enumeratedEndpoint!: TPigId[];
    readOnly?: boolean;
    revisionAware?: boolean;
    minCount?: number;
    maxCount?: number;
    defaultValue?: TPigId;
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
            return Msg.create(681, 'Link', itm.id, err?.message ?? String(err));
        }

        /*    // id and itemType checked in superclass
            // At metamodel level, simple id strings are listed:
            const rsp = validateIdStringArray(itm.enumeratedEndpoint, 'enumeratedEndpoint');
            if (!rsp.ok) return rsp; */
        return super.validate(itm);
    }
    set(itm: ILink) {
        const _itm = LIB.stripUndefinedAndNull(itm) as ILink;
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
        // For classes, the change information is optional and shall be used only for self-defined classes (as delivered in the package):
        if (_itm.modified)
            _itm.modified = normalizeDateTime(_itm.modified);

        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.enumeratedEndpoint = _itm.enumeratedEndpoint;
            this.revisionAware = _itm.revisionAware;
            this.readOnly = _itm.readOnly;
            this.minCount = _itm.minCount;
            this.maxCount = _itm.maxCount;
            this.defaultValue = _itm.defaultValue;
        }
        return this;
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            enumeratedEndpoint: this.enumeratedEndpoint,
            revisionAware: this.revisionAware,
            readOnly: this.readOnly,
            minCount: this.minCount,
            maxCount: this.maxCount,
            defaultValue: this.defaultValue
        }) as ILink;
    }
}

export interface IEntity extends IElement {
    enumeratedTargetLink?: TPigId[];  // must hold Link URIs
}
export class Entity extends Element implements IEntity {
    enumeratedTargetLink?: TPigId[];
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
                return Msg.create(681, 'Entity', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(681, 'Entity', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        // check whether specializes is another Entity URI is done in overall consistency check

        /*    // If enumeratedTarget is not present, all references are allowed;
            // if present and empty, no references are allowed:
            const rsp = validateIdStringArray(itm.enumeratedTargetLink, 'enumeratedTargetLink', { canBeUndefined: true, minCount: 0 });
            if (!rsp.ok) return rsp; */
        // @ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IEntity) {
        const _itm = LIB.stripUndefinedAndNull(itm) as IEntity;
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
        // For classes, the change information is optional and shall be used only for self-defined classes (as delivered in the package):
        if (_itm.modified)
            _itm.modified = normalizeDateTime(_itm.modified);

        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.enumeratedTargetLink = _itm.enumeratedTargetLink;
        }
        return this;  // make chainable
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            enumeratedTargetLink: this.enumeratedTargetLink // undefined: all allowed, empty array: none allowed, array with items: only those allowed
        }) as IEntity;
    }
}

export interface IRelationship extends IElement {
    enumeratedSourceLink?: TPigId[];  // must hold Link URI, exactly 1 as checked by the JSON schema
    enumeratedTargetLink?: TPigId[];  // must hold Link URI, exactly 1 not pointing to an enumeration
}
export class Relationship extends Element implements IRelationship {
    enumeratedSourceLink?: TPigId[];
    enumeratedTargetLink?: TPigId[];
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
            return Msg.create(681, 'Relationship', itm.id, err?.message ?? String(err));
        }

        // Runtime guards:
        // id and itemType checked in superclass
        // check whether specializes is another Relationship URI is done in overall consistency check

        /*    // If enumeratedSource/enumeratedTarget are not present, sources resp. targets of all classes are allowed;
            // if present, at least one entry must be there, because a relationship without source or target makes no sense:
            let rsp = validateIdStringArray(itm.enumeratedSourceLink, 'enumeratedSourceLink', { canBeUndefined: true, minCount: 1 });
            if (!rsp.ok) return rsp;
            rsp = validateIdStringArray(itm.enumeratedTargetLink, 'enumeratedTargetLink', { canBeUndefined: true, minCount: 1 });
            if (!rsp.ok) return rsp; */
        // @ToDo: implement further validation logic
        return super.validate(itm);
    }
    set(itm: IRelationship) {
        const _itm = LIB.stripUndefinedAndNull(itm) as IRelationship;
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
        // For classes, the change information is optional and shall be used only for self-defined classes (as delivered in the package):
        if ( _itm.modified )
            _itm.modified = normalizeDateTime(_itm.modified);

        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            // each of the following have at least one entry if present, as checked by the JSON schema; if not present, all references are allowed:
            this.enumeratedSourceLink = _itm.enumeratedSourceLink;
            this.enumeratedTargetLink = _itm.enumeratedTargetLink;
        }
        return this;
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            enumeratedSourceLink: this.enumeratedSourceLink, // undefined: all allowed, empty array: none allowed, array with items: only those allowed
            enumeratedTargetLink: this.enumeratedTargetLink // as above
        }) as IRelationship;
    }
}

// For the instances/individuals, the 'payload':
export interface IAProperty extends IItem {
    value?: string;       // Literal value (string, number, boolean, date - all as string)
    composes?: TPigId[];  // for composed properties: nests other properties, as properties have no id
}
export class AProperty extends Item implements IAProperty {
    value?: string;
    composes?: TPigId[];
    constructor() {
        super({ itemType: PigItemType.aProperty });
    }
    validate(itm: IAProperty) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(612, PigItemType.aProperty);
        return super.validate(itm);
    }
    set(itm: IAProperty) {
        this.lastStatus = this.validate(itm);
        if (this.lastStatus.ok) {
            super.set(itm);
            this.hasClass = itm.hasClass;  // Set hasClass for property instances
            this.composes = itm.composes;
            this.value = itm.value;
        }
        return this;
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            composes: this.composes,
            value: this.value,
        } as IAProperty );
    }
}
export class ASourceLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aSourceLink });
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(612, PigItemType.aSourceLink);
        // @ToDo: implement further validation logic
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
        return LIB.stripUndefinedAndNull({
            ... super.get(),
        });
    }
}
export class ATargetLink extends ALink implements IALink {
    constructor() {
        super({ itemType: PigItemType.aTargetLink });
    }
    validate(itm: IALink) {
        // itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(612, PigItemType.aTargetLink);
        // @ToDo: implement further validation logic
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
        return LIB.stripUndefinedAndNull({
            ... super.get(),
        });
    }
}

export type IAnEntity = IAnElement;
// export interface IAnEntity extends IAnElement {}
export class AnEntity extends AnElement implements IAnElement {
    constructor() {
        super({ itemType: PigItemType.anEntity });
    }
    validate(itm: IAnEntity) {
        // Schema validation (AJV) - provides structural checks and reuses the idString definition
        // ... only at the lowest subclass level:
        try {
            // LOG.info('AnEntity.validate: validating object keys:', Object.keys(itm));
            // LOG.info('AnEntity.validate: full object:', JSON.stringify(itm, null, 2));
            const ok = SCH.validateAnEntitySchema(itm);
            if (!ok) {
                const msg = SCH.getValidateAnEntityErrors();
                // LOG.info('AnEntity.validate: FAILED with errors:', msg);
                return Msg.create(681, 'anEntity', itm.id, msg);
            }
        } catch (err: any) {
            return Msg.create(681, 'anEntity', itm.id, err?.message ?? String(err));
        }

        // Call parent validation
        const rsp = super.validate(itm);
        if (!rsp.ok)
            return rsp;

        // Runtime guards:
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(612, PigItemType.anEntity);

        return super.validate(itm);
    }
    set(itm: IAnEntity) {
        const _itm = LIB.stripUndefinedAndNull(itm) as IAnEntity;
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
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
        return LIB.stripUndefinedAndNull({
            ... super.get(),
        });
    }
}

export interface IARelationship extends IAnElement {
    hasSourceLink: IALink[];  // array must have exactly one element as checked by the JSON schema
}
export class ARelationship extends AnElement implements IARelationship {
    hasSourceLink!: ASourceLink[];
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
            return Msg.create(681, 'aRelationship', itm.id, err?.message ?? String(err));
        }

        // Call parent validation
        const rsp = super.validate(itm);
        if (!rsp.ok)
            return rsp;

        // Runtime guards:
        // id and itemType checked in superclass
        if (!itm.hasClass)
            return Msg.create(612, PigItemType.aRelationship);
        // @ToDo: implement further validation logic
        // - Check class reference; must be an existing Relationship URI (requires access to the cache to resolve the class -> do it through overall consistency check):
        return super.validate(itm);
    }
    set(itm: IARelationship) {
        const _itm = LIB.stripUndefinedAndNull(itm) as IARelationship;
        //LOG.debug('ARelationship.set():', _itm);
        // id is normalized in the caller (setXML or setJSONLD) on multiple levels
        _itm.modified = normalizeDateTime(_itm.modified) || new Date().toISOString();

        this.lastStatus = this.validate(_itm);
        if (this.lastStatus.ok) {
            super.set(_itm);
            this.hasSourceLink = _itm.hasSourceLink ? _itm.hasSourceLink.map(s => new ASourceLink().set(s)) : [];
        }
        return this;
    }
    get() {
        return LIB.stripUndefinedAndNull({
            ...super.get(),
            hasSourceLink: this.hasSourceLink.length > 0 ? this.hasSourceLink.map(s => s.get()) : undefined,
        }) as IARelationship;
    }
    fromJSONLD(itm: any) {
        const _itm = super.fromJSONLD(itm) as any;
        _itm.hasSourceLink = this.collectConfigurableLinksFromJSONLD(_itm, PigItemType.aSourceLink) as IALink[];
        return _itm;
    }
}
// For packages:
export interface IAPackage extends IAnElement {
    hasClass: TPigId;  // required for APackage according to JSON schema
    context?: INamespace[] | string | Record<string, string>;
    graph: TPigItem[];
}
export class APackage extends AnElement implements IAPackage {
    context?: INamespace[] | string | Record<string, string>;
    graph: TPigItem[] = [];

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
            return Msg.create(681, 'aPackage', pkg.id, err?.message ?? String(err));
        }

        // Call parent validation
        let rsp = super.validate(pkg);
        if (!rsp.ok)
            return rsp;

        // Runtime guards:
        // id and itemType checked in superclass
        if (!pkg.hasClass)
            return Msg.create(612, PigItemType.aPackage);

        rsp = checkConstraintsForPackage(pkg, options);
        // if (pkg.id == 'd:test-invalid-prop')
        // LOG.debug(`APackage.validate: validating package `, pkg, rsp);
        if (!rsp.ok) {
            // LOG.debug(`APackage.validate: package validation failed`, rsp);
            return rsp;
        }

        return rspOK;
    }

    set(pkg: IAPackage, options?:any): this {
        // const _pkg = { ...pkg };
        const _pkg = LIB.stripUndefinedAndNull(pkg) as IAPackage;
        // id is normalized in the caller (setXML or setJSONLD) on multiple layers
        _pkg.modified = normalizeDateTime(_pkg.modified) || new Date().toISOString();

        // Instantiate each graph item:
        const instantiatedGraph: TPigItem[] = [];
        const errors: string[] = [];

        for (const item of _pkg.graph) {
            // LOG.debug(`APackage.set: instantiating item ${JSON.stringify(item, null, 2)}`);
            const result = this.createItem(item, { defaultModified: _pkg.modified, source: 'any' });
            if (result.response)
                instantiatedGraph.push(result.response as TPigItem);

            if (!result.ok) {
                errors.push(`${result.statusText} (${result.status})` || 'Unknown instantiation error');
                // LOG.debug(`APackage.set: failed to instantiate item: `, JSON.stringify(item, null, 2));
            }
        }
        // LOG.debug('APackage.set: ',JSON.stringify(_pkg, null, 2));

        // Ensure default namespace prefixes exist in context BEFORE validation
        // Only adds namespaces that were actually used during normalization
        const _context = this.ensureDefaultNamespaces(_pkg.context);
        _pkg.context = _context;

        // Validate the package with all preprocessing completed
        const pkgValidation = this.validate(_pkg, options);
        if (!pkgValidation.ok)
            errors.push(`${pkgValidation.statusText} (${pkgValidation.status})` || 'Unknown constraint error');

        // Now set the package properties and instantiated graph (with errors if any)
        super.set(_pkg);
        this.context = _context;
        this.graph = instantiatedGraph;

        if (errors.length > 0) {
            this.lastStatus = Msg.create(603, 'Package Import', instantiatedGraph.length, _pkg.graph.length, errors.join(', '));
            LOG.warn(this.lastStatus.statusText);
        }
        else {
            this.lastStatus = pkgValidation;
        }

        // LOG.debug(`APackage.set: package ${_pkg.id} set with ${instantiatedGraph.length} of ${_pkg.graph.length} items, status:`, this.lastStatus);
        return this;
    }

    get() {
        // Build complete package representation
        const pkg = {
            ...super.get(),
            context: this.context,
            graph: this.graph?.map(item => {
                return item.get();
            })
        } as IAPackage;
        return LIB.stripUndefinedAndNull(pkg);
    }

    /**
     * Ensure default namespace prefixes 'o:' and 'd:' exist in the package context
     * if they have been assigned by normalizeId() during import.
     * 
     * This method only adds namespaces that are tracked in PigItem.usedDefaultNamespaces,
     * meaning they were actually assigned to IDs lacking explicit namespaces.
     * 
     * If a prefix is already defined in context, the existing definition is kept.
     * If not defined but was used, a dummy namespace is added with a descriptive URI.
     * 
     * This prevents namespace validation errors for locally-defined terms.
     * 
     * @param context - The context from the package
     * @returns Updated context with necessary default namespaces
     */
    private ensureDefaultNamespaces(context?: INamespace[] | string | Record<string, string>): INamespace[] | string | Record<string, string> | undefined {
        // If no default namespaces were used, return context unchanged
        if (PigItem.usedDefaultNamespaces.size < 1) {
            return context;
        }

        // If no context exists, create an empty array
        if (!context) {
            context = [];
        }

        // Convert context to array format if needed
        let contextArray: INamespace[];

        if (Array.isArray(context)) {
            contextArray = context as INamespace[];
        } else if (typeof context === 'object') {
            // Convert JSON-LD object format to INamespace array
            contextArray = Object.entries(context).map(([key, value]) => ({
                tag: key.endsWith(':') ? key : `${key}:`,
                uri: value as string
            }));
        } else {
            // Context is a string (URI) - rare case, just create new array
            contextArray = [];
        }

        // Check which used default namespaces are missing from context
        for (const usedPrefix of PigItem.usedDefaultNamespaces) {
            // Normalize prefix (remove colon for comparison)
            const prefixWithoutColon = usedPrefix.endsWith(':') ? usedPrefix.slice(0, -1) : usedPrefix;

            // Check if this prefix already exists in context
            const prefixExists = contextArray.some(ns => {
                const tag = ns.tag.endsWith(':') ? ns.tag.slice(0, -1) : ns.tag;
                return tag === prefixWithoutColon;
            });

            // Add missing namespace
            if (!prefixExists) {
                let uri: string;
                if (usedPrefix === DEF.defaultOntologyNamespace) {
                    uri = `${DEF.pigPath}ontology/application#`;
                } else if (usedPrefix === DEF.defaultDataNamespace) {
                    uri = `${DEF.pigPath}example#`;
                } else {
                    // Fallback for any other default prefix
                    uri = `${DEF.pigPath}default/${prefixWithoutColon}#`;
                }

                contextArray.push({
                    tag: usedPrefix,
                    uri: uri
                });
                // LOG.debug(`APackage: Added default namespace '${usedPrefix}' to context (was used during normalization)`);
            }
        }

        // Return the modified context array
        return contextArray;
    }

    setJSONLD(docLD: any, options?:any) {
        // Clear the tracker for used default namespaces before transformation
        PigItem.clearUsedDefaultNamespaces();

        // @ToDo: Perhaps we must normalize the ids like in XML import to assure they have a namespace or are an URI
        const doc = this.fromJSONLD(docLD) as any;
        // LOG.debug(`APackage.setJSONLD: ${JSON.stringify(doc, null, 2)}`);

        // Extract @context
        const ctx = this.xContextLD(doc);

        // Extract and process @graph
        const graph: any[] = (Array.isArray(doc.graph) ? doc.graph : []);

        if (graph.length < 1) {
            LOG.warn(`APackage.setJSONLD: @graph of ${doc.id} is empty`);
        }

        // Transform the items to native JSON:
        const graphJson = graph.map(itm => this.ldToJson(itm));

        // Call set to validate and set all items including package
        // LOG.debug('aPackage.setJSONLD',doc,graphJson);
        this.set({
            ...doc,
        //    itemType: PigItemType.aPackage,  // ToDo: obtain from doc - want to check whether the input is correct
            context: ctx,
            graph: graphJson
        } as unknown as IAPackage, options);

        // LOG.debug(`APackage.setJSONLD: package ${JSON.stringify(this, null, 2)} set with status`, this.lastStatus);
        // return the instantiated graph with instantiated graph items:
        return this;
    }

    setXML(xmlString: stringXML, options?:any) {
        // Clear the tracker for used default namespaces before transformation
        PigItem.clearUsedDefaultNamespaces();

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
        // LOG.debug('APackage.setXML: parsed XML to JSON', doc);

        // 2. Extract namespaces
        const ctx = this.xContextXML(xmlString, doc.id as string);

        // 3. Extract package metadata
        //    ... can be obtained directly from doc (result from parsing)

        // 4. Extract and process graph items
        const graph: any[] = Array.isArray(doc.graph) ? doc.graph : [];

        if (graph.length < 1) {
            LOG.warn(`APackage ${doc.id}: @graph is empty`);
        }

        // 5. Build and validate package
        this.set({
            ...doc,
            itemType: PigItemType.aPackage,  // ToDo: obtain from doc - want to check whether the input is correct
            context: ctx,
            graph: graph
        } as unknown as IAPackage, options);

        // LOG.debug(`APackage.setXML: package ${JSON.stringify(this,null,2)} set with status`, this.lastStatus);
        return this;
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
            // @ToDo: throw instead?
            LOG.error(
                `APackage '${this.id || 'unknown'}' is corrupt`
            );
            return [];
        }
        else if (!pkgStatus.ok) {
            LOG.warn(
                `APackage '${this.id || 'unknown'}' caused an error: ${pkgStatus?.statusText || 'unknown error'}`
            );
        }
        else if (!Array.isArray(this.graph)) {
            LOG.warn(
                `APackage '${this.id || 'unknown'}' has no valid graph array`
            );
            return [(this as TPigItem)];
        }
        // Package may be valid or invalid but has a graph array, so we proceed to check the items:

        // Add package as first element
        result.push(this as TPigItem);

        // Filter and validate graph items
        // let validCount = 0;
        // let invalidCount = 0;

        for (const item of this.graph) {
            // LOG.debug(`LIB.allItems: processing graph item `, item);

            if (!item || typeof item !== 'object') {
                LOG.error(`APackage ${ this.id || 'unknown' }: encountered invalid graph item (not an object)`);
                // invalidCount++;
                continue;
            }

            // Check if item has status() method
            if (typeof (item as any).status !== 'function') {
                LOG.error(`APackage ${this.id || 'unknown' }: graph item '${(item as any).id || 'unknown'}' has no status() method`);
                // invalidCount++;
                continue;
            }

            // Check item status
            const itemStatus = (item as any).status();
            if (itemStatus.ok) {
                // validCount++;
            } else {
                LOG.warn(
                    `APackage ${this.id || 'unknown' }: graph item '${(item as any).id || 'unknown'}' (${(item as any).itemType || 'unknown type'}) has invalid status: ${itemStatus?.statusText || 'unknown error'}`
                );
                // invalidCount++;
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
     * @param itemLD - JSON-LD representation of item
     * @returns Plain JSON object ready for instantiation
     *
     * @ToDo: Rework the types JsonObject --> JsonObject
     */
    ldToJson(itemLD: any): any {
        let json = { ...itemLD };

        // 1. Rename JSON-LD tags to internal format (@id → id, etc.)
        json = MVF.renameJsonTags(json as JsonValue, MVF.fromJSONLD, { mutate: false });

        // 2. Replace id-objects with id-strings
        json = replaceIdObjects(json);

        // LOG.debug('ldToJson after tag renaming and id replacement: ', JSON.stringify(json, null, 2));
        // Multi-language text normalization now happens in set() method

        // 3. Normalize datatype (Property-specific)
        if (json.datatype) {
            json.datatype = json.datatype.replace(/^xsd:/, 'xs:');
        }

        // 5. Collect configurable properties from JSON-LD format
        // In JSON-LD, configurable properties have ID-string as tag
        if ([PigItemType.anEntity, PigItemType.aRelationship].includes(json.itemType)) {
            json.hasProperty = this.collectConfigurablePropertiesFromJSONLD(json) as IAProperty[];
            json.hasTargetLink = this.collectConfigurableLinksFromJSONLD(json, PigItemType.aTargetLink) as IALink[];
        }
        if ([PigItemType.aRelationship].includes(json.itemType)) {
            json.hasSourceLink = this.collectConfigurableLinksFromJSONLD(json, PigItemType.aSourceLink) as IALink[];
        }

        return json;
    }
    /**
     * Extract @context from JSON-LD document
     * @param doc - Parsed JSON-LD document
     * @returns Context as INamespace[], string, Record<string, string>, or undefined
     */
    private xContextLD(doc: any): INamespace[]{
        const ctx = doc['@context'] || doc.context;
        // LOG.debug('xContextLD (1): ',ctx);

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
     * @param docId - Document ID for logging purposes
     * 
     * @returns Context as INamespace[], string, Record<string, string>, or undefined
     * 
     * @example
     * Input XML:
     * <cas:aPackage xmlns:pig="https://cas.gfse.org/" 
     *               xmlns:dcterms="http://purl.org/dc/terms/"
     *               xmlns="http://default.org/">
     * 
     * Output:
     * [
     *   { tag: "cas:", uri: "https://cas.gfse.org/" },
     *   { tag: "dcterms:", uri: "http://purl.org/dc/terms/" },
     *   { tag: "@vocab", uri: "http://default.org/" }
     * ]
     */
    private xContextXML(xmlString: stringXML, docId:string): INamespace[] {
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

        if (namespaces.length < 1) {
            LOG.warn(`XML Package ${docId || 'unknown' }: no namespaces found`);
            return [];
        }

        // LOG.debug(`xContextXML: extracted ${namespaces.length} namespace(s)`);
        return namespaces;
    }

    /**
     * Instantiate a single PIG item (already converted to JSON)
     * @param item - JSON object from xmlToJson conversion
     * @returns IRsp with instantiated TPigItem in response, or error status
     */
    private createItem(item: any, options?: any): IRsp<unknown> {
        const source = options?.source || 'unknown';
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
 * /
function extractId(obj: unknown): string | undefined {
    if (obj === null || obj === undefined)
        return undefined;
//    if (typeof obj === 'string') return obj;
    if (typeof obj === 'object') {
        const o = obj as Record<string, unknown>;
        const id = Object.prototype.hasOwnProperty.call(o, '@id') ? o['@id'] : o['id'];
        // LOG.debug('extractId', obj, id);
        if (typeof(id) === 'string' && id.trim().length > 0) {
            return id;
        }
    }
    return undefined;
}

/* function validateIdString(input: unknown, fieldName = 'id'): IRsp {
    if (typeof input === 'string') {
        if (input.trim().length < 1) {
            Msg.create(624, fieldName);
        }
        if (PigItem.isValidIdString(input))
            return rspOK;
    }
    return Msg.create(625, fieldName);
} */
/**
 * Validate that a value is a non-empty array whose elements are id-strings.
 * - id-string: a string accepted by `PigItem.isValidIdString`
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
        if (!PigItem.isValidIdString(input[i])) {
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
 *   whose value matches `PigItem.isValidIdString`.
 * @param input  value to check
 * @param fieldName  name used in error messages
 * @returns IRsp (rspOK on success, error IRsp on failure)
 */
/* function validateIdObjectArray(input: unknown, fieldName = 'ids'): IRsp {
    if (!Array.isArray(input)) {
        return Msg.create(630, fieldName);
    }
    if (input.length < 1) {
        return Msg.create(631, fieldName, 1);
    }

    for (let i = 0; i < input.length; i++) {
        const el = input[i];
        if (el === null || el === undefined || typeof el !== 'object' || Array.isArray(el)) {
            return Msg.create(633, fieldName, i);
        }
        const obj = el as Record<string, unknown>;
        const candidate = Object.prototype.hasOwnProperty.call(obj, '@id') ? obj['@id'] : obj['id'];
        if (typeof candidate !== 'string' || !PigItem.isValidIdString(candidate)) {
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

// Normalize dateTime strings by ensuring they are in ISO format (e.g. '2024-06-01T12:00:00Z')
function normalizeDateTime(dateStr: any): string | undefined {
    // return if it is already a valid ISO string:
    if (typeof dateStr === 'string') {
        const match = dateStr.match(RE.isoDateTime);
        // LOG.debug(`normalizeDateTime: checking '${dateStr}' against ISO regex, match:`, match);
        if (match) {
            // match[1] is the timezone group (or undefined):
            if (match[1])
                return dateStr; // valid ISO with timezone

            const normalized = dateStr + DEF.defaultTimezone;
            LOG.info(`DateTime normalized: '${dateStr}' → '${normalized}'`);
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
    LOG.info(`DateTime normalized: '${dateStr}' → '${normalized}'`);
    return normalized;
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
        const parser = PLI.createDOMParser();

        // Try 1: Parse without wrapper
        const doc = parser.parseFromString(xml, 'text/xml');
        const parserError = PLI.getXmlParseError(doc);

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

        const wrappedError = PLI.getXmlParseError(wrappedDoc);
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
 * - PIG classes (Property, Link, Entity, Relationship, Enumeration)
 * - PIG instances (anEntity, aRelationship)
 * - Configurable properties (cas:aProperty)
 * - Configurable links (cas:aSourceLink, cas:aTargetLink)
 * 
 * @param xmlElement - XML DOM Element to convert
 * @returns JSON representation of the element
 */
function xmlElementToJson(xmlElement: ElementXML): JsonObject {

    const result: JsonObject = {};

    // 1. Extract itemType from element tag name (only for valid PIG types)
    const tagName = xmlElement.tagName as PigItemTypeValue;
    // Check if this is a valid PIG element
    const isValidPigElement = PigItem.isValidItemType(tagName);
    if (isValidPigElement) {
        result.itemType = tagName;
    }

    // 2. Extract all attributes (within tag) as properties
    for (const attr of Array.from(xmlElement.attributes)) {
        const attrName = attr.name;
        const attrValue = attr.value;

        // ToDo: Reconsider the following structure. It may assume cases that don't exist.
        if (attrName.startsWith('xmlns')) {
            continue;
        } else if (attrName.endsWith('id')) {
            // Special handling for enumeratedValue IDs - they should use ontology namespace
            const localTagName = tagName.includes(':') ? tagName.split(':')[1] : tagName;
            if (localTagName === 'enumeratedValue') {
                // enumeratedValue IDs are part of ontology definitions, not data instances
                result.id = PigItem.normalizeId(attrValue, PigItemType.Enumeration);
            } else {
                // normalize always, including enumerated values
                result.id = PigItem.normalizeId(attrValue, tagName);
            }
        } else if (attrName.endsWith('type') || attrName.endsWith('hasClass')) {
            // normalize if we have a valid PIG type
            result.hasClass = isValidPigElement
                ? PigItem.normalizeId(attrValue)  // references always point to a class
                : attrValue;
        } else if (attrName.endsWith('specializes')) {
            // normalize if we have a valid PIG type
            result.specializes = isValidPigElement
                ? PigItem.normalizeId(attrValue)  // references always point to a class
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
            if (childTagName === PigItemType.aProperty) {
                configurableProperties.push(configurablePropertyToJson(childElement));
                continue;
            }
            if (childTagName === PigItemType.aSourceLink) {
                configurableSourceLinks.push(configurableLinkToJson(childElement, PigItemType.aSourceLink));
                continue;
            }
            if (childTagName === PigItemType.aTargetLink) {
                configurableTargetLinks.push(configurableLinkToJson(childElement, PigItemType.aTargetLink));
                continue;
            }

            // Group regular child elements by tag name
            const elements = childElementsByTag.get(childTagName);
            if (elements) {
                // push to respective group childElementsByTag, if it already exists
                elements.push(childElement);
            } else {
                // otherwise, create new group with this child as first element
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
        if (tagName === 'graph' || tagName === `${DEF.pfxNsMeta}graph`) {
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
        const isMultiLang = PigItem.needsMultiLanguageText(propertyName);

        // Check if this property needs IText wrapping (e.g. icon)
        const needsTextWrapper = PigItem.needsIText(propertyName);

        // Pass parent itemType for context-aware array detection
        const needsArray = PigItem.needsArray(propertyName /*, result.itemType as PigItemTypeValue */);

        // Check if this property contains IDs that need normalization
        const needsIdNormalization = PigItem.needsIdNormalization(propertyName);

        if (elements.length === 1 && !needsArray) {
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
                        // Apply ID normalization if needed
                        result[propertyName] = needsIdNormalization ? PigItem.normalizeId(childText) : childText;
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
                        // Apply ID normalization if needed
                        return needsIdNormalization ? PigItem.normalizeId(childText) : childText;
                    } else {
                        return xmlElementToJson(elem);
                    }
                }
            });
        }
    }

    // 5. If element has only text content and no child elements, add as value
    if (childElementsByTag.size < 1 && textContent.length > 0) {
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
 * Process cas:aProperty element
 * Extracts:
 * - rdf:type → hasClass
 * - <value> → value
 * - itemType → cas:aProperty
 */
function configurablePropertyToJson(elem: ElementXML): JsonObject {
    const prop: JsonObject = {
        itemType: PigItemType.aProperty
    };

    // Extract rdf:type and cas:hasClass as hasClass
    const rdfType = elem.getAttribute('rdf:type') || elem.getAttribute('type') || elem.getAttribute(`${DEF.pfxNsMeta}hasClass`) || elem.getAttribute('hasClass');
    if (rdfType) {
        prop.hasClass = PigItem.normalizeId(rdfType);  // references always point to a class
    }

    // Extract child elements
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const childElement = child as ElementXML;
            const childTagName = childElement.tagName;

            if (childTagName === 'value') {
                prop.value = getXmlElementText(childElement);
            } else if (childTagName === 'idRef') {
                prop.idRef = PigItem.normalizeId(childElement.textContent?.trim() as string);
            } else if (childTagName.endsWith('type')  || childTagName.endsWith('hasClass')) {
                prop.hasClass = PigItem.normalizeId(childElement.textContent?.trim() as string);
            } else if (childTagName === 'composes') {
                if (!prop.composes) {
                    prop.composes = [];
                }
                (prop.composes as string[]).push(PigItem.normalizeId(childElement.textContent?.trim() as string));
            }
        }
    }

    return prop;
}

/**
 * Import cas:aSourceLink or cas:aTargetLink element
 * Extracts:
 * - rdf:type → hasClass
 * - cas:hasClass → hasClass (accepted alternative to rdf:type)
 * - <idRef> → idRef
 * - itemType → cas:aSourceLink or cas:aTargetLink
 */
function configurableLinkToJson(elem: ElementXML, itemType: PigItemTypeValue): JsonObject {
    const link: JsonObject = {
        itemType: itemType
    };

    // Extract rdf:type and cas:hasClass as hasClass
    const rdfType = elem.getAttribute('rdf:type') || elem.getAttribute('type')
        || elem.getAttribute(`${DEF.pfxNsMeta}hasClass`) || elem.getAttribute('hasClass');
    if (rdfType) {
        link.hasClass = PigItem.normalizeId(rdfType);  // references always point to a class
    }

    // Extract child elements
    for (const child of Array.from(elem.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const childElement = child as ElementXML;
            const childTagName = childElement.tagName;

            if (childTagName === 'idRef') {
                const idRefValue = childElement.textContent?.trim() as string;

                // Determine namespace based on link class definition
                // If the link class's enumeratedEndpoint points to an Enumeration, idRef uses ontology namespace (o:)
                // Otherwise, idRef points to an instance and uses data namespace (d:)
                let targetItemType: PigItemTypeValue = PigItemType.anEntity; // default: data namespace

                if (link.hasClass) {
                    // Try to find the link class definition in the graph
                    const linkClassId = link.hasClass as string;
                    const linkClassElem = findLinkClassInGraph(elem, linkClassId);
                    if (linkClassElem && enumeratedEndpointPointsToEnumeration(linkClassElem)) {
                        // Link's enumeratedEndpoint points to an Enumeration, so idRef should use ontology namespace
                        targetItemType = PigItemType.Enumeration;
                    }
                }

                link.idRef = PigItem.normalizeId(idRefValue, targetItemType);
            } else if (childTagName.endsWith('hasClass')) {
                link.hasClass = PigItem.normalizeId(childElement.textContent?.trim() as string);  // references always point to a class
            }
        }
    }

    return link;
}

/**
 * Find a Link class definition in the graph by traversing up the DOM tree
 * @param linkElement - The aSourceLink or aTargetLink element
 * @param linkClassId - The ID of the Link class to find (may have namespace prefix)
 * @returns The Link element if found, null otherwise
 */
function findLinkClassInGraph(linkElement: ElementXML, linkClassId: string): ElementXML | null {
    // Remove namespace prefix from search ID for comparison
    const searchId = linkClassId.includes(':') ? linkClassId.split(':')[1] : linkClassId;

    // Traverse up to find the graph element
    let current = linkElement.parentNode;
    while (current && current.nodeType === NodeType.ELEMENT_NODE) {
        const elem = current as ElementXML;
        const tagName = elem.tagName;
        const localName = tagName.includes(':') ? tagName.split(':')[1] : tagName;

        if (localName === 'graph') {
            // Found the graph, now search for the Link class
            for (const child of Array.from(elem.childNodes)) {
                if (child.nodeType === NodeType.ELEMENT_NODE) {
                    const childElem = child as ElementXML;
                    const childTagName = childElem.tagName;
                    const childLocalName = childTagName.includes(':') ? childTagName.split(':')[1] : childTagName;

                    // Check if this is a Link or Relationship (both can have enumeratedEndpoint)
                    if (childLocalName === 'Link' || childLocalName === 'Relationship') {
                        const id = childElem.getAttribute('id');
                        if (id) {
                            // Compare without namespace prefix
                            const idWithoutPrefix = id.includes(':') ? id.split(':')[1] : id;
                            if (idWithoutPrefix === searchId) {
                                return childElem;
                            }
                        }
                    }
                }
            }
            break;
        }
        current = current.parentNode;
    }
    return null;
}

/**
 * Check if a Link or Relationship element's first enumeratedEndpoint points to an Enumeration
 * @param linkElement - The Link or Relationship element
 * @returns true if the first enumeratedEndpoint points to an Enumeration
 */
function enumeratedEndpointPointsToEnumeration(linkElement: ElementXML): boolean {
    // Find the first enumeratedEndpoint child
    for (const child of Array.from(linkElement.childNodes)) {
        if (child.nodeType === NodeType.ELEMENT_NODE) {
            const childElem = child as ElementXML;
            const tagName = childElem.tagName;
            const localName = tagName.includes(':') ? tagName.split(':')[1] : tagName;
            if (localName === 'enumeratedEndpoint') {
                // Found enumeratedEndpoint, now check what it points to
                // It should reference an Entity or Enumeration via text content
                const endpointRefId = childElem.textContent?.trim();
                if (endpointRefId) {
                    // Look up the referenced element in the graph
                    const referencedElement = findEntityOrEnumerationInGraph(linkElement, endpointRefId);
                    if (referencedElement) {
                        const refTagName = referencedElement.tagName;
                        const refLocalName = refTagName.includes(':') ? refTagName.split(':')[1] : refTagName;
                        return refLocalName === 'Enumeration';
                    }
                }
                // Only check the first enumeratedEndpoint
                return false;
            }
        }
    }
    return false;
}

/**
 * Find an Entity or Enumeration definition in the graph by ID
 * @param element - Any element within the graph
 * @param targetId - The ID to search for (may have namespace prefix)
 * @returns The Entity or Enumeration element if found, null otherwise
 */
function findEntityOrEnumerationInGraph(element: ElementXML, targetId: string): ElementXML | null {
    // Remove namespace prefix from search ID for comparison
    const searchId = targetId.includes(':') ? targetId.split(':')[1] : targetId;

    // Traverse up to find the graph element
    let current = element.parentNode;
    while (current && current.nodeType === NodeType.ELEMENT_NODE) {
        const elem = current as ElementXML;
        const tagName = elem.tagName;
        const localName = tagName.includes(':') ? tagName.split(':')[1] : tagName;

        if (localName === 'graph') {
            // Found the graph, now search for the Entity or Enumeration
            for (const child of Array.from(elem.childNodes)) {
                if (child.nodeType === NodeType.ELEMENT_NODE) {
                    const childElem = child as ElementXML;
                    const childTagName = childElem.tagName;
                    const childLocalName = childTagName.includes(':') ? childTagName.split(':')[1] : childTagName;

                    // Check if this is an Entity or Enumeration
                    if (childLocalName === 'Entity' || childLocalName === 'Enumeration') {
                        const id = childElem.getAttribute('id');
                        if (id) {
                            // Compare without namespace prefix
                            const idWithoutPrefix = id.includes(':') ? id.split(':')[1] : id;
                            if (idWithoutPrefix === searchId) {
                                return childElem;
                            }
                        }
                    }
                }
            }
            break;
        }
        current = current.parentNode;
    }
    return null;
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
        ['div', 'span', 'small', 'i', 'b', 'p', 'a', 'object'].includes((node as ElementXML).tagName.toLowerCase())
    );

    if (hasHtmlContent) {
        // ✅ Use platform-independent serialization WITHOUT escaping
        /* In the browser, we could use:
        return xmlElement.innerHTML?.trim() || ''; */
        // return serializeXmlContent(xmlElement);
        return PLI.innerHTML(xmlElement) || '';
    } else {
        // Return plain text content
        return xmlElement.textContent?.trim() || '';
    }
}
