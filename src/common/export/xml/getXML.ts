/*!
 * CASCaDE Reference Implementation – native to CASCaRA XML Transformation
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaDE Reference Implementation – native to CASCaRA XML Transformation
 * -------------------------------------------------------------------
 * Authors: oskar.dungern@gfse.org
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * This module provides central CASCaRA XML helpers for the PIG metamodel classes.
 * For each supported type (APackage, AnEntity, ARelationship, and metamodel classes),
 * the static class `GetXML` offers methods that generate CASCaRA XML representations
 * of the respective instances.
 *
 * - Always returns valid XML strings.
 * - Error and status information is included in the output where appropriate.
 * - The logic is decoupled from the metamodel classes.
 *
 * Usage:
 *   import { getXML } from './getXML';
 *   const xml = getXML(item, options);
 *
 * Design Decisions:
 * - Combine all XML export logic in a single module for better maintainability.
 * - Use a class with static methods for better organization and extensibility.
 * - Follow the same pattern as getTTL and getJSONLD for consistency.
 * - For creating a CASCaRA XML representation call getXML(item, options) instead of item.getXML().
 *
 */

// import { DEF } from '../../lib/definitions';
import { LIB, LOG, ILanguageText, INamespace } from '../../lib/helpers';
import {
    TPigItem, PigItemType, PigItemTypeValue,
    AnEntity, APackage, ARelationship,
    Entity, Relationship, Property, Link, Enumeration,
    AProperty, ATargetLink, ASourceLink
} from '../../schema/pig/ts/pig-metaclasses';

export interface IOptionsXML {
    /** Indentation string (default: '\t' for tab) */
    indent?: string;
    /** Filter which item types to include in package graph (default: all, empty array means none which is obviously useless) */
    filterItemType?: PigItemTypeValue[];
}

/**
 * Generic CASCaRA XML export function that dispatches to the appropriate method based on itemType
 * @param item - Any PIG item (APackage, AnEntity, ARelationship, or metamodel classes)
 * @param options - XML export options
 * @returns CASCaRA XML representation as string
 *
 * @example
 * import { getXML } from './getXML';
 * const xml = getXML(item, { addItemTypes: true });
 */
export function getXML(item: TPigItem, options?: IOptionsXML): string {
    let result: string;
    // LOG.debug(`getXML called for itemType: ${item.itemType}, id: ${item.id}, options: ${JSON.stringify(options)}`);

    switch (item.itemType) {
        // Instances/Individuals
        case PigItemType.aPackage:
            result = GetXML.aPackage(item as APackage, options);
            break;
        case PigItemType.anEntity:
            result = GetXML.anEntity(item as AnEntity, options);
            break;
        case PigItemType.aRelationship:
            result = GetXML.aRelationship(item as ARelationship, options);
            break;

        // Metamodel Classes
        case PigItemType.Enumeration:
            result = GetXML.enumeration(item as Enumeration, options);
            break;
        case PigItemType.Property:
            result = GetXML.property(item as Property, options);
            break;
        case PigItemType.Link:
            result = GetXML.link(item as Link, options);
            break;
        case PigItemType.Entity:
            result = GetXML.entity(item as Entity, options);
            break;
        case PigItemType.Relationship:
            result = GetXML.relationship(item as Relationship, options);
            break;

        default:
            result = `<!-- Error: No XML representation implemented for itemType: ${item.itemType} -->\n`;
    }

    return result;
}

/**
 * Static class containing CASCaRA XML export methods for all PIG types
 */
class GetXML {

    /**
     * Export APackage to CASCaRA XML format
     * @param pkg - APackage instance
     * @param options - Export options
     * @returns XML representation with XML declaration, namespace declarations and graph items
     *
     * @example
     * <?xml version="1.0" encoding="UTF-8"?>
     * <cas:Package
     *     xmlns:cas="https://product-information-graph.org/ontology/2026-05-08/metamodel#"
     *     xmlns:dcterms="http://purl.org/dc/terms/"
     *     id="d:ACP-Very-Simple-Model-FMC-with-Requirements"
     *     cas:itemType="cas:aPackage">
     *
     *     <dcterms:title>Very Simple Model (FMC) with Requirements</dcterms:title>
     *     <dcterms:modified>2026-01-17T22:38:19.595Z</dcterms:modified>
     *     <dcterms:contributor cas:itemType="cas:aProperty">
     *         <value>mailto:oskar.dungern@gfse.org</value>
     *     </dcterms:contributor>
     *
     *     <graph>
     *         ...
     *     </graph>
     * </cas:Package>
     */
    static aPackage(pkg: APackage, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);

        let xml = '';
        xml += `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<cas:Package\n`;

        // Namespace declarations (xmlns:...)
        xml += this.xNamespaces(pkg, i1);

        // Item ID and itemType as attributes
        xml += `${i1}id="${pkg.id}"\n`;
        xml += `${i1}cas:itemType="cas:aPackage">\n\n`;

        // title (multi-language)
        if (LIB.isArrayWithContent(pkg.title)) {
            for (const t of pkg.title) {
                xml += this.xLanguageText(i1, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(pkg.description)) {
            for (const t of pkg.description) {
                xml += this.xLanguageText(i1, 'dcterms:description', t, true);
            }
        }

        // modified (ISO date string)
        if (pkg.modified) {
            xml += `${i1}<dcterms:modified>${pkg.modified}</dcterms:modified>\n`;
        }

        // hasProperty - configurable properties (e.g. dcterms:contributor, dcterms:license)
        if (LIB.isArrayWithContent(pkg.hasProperty)) {
            xml += this.xProperties(pkg.hasProperty, i1);
        }

        // hasTargetLink - configurable target links
        if (LIB.isArrayWithContent(pkg.hasTargetLink)) {
            xml += this.xLinks(pkg.hasTargetLink, i1);
        }

        xml += '\n';

        // Graph items (metamodel classes and instances)
        xml += this.xGraph(pkg, options?.filterItemType, i1, options);

        xml += `</cas:Package>\n`;
        return xml;
    }

    /**
     * Export AnEntity to CASCaRA XML format
     * @param itm - AnEntity instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <cas:Outline id="d:Folder-SystemModel" cas:itemType="cas:anEntity">
     *     <dcterms:modified>2020-03-06T08:32:00+01:00</dcterms:modified>
     *     <dcterms:title>System Model</dcterms:title>
     *     <cas:lists cas:itemType="cas:aTargetLink">
     *         <idRef>d:Diagram-aec0df7900010000017001eaf53e8876</idRef>
     *     </cas:lists>
     * </cas:Outline>
     */
    static anEntity(itm: AnEntity, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);

        const tag = itm.hasClass;
        let xml = '';
        xml += `${i1}<${tag} id="${itm.id}" cas:itemType="cas:anEntity">\n`;

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            for (const t of itm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            for (const t of itm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // modified (ISO date string)
        if (itm.modified) {
            xml += `${i2}<dcterms:modified>${itm.modified}</dcterms:modified>\n`;
        }

        // hasProperty - configurable properties
        if (LIB.isArrayWithContent(itm.hasProperty)) {
            xml += this.xProperties(itm.hasProperty, i2);
        }

        // hasTargetLink - configurable target links
        if (LIB.isArrayWithContent(itm.hasTargetLink)) {
            xml += this.xLinks(itm.hasTargetLink, i2);
        }

        xml += `${i1}</${tag}>\n`;
        return xml;
    }

    /**
     * Export ARelationship to CASCaRA XML format
     * @param itm - ARelationship instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <SpecIF:writes id="d:SWri-50fbfe8f0029b1a8016ea86245a9d83a-50feddc00029b1a8016e2872e78ecadc" cas:itemType="cas:aRelationship">
     *     <dcterms:modified>2020-03-06T09:05:00+01:00</dcterms:modified>
     *     <dcterms:description>'FiCo-Application' writes 'FiCo-Data'</dcterms:description>
     *     <SpecIF:writes-toSource cas:itemType="cas:aSourceLink">
     *         <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
     *     </SpecIF:writes-toSource>
     *     <SpecIF:writes-toTarget cas:itemType="cas:aTargetLink">
     *         <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
     *     </SpecIF:writes-toTarget>
     * </SpecIF:writes>
     */
    static aRelationship(itm: ARelationship, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);

        const tag = itm.hasClass;
        let xml = '';
        xml += `${i1}<${tag} id="${itm.id}" cas:itemType="cas:aRelationship">\n`;

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            for (const t of itm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            for (const t of itm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // modified (ISO date string)
        if (itm.modified) {
            xml += `${i2}<dcterms:modified>${itm.modified}</dcterms:modified>\n`;
        }

        // hasProperty - configurable properties
        if (LIB.isArrayWithContent(itm.hasProperty)) {
            xml += this.xProperties(itm.hasProperty, i2);
        }

        // hasSourceLink - configurable source links (exactly one, per schema)
        if (LIB.isArrayWithContent(itm.hasSourceLink)) {
            xml += this.xLinks(itm.hasSourceLink, i2);
        }

        // hasTargetLink - configurable target links
        if (LIB.isArrayWithContent(itm.hasTargetLink)) {
            xml += this.xLinks(itm.hasTargetLink, i2);
        }

        xml += `${i1}</${tag}>\n`;
        return xml;
    }

    /**
     * Export Enumeration (metamodel class) to CASCaRA XML format
     * @param enm - Enumeration instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <owl:Class id="SpecIF:Priority-Value" cas:itemType="cas:Enumeration">
     *     <dcterms:title xml:lang="en">Priority</dcterms:title>
     *     <skos:definition xml:lang="en">Enumerated values for the 'Priority' of the resource.</skos:definition>
     *     <dcterms:modified>2020-03-26T22:59:00+02:00</dcterms:modified>
     *     <cas:specializes>cas:Enumeration</cas:specializes>
     *     <xs:simpleType>
     *         <xs:restriction base="xs:string"/>
     *     </xs:simpleType>
     *     <cas:enumeratedValue id="SpecIF:priorityHigh">
     *         <dcterms:title xml:lang="en">high</dcterms:title>
     *     </cas:enumeratedValue>
     * </owl:Class>
     */
    static enumeration(enm: Enumeration, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);
        const i3 = indent.repeat(3);

        let xml = '';
        xml += `${i1}<owl:Class id="${enm.id}" cas:itemType="cas:Enumeration">\n`;

        // title (multi-language)
        if (LIB.isArrayWithContent(enm.title)) {
            for (const t of enm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(enm.description)) {
            for (const t of enm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(enm.definition)) {
            for (const t of enm.definition) {
                xml += this.xLanguageText(i2, 'skos:definition', t, true);
            }
        }

        // modified (ISO date string)
        if (enm.modified) {
            xml += `${i2}<dcterms:modified>${enm.modified}</dcterms:modified>\n`;
        }

        // specializes
        if (enm.specializes) {
            xml += `${i2}<cas:specializes>${enm.specializes}</cas:specializes>\n`;
        }

        // datatype -> xs:simpleType/xs:restriction
        if (enm.datatype) {
            xml += `${i2}<xs:simpleType>\n`;
            xml += `${i3}<xs:restriction base="${enm.datatype}"/>\n`;
            xml += `${i2}</xs:simpleType>\n`;
        }

        // enumeratedValue (mandatory array of allowed values)
        if (LIB.isArrayWithContent(enm.enumeratedValue)) {
            for (const val of enm.enumeratedValue) {
                xml += `${i2}<cas:enumeratedValue id="${val.id}">\n`;
                if (LIB.isArrayWithContent(val.title)) {
                    for (const t of val.title) {
                        xml += this.xLanguageText(i3, 'dcterms:title', t);
                    }
                }
                if (val.value !== undefined) {
                    xml += `${i3}<rdf:value>${this.escapeXmlText(val.value)}</rdf:value>\n`;
                }
                xml += `${i2}</cas:enumeratedValue>\n`;
            }
        }

        xml += `${i1}</owl:Class>\n`;
        return xml;
    }

    /**
     * Export Property metamodel class to CASCaRA XML format
     * @param itm - Property instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <owl:DatatypeProperty id="cas:Category" cas:itemType="cas:Property">
     *     <cas:specializes>cas:Property</cas:specializes>
     *     <dcterms:title>has category</dcterms:title>
     *     <skos:definition>Specifies a category for an element (entity, relationship or organizer).</skos:definition>
     *     <xs:simpleType>
     *         <xs:restriction base="xs:string">
     *             <xs:maxLength value="32"/>
     *             <xs:minOccurs>0</xs:minOccurs>
     *             <xs:maxOccurs>1</xs:maxOccurs>
     *         </xs:restriction>
     *     </xs:simpleType>
     * </owl:DatatypeProperty>
     */
    static property(itm: Property, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);
        const i3 = indent.repeat(3);

        let xml = '';
        xml += `${i1}<owl:DatatypeProperty id="${itm.id}" cas:itemType="cas:Property">\n`;

        // specializes
        if (itm.specializes) {
            xml += `${i2}<cas:specializes>${itm.specializes}</cas:specializes>\n`;
        }

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            for (const t of itm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            for (const t of itm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(itm.definition)) {
            for (const t of itm.definition) {
                xml += this.xLanguageText(i2, 'skos:definition', t, true);
            }
        }

        // modified (ISO date string)
        if (itm.modified) {
            xml += `${i2}<dcterms:modified>${itm.modified}</dcterms:modified>\n`;
        }

        // datatype restriction (maxLength, pattern, minInclusive, maxInclusive, minOccurs, maxOccurs)
        const hasRestrictionDetails = itm.maxLength !== undefined || itm.pattern !== undefined
            || itm.minInclusive !== undefined || itm.maxInclusive !== undefined
            || itm.minCount !== undefined || itm.maxCount !== undefined;

        if (itm.datatype) {
            xml += `${i2}<xs:simpleType>\n`;
            if (hasRestrictionDetails) {
                xml += `${i3}<xs:restriction base="${itm.datatype}">\n`;
                if (itm.maxLength !== undefined) {
                    xml += `${indent.repeat(4)}<xs:maxLength value="${itm.maxLength}"/>\n`;
                }
                if (itm.pattern !== undefined) {
                    xml += `${indent.repeat(4)}<xs:pattern value="${this.escapeXmlAttr(itm.pattern)}"/>\n`;
                }
                if (itm.minInclusive !== undefined) {
                    xml += `${indent.repeat(4)}<xs:minInclusive value="${itm.minInclusive}"/>\n`;
                }
                if (itm.maxInclusive !== undefined) {
                    xml += `${indent.repeat(4)}<xs:maxInclusive value="${itm.maxInclusive}"/>\n`;
                }
                if (itm.minCount !== undefined) {
                    xml += `${indent.repeat(4)}<xs:minOccurs>${itm.minCount}</xs:minOccurs>\n`;
                }
                if (itm.maxCount !== undefined) {
                    xml += `${indent.repeat(4)}<xs:maxOccurs>${itm.maxCount}</xs:maxOccurs>\n`;
                }
                xml += `${i3}</xs:restriction>\n`;
            } else {
                xml += `${i3}<xs:restriction base="${itm.datatype}"/>\n`;
            }
            xml += `${i2}</xs:simpleType>\n`;
        }

        // defaultValue (optional)
        if (itm.defaultValue !== undefined) {
            xml += `${i2}<cas:defaultValue>${this.escapeXmlText(itm.defaultValue)}</cas:defaultValue>\n`;
        }

        // readOnly (optional)
        if (itm.readOnly !== undefined) {
            xml += `${i2}<cas:readOnly>${itm.readOnly}</cas:readOnly>\n`;
        }

        // composes (references to other Properties)
        if (LIB.isArrayWithContent(itm.composes)) {
            for (const c of itm.composes) {
                xml += `${i2}<cas:composes>${this.escapeXmlText(c)}</cas:composes>\n`;
            }
        }

        xml += `${i1}</owl:DatatypeProperty>\n`;
        return xml;
    }

    /**
     * Export Link metamodel class to CASCaRA XML format
     * @param itm - Link instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <owl:ObjectProperty id="SpecIF:writes-toSource" cas:itemType="cas:Link">
     *     <cas:specializes>cas:linksSource</cas:specializes>
     *     <dcterms:title>SpecIF:writes to source</dcterms:title>
     *     <skos:definition>Connects the source of SpecIF:writes</skos:definition>
     *     <cas:enumeratedEndpoint>FMC:Actor</cas:enumeratedEndpoint>
     * </owl:ObjectProperty>
     */
    static link(itm: Link, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);

        let xml = '';
        xml += `${i1}<owl:ObjectProperty id="${itm.id}" cas:itemType="cas:Link">\n`;

        // specializes
        if (itm.specializes) {
            xml += `${i2}<cas:specializes>${itm.specializes}</cas:specializes>\n`;
        }

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            for (const t of itm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            for (const t of itm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(itm.definition)) {
            for (const t of itm.definition) {
                xml += this.xLanguageText(i2, 'skos:definition', t, true);
            }
        }

        // modified (ISO date string)
        if (itm.modified) {
            xml += `${i2}<dcterms:modified>${itm.modified}</dcterms:modified>\n`;
        }

        // enumeratedEndpoint (mandatory array of allowed Entity/Relationship class URIs)
        // Semantics: if the list is undefined/missing, ALL entity/relationship classes are eligible as
        // endpoints (no restriction) and the element is omitted entirely; if the list is defined but
        // empty, NO endpoints are allowed and an empty <cas:enumeratedEndpoint> wrapper is written;
        // otherwise each allowed Entity/Relationship class URI is written as a nested <idRef> child.
        if (Array.isArray(itm.enumeratedEndpoint)) {
            xml += `${i2}<cas:enumeratedEndpoint>\n`;
            for (const ep of itm.enumeratedEndpoint) {
                xml += `${indent.repeat(3)}<idRef>${this.escapeXmlText(ep)}</idRef>\n`;
            }
            xml += `${i2}</cas:enumeratedEndpoint>\n`;
        }

        // defaultValue (optional)
        if (itm.defaultValue !== undefined) {
            xml += `${i2}<cas:defaultValue>${this.escapeXmlText(itm.defaultValue)}</cas:defaultValue>\n`;
        }

        // readOnly (optional)
        if (itm.readOnly !== undefined) {
            xml += `${i2}<cas:readOnly>${itm.readOnly}</cas:readOnly>\n`;
        }

        // revisionAware (optional)
        if (itm.revisionAware !== undefined) {
            xml += `${i2}<cas:revisionAware>${itm.revisionAware}</cas:revisionAware>\n`;
        }

        // minCount / maxCount (optional)
        if (itm.minCount !== undefined) {
            xml += `${i2}<cas:minCount>${itm.minCount}</cas:minCount>\n`;
        }
        if (itm.maxCount !== undefined) {
            xml += `${i2}<cas:maxCount>${itm.maxCount}</cas:maxCount>\n`;
        }

        xml += `${i1}</owl:ObjectProperty>\n`;
        return xml;
    }

    /**
     * Export Entity metamodel class to CASCaRA XML format
     * @param itm - Entity instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <owl:Class id="cas:Root" cas:itemType="cas:Entity">
     *     <cas:specializes>cas:Organizer</cas:specializes>
     *     <dcterms:title>Hierarchy Root</dcterms:title>
     *     <skos:definition>A subclass of CASCaRA organizer serving as a root for hierarchically organized graph elements.</skos:definition>
     *     <cas:enumeratedTargetLink>cas:lists</cas:enumeratedTargetLink>
     * </owl:Class>
     */
    static entity(itm: Entity, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);

        let xml = '';
        xml += `${i1}<owl:Class id="${itm.id}" cas:itemType="cas:Entity">\n`;

        // specializes
        if (itm.specializes) {
            xml += `${i2}<cas:specializes>${itm.specializes}</cas:specializes>\n`;
        }

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            for (const t of itm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            for (const t of itm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(itm.definition)) {
            for (const t of itm.definition) {
                xml += this.xLanguageText(i2, 'skos:definition', t);
            }
        }

        // modified (ISO date string)
        if (itm.modified) {
            xml += `${i2}<dcterms:modified>${itm.modified}</dcterms:modified>\n`;
        }

        // icon (optional)
        if (itm.icon?.value) {
            xml += `${i2}<cas:icon>${this.escapeXmlText(itm.icon.value)}</cas:icon>\n`;
        }

        // enumeratedProperty (array of allowed Property class URIs)
        // Semantics: if the list is undefined/missing, ALL properties are eligible (no restriction) and
        // the element is omitted entirely; if the list is defined but empty, NO properties are allowed
        // and an empty <cas:enumeratedProperty> wrapper is written; otherwise each allowed Property URI
        // is written as a nested <idRef> child.
        if (Array.isArray(itm.enumeratedProperty)) {
            xml += `${i2}<cas:enumeratedProperty>\n`;
            for (const p of itm.enumeratedProperty) {
                xml += `${indent.repeat(3)}<idRef>${this.escapeXmlText(p)}</idRef>\n`;
            }
            xml += `${i2}</cas:enumeratedProperty>\n`;
        }

        // enumeratedTargetLink (array of allowed Link class URIs)
        // Semantics: if the list is undefined/missing, ALL target links are eligible (no restriction) and
        // the element is omitted entirely; if the list is defined but empty, NO target links are allowed
        // and an empty <cas:enumeratedTargetLink> wrapper is written; otherwise each allowed Link URI is
        // written as a nested <idRef> child.
        if (Array.isArray(itm.enumeratedTargetLink)) {
            xml += `${i2}<cas:enumeratedTargetLink>\n`;
            for (const l of itm.enumeratedTargetLink) {
                xml += `${indent.repeat(3)}<idRef>${this.escapeXmlText(l)}</idRef>\n`;
            }
            xml += `${i2}</cas:enumeratedTargetLink>\n`;
        }

        xml += `${i1}</owl:Class>\n`;
        return xml;
    }

    /**
     * Export Relationship metamodel class to CASCaRA XML format
     * @param itm - Relationship instance
     * @param options - Export options
     * @returns XML representation
     *
     * @example
     * <owl:Class id="SpecIF:writes" cas:itemType="cas:Relationship">
     *     <dcterms:title xml:lang="en">writes</dcterms:title>
     *     <dcterms:description xml:lang="en">A [[FMC:Actor]] 'writes' (changes) a [[FMC:State]].</dcterms:description>
     *     <cas:specializes>cas:Relationship</cas:specializes>
     *     <cas:enumeratedSourceLink>SpecIF:writes-toSource</cas:enumeratedSourceLink>
     *     <cas:enumeratedTargetLink>SpecIF:writes-toTarget</cas:enumeratedTargetLink>
     * </owl:Class>
     */
    static relationship(itm: Relationship, options?: IOptionsXML): string {
        const indent = options?.indent ?? '\t';
        const i1 = indent.repeat(1);
        const i2 = indent.repeat(2);

        let xml = '';
        xml += `${i1}<owl:Class id="${itm.id}" cas:itemType="cas:Relationship">\n`;

        // title (multi-language)
        if (LIB.isArrayWithContent(itm.title)) {
            for (const t of itm.title) {
                xml += this.xLanguageText(i2, 'dcterms:title', t);
            }
        }

        // description (multi-language)
        if (LIB.isArrayWithContent(itm.description)) {
            for (const t of itm.description) {
                xml += this.xLanguageText(i2, 'dcterms:description', t, true);
            }
        }

        // definition (multi-language)
        if (LIB.isArrayWithContent(itm.definition)) {
            for (const t of itm.definition) {
                xml += this.xLanguageText(i2, 'skos:definition', t);
            }
        }

        // specializes
        if (itm.specializes) {
            xml += `${i2}<cas:specializes>${itm.specializes}</cas:specializes>\n`;
        }

        // modified (ISO date string)
        if (itm.modified) {
            xml += `${i2}<dcterms:modified>${itm.modified}</dcterms:modified>\n`;
        }

        // icon (optional)
        if (itm.icon?.value) {
            xml += `${i2}<cas:icon>${this.escapeXmlText(itm.icon.value)}</cas:icon>\n`;
        }

        // enumeratedProperty (array of allowed Property class URIs)
        // Semantics: if the list is undefined/missing, ALL properties are eligible (no restriction) and
        // the element is omitted entirely; if the list is defined but empty, NO properties are allowed
        // and an empty <cas:enumeratedProperty> wrapper is written; otherwise each allowed Property URI
        // is written as a nested <idRef> child.
        if (Array.isArray(itm.enumeratedProperty)) {
            xml += `${i2}<cas:enumeratedProperty>\n`;
            for (const p of itm.enumeratedProperty) {
                xml += `${indent.repeat(3)}<idRef>${this.escapeXmlText(p)}</idRef>\n`;
            }
            xml += `${i2}</cas:enumeratedProperty>\n`;
        }

        // enumeratedSourceLink (array of allowed Link class URIs, exactly one per schema if present)
        // Semantics: if the list is undefined/missing, ALL source links are eligible (no restriction) and
        // the element is omitted entirely; if the list is defined but empty, NO source links are allowed
        // and an empty <cas:enumeratedSourceLink> wrapper is written; otherwise each allowed Link URI is
        // written as a nested <idRef> child.
        if (Array.isArray(itm.enumeratedSourceLink)) {
            xml += `${i2}<cas:enumeratedSourceLink>\n`;
            for (const l of itm.enumeratedSourceLink) {
                xml += `${indent.repeat(3)}<idRef>${this.escapeXmlText(l)}</idRef>\n`;
            }
            xml += `${i2}</cas:enumeratedSourceLink>\n`;
        }

        // enumeratedTargetLink (array of allowed Link class URIs)
        // Semantics: if the list is undefined/missing, ALL target links are eligible (no restriction) and
        // the element is omitted entirely; if the list is defined but empty, NO target links are allowed
        // and an empty <cas:enumeratedTargetLink> wrapper is written; otherwise each allowed Link URI is
        // written as a nested <idRef> child.
        if (Array.isArray(itm.enumeratedTargetLink)) {
            xml += `${i2}<cas:enumeratedTargetLink>\n`;
            for (const l of itm.enumeratedTargetLink) {
                xml += `${indent.repeat(3)}<idRef>${this.escapeXmlText(l)}</idRef>\n`;
            }
            xml += `${i2}</cas:enumeratedTargetLink>\n`;
        }

        xml += `${i1}</owl:Class>\n`;
        return xml;
    }

    /**
     * Build a single multi-language XML element, e.g. <dcterms:title xml:lang="en">Priority</dcterms:title>
     * @param indent - Indentation string to prefix the element with
     * @param tag - Fully qualified XML tag name (including namespace prefix)
     * @param text - Language text (value and optional lang)
     * @param allowHtml - If true, the value is embedded as-is (e.g. XHTML markup as seen for
     *        dcterms:description in the reference schema) instead of being XML-escaped
     * @returns Single-line XML element string terminated with a newline
     */
    private static xLanguageText(indent: string, tag: string, text: ILanguageText, allowHtml = false): string {
        const langAttr = text.lang ? ` xml:lang="${this.escapeXmlAttr(text.lang)}"` : '';
        const content = allowHtml ? text.value : this.escapeXmlText(text.value);
        return `${indent}<${tag}${langAttr}>${content}</${tag}>\n`;
    }

    /**
     * Build xmlns:... namespace declarations from the package context
     * @param pkg - APackage instance
     * @param indent - Indentation string to prefix each declaration with
     * @returns Namespace declarations, one per line, terminated with a newline each
     *
     * Internal format: context = [{ tag: "cas:", uri: "https://..." }, ...]
     * XML format:      xmlns:cas="https://..."
     */
    private static xNamespaces(pkg: APackage, indent: string): string {
        const ctx = pkg.context;
        let xml = '';

        if (!ctx || !Array.isArray(ctx)) {
            LOG.warn(`APackage ${pkg.id} has no valid context`);
            return xml;
        }

        for (const ns of ctx as INamespace[]) {
            if (!ns || typeof ns !== 'object' || Array.isArray(ns)) {
                continue;
            }
            if (!('tag' in ns) || !('uri' in ns)) {
                continue;
            }

            const tag = ns.tag.endsWith(':') ? ns.tag.slice(0, -1) : ns.tag;
            const uri = ns.uri;

            if (typeof tag === 'string' && typeof uri === 'string') {
                xml += `${indent}xmlns:${tag}="${this.escapeXmlAttr(uri)}"\n`;
            }
        }

        return xml;
    }

    /**
     * Build XML elements for configurable properties (hasProperty), e.g.
     * <dcterms:contributor cas:itemType="cas:aProperty">
     *     <value>mailto:oskar.dungern@gfse.org</value>
     * </dcterms:contributor>
     * Properties sharing the same tag (property name) are grouped into a single element
     * with multiple <value> children, rather than emitting one element per property.
     * @param props - Array of AProperty instances
     * @param indent - Indentation string for the outer element
     * @returns XML representation of all configurable properties
     */
    private static xProperties(props: AProperty[], indent: string): string {
        let xml = '';
        const inner = indent + '\t';

        // group properties by tag, preserving first-seen order
        const groups = new Map<string, AProperty[]>();
        for (const p of props) {
            const tag = p.hasClass;
            if (!groups.has(tag)) {
                groups.set(tag, []);
            }
            groups.get(tag)!.push(p);
        }

        for (const [tag, group] of groups) {
            xml += `${indent}<${tag} cas:itemType="cas:aProperty">\n`;
            for (const p of group) {
                if (p.value !== undefined) {
                    // Property values may contain embedded HTML/XHTML markup (e.g. cas:Diagram, rich text
                    // fields); such markup is written as-is, consistent with dcterms:description handling.
                    xml += `${inner}<value>${p.value}</value>\n`;
                }
                // @ToDo: composed properties (p.composes) are not yet supported, see issue #112.
            }
            xml += `${indent}</${tag}>\n`;
        }

        return xml;
    }

    /**
     * Build XML elements for configurable links (hasSourceLink, hasTargetLink), e.g.
     * <cas:lists cas:itemType="cas:aTargetLink">
     *     <idRef>d:MEl-50fbfe8f0029b1a8016ea86245a9d83a</idRef>
     *     <idRef>d:MEl-50feddc00029b1a8016e2872e78ecadc</idRef>
     * </cas:lists>
     * Links sharing the same tag (property name) are grouped into a single element
     * with multiple <idRef> children, rather than emitting one element per link.
     * @param links - Array of ASourceLink or ATargetLink instances
     * @param indent - Indentation string for the outer element
     * @returns XML representation of all configurable links
     */
    private static xLinks(links: (ASourceLink | ATargetLink)[], indent: string): string {
        let xml = '';
        const inner = indent + '\t';

        // group links by tag, preserving first-seen order
        const groups = new Map<string, (ASourceLink | ATargetLink)[]>();
        for (const l of links) {
            const tag = l.hasClass;
            if (!groups.has(tag)) {
                groups.set(tag, []);
            }
            groups.get(tag)!.push(l);
        }

        for (const [tag, group] of groups) {
            const itemTypeAttr = group[0].itemType === PigItemType.aSourceLink ? 'cas:aSourceLink' : 'cas:aTargetLink';
            xml += `${indent}<${tag} cas:itemType="${itemTypeAttr}">\n`;
            for (const l of group) {
                xml += `${inner}<idRef>${this.escapeXmlText(l.idRef)}</idRef>\n`;
            }
            xml += `${indent}</${tag}>\n`;
        }

        return xml;
    }

    /**
     * Transform graph items (metamodel classes and instances) to CASCaRA XML format
     * @param pkg - APackage instance
     * @param filterTypes - Optional filter for item types
     * @param indent - Indentation string for the <graph> wrapper element
     * @param options - Export options passed through to getXML() for each graph item
     * @returns XML representation of all graph items, wrapped in a <graph> element
     */
    private static xGraph(
        pkg: APackage,
        filterTypes: PigItemTypeValue[] | undefined,
        indent: string,
        options?: IOptionsXML
    ): string {
        const graph = pkg.graph;

        if (!graph || !Array.isArray(graph) || graph.length === 0) {
            return '';
        }

        let xml = `${indent}<graph>\n`;

        const items = filterTypes
            ? graph.filter(item => filterTypes.includes(item.itemType))
            : graph;

        for (const item of items) {
            xml += getXML(item, options);
        }

        xml += `${indent}</graph>\n`;
        return xml;
    }

    /**
     * Escape special characters for use as XML element text content
     * @param value - Raw text
     * @returns Escaped text safe for XML element content
     */
    private static escapeXmlText(value: string): string {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Escape special characters for use as an XML attribute value
     * @param value - Raw text
     * @returns Escaped text safe for XML attribute content
     */
    private static escapeXmlAttr(value: string): string {
        return this.escapeXmlText(value)
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
