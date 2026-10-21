/*!
 * CASCaDE Reference Implementation – HTML Export Helpers
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaDE Reference Implementation – HTML Export Helpers
 * ------------------------------------------------------
 * Authors: oskar.dungern@gfse.org
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 * This module provides central HTML helpers for the PIG metamodel classes.
 * For each supported type (APackage, AnEntity, ARelationship), the static
 * class `GetHTML` offers methods that generate HTML representations
 * of the respective instances.
 *
 * - Always returns valid HTML snippets (string or string[]).
 * - Error and status information is included in the HTML output.
 * - Output supports localization and multi-language fields.
 * - The logic is decoupled from the metamodel classes.
 *
 * Usage:
 *   import { GetHTML } from './getHTML';
 *   const html = GetHTML.anEntity(entity, options);
 *
 * Design Decisions:
 * - Combine all HTML export logic in a single module for better maintainability.
 * - Use a class with static methods for better organization and extensibility.
 * - In earlier versions there were individual methods getHTML for each itemType in the metaclasses.
 *   These have been calling the static methods in this module.
 *   However, to avoid a dependency of pig-metaclasses to this module, the getHTML methods have been removed.
 *   Now, for creating an HTML representation call getHTML(item,options) instead of item.getHTML(options).
 * - The HTML output is designed to be inserted into a web page, e.g. via v-html in Vue.js.
 * - The HTML output is sanitized to prevent XSS and other security issues.
 * - getHTML is synchronous and returns HTML containing lightweight image
 *   placeholders; resolveAssetImagesInHtml() is asynchronous and resolves those
 *   placeholders to inline images (data: URLs / inline <svg>) within the HTML
 *   *string* itself, before the result is ever inserted into the DOM.
 */


import { RE } from '../../lib/definitions';
import { PigItemType, PigItemTypeValue, PigItem, AnEntity, APackage, ARelationship, IAProperty, TPigAnElement, TPigItem, TPigClass, Enumeration, Property, Link, Entity, Relationship } from '../../schema/pig/ts/pig-metaclasses';
import { tagIETF, ILanguageText, LIB, MultiLanguageText } from '../../lib/helpers';
import { LOG } from '../../lib/messages';
import { PLI } from '../../lib/platform-independence';

/**
 * Render a multi-language text as repeated <dt>/<dd> pairs, one per language.
 * The language tag is appended in brackets to the label when present,
 * e.g. "title (de)".
 *
 * Not currently used by the single-language rendering below, but kept for
 * later use (e.g. a future "show all languages" mode in PageOntology).
 */
export function multiLangDtDd(label: string, texts: ILanguageText[], stripHtmlFlag = false): string {
    return texts.map(t => {
        const text = stripHtmlFlag ? LIB.stripHTML(t.value) : t.value;
        const lbl = t.lang ? `${label} (${t.lang})` : label;
        return `<dt>${passify(lbl)}</dt><dd>${passify(text)}</dd>`;
    }).join('');
}

/**
 * Render a multi-language text as repeated heading/block elements (e.g. <h3>/<div>),
 * one per language, with the language tag shown as a small badge when present.
 *
 * Not currently used by the single-language rendering below, but kept for
 * later use (e.g. a future "show all languages" mode in PageOntology).
 */
export function multiLangBlock(tag: string, cssClass: string, texts: ILanguageText[], stripHtmlFlag = false): string {
    return texts.map(t => {
        const text = stripHtmlFlag ? LIB.stripHTML(t.value) : t.value;
        const langBadge = t.lang ? ` <span class="meta-lang">(${t.lang})</span>` : '';
        return `<${tag} class="${cssClass}">${passify(text)}${langBadge}</${tag}>`;
    }).join('');
}

export type stringHTML = string;  // contains HTML code
export interface IOptionsHTML {
    widthMain?: string;
    itemType?: PigItemTypeValue[];
    lang?: tagIETF;
}

/**
 * Generic HTML export function that dispatches to the appropriate method based on itemType
 * @param item - Any PIG item (APackage, AnEntity, ARelationship)
 * @param options - HTML export options
 * @returns HTML representation as array of HTML strings
 * 
 * @example
 * import { getHTML } from './getHTML';
 * const html = getHTML(item, options);
 */
export function getHTML(item: TPigItem, options?: IOptionsHTML): stringHTML[] {
    switch (item.itemType) {
        case PigItemType.aPackage:
            return GetHTML.aPackage(item as APackage, options);
        case PigItemType.anEntity:
            return [GetHTML.anEntity(item as AnEntity, options)];
        case PigItemType.aRelationship:
            return [GetHTML.aRelationship(item as ARelationship, options)];
        case PigItemType.Enumeration:
        case PigItemType.Property:
        case PigItemType.Link:
        case PigItemType.Entity:
        case PigItemType.Relationship:
            return [GetHTML.cascaraType(item as TPigClass, options)];
        default:
            return [`<div class="meta-error">
                    ${item.id}: No HTML representation for itemType: ${item.itemType}
                </div>`];
    }
}

class GetHTML {
    static aPackage(pkg: APackage, options?: IOptionsHTML): stringHTML[] {
        // Extract language preference from options, default to 'en-US'
        const lang = options?.lang ?? 'en-US';
        const widthMain = options?.widthMain ?? '67%';
        const includeItemTypes = options?.itemType ?? [PigItemType.anEntity];
        const pkgSt = pkg.status();

        // 1. Package metadata as first element with localization
        const errHTML: stringHTML = pkgSt.ok ? ''
              : `<div class="meta-error">
                    Invalid aPackage - status: (${pkgSt.status}) ${pkgSt.statusText ?? ''}
                </div>`;

        const pkgTitleText = passify(LIB.stripHTML(new MultiLanguageText(pkg.title).get(lang)));
        const pkgDescText = passify(new MultiLanguageText(pkg.description).get(lang));
        const titleHTML = pkgTitleText
            ? `<h3 class="meta-title">${pkgTitleText}</h3>`
            : '<h3 class="meta-title">Untitled Package</h3>';
        const descHTML = pkgDescText
            ? `<div class="meta-description">${pkgDescText}</div>`
            : '';
        const { propertiesHTML, diagramHTML } = propertiesToHTML(pkg, lang);

        const pkgHTML = `<div class="meta-aPackage">
                <div class="col-main" style="flex: 0 0 ${widthMain};">
                    ${titleHTML}
                    ${descHTML}
                    ${diagramHTML}
                    ${errHTML}
                </div>
                <div class="col-right" ><dl class="dl-horizontal">
                    ${propertiesHTML}
                    <dt>Items in Graph</dt><dd>${pkg.graph.length}</dd>
                </dl></div>
            </div>`;

        const result: stringHTML[] = [pkgHTML];

        // 2. Graph items - filter by type
        for (const item of pkg.graph) {
            if (includeItemTypes.includes(item.itemType)) {
                // call directly the helper function instead of the getHTML method of the item:
                result.push(GetHTML.anEntity(item as AnEntity, options));
            }
        }

        return result;
    }

    static anEntity(entity: AnEntity, options?: IOptionsHTML): stringHTML {
        const enSt = entity.status();
        if (!enSt.ok) {
            return `<div class="meta-error">
                    Invalid anEntity with id ${entity.id} - status: (${enSt.status}) ${enSt.statusText ?? ''}
                </div>`;
        }
        const lang = options?.lang || 'en-US';
        const widthMain = options?.widthMain || '67%';

        const titleText = passify(LIB.stripHTML(new MultiLanguageText(entity.title).get(lang)));
        const descText = passify(new MultiLanguageText(entity.description).get(lang));
    /*
        const titleHTML = entity.title?.length ? multiLangBlock('h3', 'meta-title', entity.title, true) : '';
        const descHTML = entity.description?.length ? multiLangBlock('div', 'meta-description', entity.description) : '';
    */
        const { propertiesHTML, diagramHTML } = propertiesToHTML(entity, lang);

        return `<div class="meta-anEntity">
                    <div class="col-main" style="flex: 0 0 ${widthMain};">
                        ${titleText ? `<h3 class="meta-title">${titleText}</h3>` : ''}
                        ${descText ? `<div class="meta-description">${descText}</div>` : ''}
                        ${diagramHTML}
                    </div>
                    <div class="col-right" ><dl class="dl-horizontal">
                        ${propertiesHTML}
                    </dl></div>
                </div>`;
    }

    static aRelationship(rel: ARelationship, options?: IOptionsHTML): stringHTML {
        // dummy operation to use options and avoid "unused variable" warning - to be removed when implementation is done
        if (options?.itemType) return '';
        const relSt = rel.status();
        if (!relSt.ok) {
            return `<div class="meta-error">
                    Invalid aRelationship with id ${rel.id} - status: (${relSt.status}) ${relSt.statusText ?? ''}
                </div>`;
        }
        // @ToDo: Implementiere eine HTML-Repräsentation für ARelationship
        return '<div class="meta-not-implemented">HTML export for Relationship not implemented</div>';
    }

    /**
     * HTML representation of a CASCaRA Type (metaclass): Enumeration, Property,
     * Link, Entity or Relationship. Shown as a single two-column property list
     * (dt/dd), with all generic fields (id, title, description, definition,
     * modified, creator, ...) plus the type-specific fields, for use in e.g.
     * PageOntology.
     */
    static cascaraType(cls: TPigClass, options?: IOptionsHTML): stringHTML {
        const clsSt = cls.status();
        if (!clsSt.ok) {
            return `<div class="meta-error">
                    Invalid ${cls.itemType} with id ${cls.id} - status: (${clsSt.status}) ${clsSt.statusText ?? ''}
                </div>`;
        }
        const lang = options?.lang || 'en-US';

        const EMPTY = '—';
        const idList = (ids?: string[]): string => (ids && ids.length > 0) ? ids.map(e => passify(e)).join(', ') : EMPTY;

        let propertiesHTML = '';
        propertiesHTML += `<dt>Item Type</dt><dd>${cls.itemType}</dd>`;
        propertiesHTML += `<dt>ID</dt><dd>${passify(cls.id)}</dd>`;
        const clsTitleText = passify(LIB.stripHTML(new MultiLanguageText(cls.title).get(lang)));
        const clsDescText = passify(new MultiLanguageText(cls.description).get(lang));
        const clsDefText = passify(new MultiLanguageText(cls.definition).get(lang));
        propertiesHTML += `<dt>Title</dt><dd>${clsTitleText || EMPTY}</dd>`;
        propertiesHTML += `<dt>Description</dt><dd>${clsDescText || EMPTY}</dd>`;
        propertiesHTML += `<dt>Definition</dt><dd>${clsDefText || EMPTY}</dd>`;
        propertiesHTML += `<dt>Specializes</dt><dd>${cls.specializes ? passify(cls.specializes) : EMPTY}</dd>`;
        // Enumerated Property, Icon and Color are only defined on classes derived from Element (Enumeration, Entity, Relationship):
        if ('enumeratedProperty' in cls) {
            const element = cls as unknown as { enumeratedProperty?: string[], icon?: { value: string }, color?: { value: string } };
            propertiesHTML += `<dt>Enumerated Property</dt><dd>${idList(element.enumeratedProperty)}</dd>`;
            propertiesHTML += `<dt>Icon</dt><dd>${element.icon ? passify(element.icon.value) : EMPTY}</dd>`;
            propertiesHTML += `<dt>Color</dt><dd>${element.color ? passify(element.color.value) : EMPTY}</dd>`;
        }

        switch (cls.itemType) {
            case PigItemType.Enumeration: {
                const enumeration = cls as Enumeration;
                propertiesHTML += `<dt>Datatype</dt><dd>${passify(enumeration.datatype ?? EMPTY)}</dd>`;
                const values = (enumeration.enumeratedValue ?? [])
                    .map(v => passify(new MultiLanguageText(v.title).get(lang) || v.value || ''))
                    .join(', ');
                propertiesHTML += `<dt>Enumerated Values</dt><dd>${values || EMPTY}</dd>`;
                break;
            }
            case PigItemType.Property: {
                const property = cls as Property;
                propertiesHTML += `<dt>Datatype</dt><dd>${passify(property.datatype ?? EMPTY)}</dd>`;
                propertiesHTML += `<dt>Read Only</dt><dd>${!!property.readOnly}</dd>`;
                propertiesHTML += `<dt>Min Count</dt><dd>${property.minCount ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Max Count</dt><dd>${property.maxCount ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Max Length</dt><dd>${property.maxLength ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Pattern</dt><dd>${property.pattern ? passify(property.pattern) : EMPTY}</dd>`;
                propertiesHTML += `<dt>Min Inclusive</dt><dd>${property.minInclusive ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Max Inclusive</dt><dd>${property.maxInclusive ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Default Value</dt><dd>${property.defaultValue !== undefined ? passify(property.defaultValue) : EMPTY}</dd>`;
                break;
            }
            case PigItemType.Link: {
                const link = cls as Link;
                propertiesHTML += `<dt>Enumerated Endpoints</dt><dd>${idList(link.enumeratedEndpoint)}</dd>`;
                propertiesHTML += `<dt>Read Only</dt><dd>${!!link.readOnly}</dd>`;
                propertiesHTML += `<dt>Revision Aware</dt><dd>${!!link.revisionAware}</dd>`;
                propertiesHTML += `<dt>Min Count</dt><dd>${link.minCount ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Max Count</dt><dd>${link.maxCount ?? EMPTY}</dd>`;
                propertiesHTML += `<dt>Default Value</dt><dd>${link.defaultValue !== undefined ? passify(link.defaultValue) : EMPTY}</dd>`;
                break;
            }
            case PigItemType.Entity: {
                const entity = cls as Entity;
                propertiesHTML += `<dt>Enumerated Target Links</dt><dd>${idList(entity.enumeratedTargetLink)}</dd>`;
                break;
            }
            case PigItemType.Relationship: {
                const rel = cls as Relationship;
                propertiesHTML += `<dt>Enumerated Source Links</dt><dd>${idList(rel.enumeratedSourceLink)}</dd>`;
                propertiesHTML += `<dt>Enumerated Target Links</dt><dd>${idList(rel.enumeratedTargetLink)}</dd>`;
                break;
            }
        }

        propertiesHTML += `<dt>Modified</dt><dd>${cls.modified ? LIB.getLocalDate(cls.modified, lang) : EMPTY}</dd>`;
        propertiesHTML += `<dt>Creator</dt><dd>${cls.creator ? passify(cls.creator) : EMPTY}</dd>`;
        propertiesHTML += `<dt>Revision</dt><dd>${cls.revision ? passify(cls.revision) : EMPTY}</dd>`;
        propertiesHTML += `<dt>Prior Revision</dt><dd>${idList(cls.priorRevision as unknown as string[])}</dd>`;

        return `<div class="meta-cascara-type">
                    <dl class="dl-cascara-type">
                        ${propertiesHTML}
                    </dl>
                </div>`;
    }
}

/**
 * Sanitize HTML by removing dangerous elements and attributes that could execute code
 * Preserves safe XHTML formatting (p, div, span, strong, em, etc.)
 * Preserves <object> tags ONLY for safe media types (image/*, video/*, audio/*)
 * Allows data: URLs ONLY for safe image types in <img> tags
 * Removes: <script>, <style>, <embed>, <iframe>, <link>, <meta>, <form>
 * Removes: <object> with dangerous MIME types (application/x-shockwave-flash, etc.)
 * Removes: All event handler attributes (onclick, onerror, onload, etc.)
 * Removes: javascript: protocols and unsafe data: URLs
 * 
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string safe for rendering, preserving XHTML structure and safe media
 * 
 * @example
 * const unsafe = '<p onclick="alert(1)">Text</p><script>alert(2)</script>';
 * const safe = passify(unsafe);
 * // Returns: '<p>Text</p>'
 * 
 * @example
 * const media = '<object data="image.png" type="image/png">Image</object>';
 * const safe = passify(media);
 * // Returns: '<object data="image.png" type="image/png">Image</object>'
 * 
 * @example
 * const safeDataUrl = '<img src="data:image/png;base64,iVBORw0KG...">';
 * const safe = passify(safeDataUrl);
 * // Returns: '<img src="data:image/png;base64,iVBORw0KG...">' (preserved)
 * 
 * @example
 * const unsafeDataUrl = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
 * const safe = passify(unsafeDataUrl);
 * // Returns: '<img src="#">' (blocked)
 */
function passify(html: string): string {
    if (!html || typeof html !== 'string') return '';

    let passified = insertAssetPlaceholders(html);

    // 1. Process <object> tags - keep only safe media types
    const safeMediaTypes = new Set([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        // 'image/svg+xml', ... not considered safe due to potential script content
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/ogg',
        'audio/mpeg',
        'audio/mp3',
        'audio/ogg',
        'audio/wav',
        'audio/webm'
    ]);

    // Match all <object> tags with their attributes and content
    // const objectRegex = /<object([^>]*)>(.*?)<\/object>/gis;  ... did not work with es2020 even though it should, so we use [\s\S]*? instead of .*?
    const objectRegex = /<object([^>]*)>([\s\S]*?)<\/object>/gi;
    passified = passified.replace(objectRegex, (match, attributes, content) => {
        // Extract type attribute
        const typeMatch = attributes.match(/type\s*=\s*["']([^"']+)["']/i);
        const mimeType = typeMatch ? typeMatch[1].toLowerCase() : '';

        // Check if MIME type is safe
        if (safeMediaTypes.has(mimeType)) {
            // Keep the object tag, but sanitize attributes
            let sanitizedAttrs = attributes;

            // Remove event handlers from attributes
            sanitizedAttrs = sanitizedAttrs.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

            // Remove dangerous protocols from data attribute
            sanitizedAttrs = sanitizedAttrs.replace(/\s+data\s*=\s*["']\s*(javascript|data):[^"']*["']/gi, ' data="#"');

            return `<object${sanitizedAttrs}>${content}</object>`;
        }

        // Remove unsafe object tag
        return '';
    });

    // 2. Remove dangerous tags including their content
    const dangerousTags = [
        'script',
        'style',
        'embed',
        'iframe',
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

    // 3. Remove event handler attributes (onXYZ="...")
    // Matches on followed by word characters, capturing until the closing quote
    passified = passified.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');

    // 4. Handle data: URLs and other dangerous protocols
    // Safe data: URL types for images only
    const safeDataUrlTypes = new Set([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/gif',
        'image/webp',
        'image/svg+xml'  // Safe in <img> tags only
    ]);

    // Process src and href attributes
    passified = passified.replace(/\s+(href|src)\s*=\s*["']([^"']*)["']/gi, (match, attr, url) => {
        const trimmedUrl = url.trim();

        // Block javascript: protocol
        if (trimmedUrl.toLowerCase().startsWith('javascript:')) {
            return ` ${attr}="#"`;
        }

        // Handle data: URLs
        if (trimmedUrl.toLowerCase().startsWith('data:')) {
            // Extract MIME type from data URL
            const dataUrlMatch = trimmedUrl.match(/^data:([^;,]+)/i);
            const mimeType = dataUrlMatch ? dataUrlMatch[1].toLowerCase() : '';

            // Allow only safe image data URLs in src attributes
            if (attr.toLowerCase() === 'src' && safeDataUrlTypes.has(mimeType)) {
                return match; // Keep safe data URL
            }

            // Block all other data URLs (including SVG which can contain scripts)
            return ` ${attr}="#"`;
        }

        // Keep safe URLs (http, https, relative paths, anchors)
        return match;
    });

    // 5. Remove dangerous attributes
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
 * Convert metadata of a PIG element to HTML representation
 * - the caller must provide a frame <div><dl>...</dl></div>
 * @param item - PIG instance
 * @param lang - Language tag for localization
 * @returns HTML string representing the metadata
 */
function metadataToHTML(item: TPigAnElement, lang: tagIETF): string {
    return `<dt>Item Type</dt><dd>${item.itemType}</dd>`
                + `<dt>ID</dt><dd>${item.id}</dd>`
                + `<dt>Class</dt><dd>${passify(item.instanceOf || '—')}</dd>`
                + (item.modified ? `<dt>Modified</dt><dd>${LIB.getLocalDate(item.modified, lang)}</dd>` : '')
                + (item.creator ? `<dt>Creator</dt><dd>${passify(item.creator)}</dd>` : '')
                + (item.revision && item.revision.length > 0 ? `<dt>Revision</dt><dd>${passify(item.revision)}</dd>` : '')
                + (item.priorRevision && item.priorRevision.length > 0 ? `<dt>Prior Revisions</dt><dd>${item.priorRevision.map((r: string) => passify(r)).join(', ')}</dd>` : '');
}

function propertiesToHTML(el: TPigAnElement, lang: tagIETF): { propertiesHTML: string; diagramHTML: string } {
    let propertiesHTML = '';
    let diagramHTML = '';
    if (el.hasProperty?.length > 0) {
        // the configured properties:
        for (const prop of el.hasProperty) {
            const propData = prop.get() as IAProperty;
            if (propData && propData.instanceOf) {
                const propClass = passify(propData.instanceOf);
                if (MultiLanguageText.isValid(propData.value)) {
                    // Configurable property with datatype 'string': render a single
                    // language, following the built-in fall-back logic (same as all
                    // other MultiLanguageText fields):
                    const propText = passify(new MultiLanguageText(propData.value).get(lang));
                    if (propData.instanceOf === 'cas:Diagram') {
                        diagramHTML += `<div class="meta-diagram">${propText}</div>`;
                        continue;
                    }
                    propertiesHTML += `<dt>${propClass}</dt><dd>${propText}</dd>`;
                } else {
                    const propValue = passify((propData.value) as unknown as string);
                    if (propData.instanceOf === 'cas:Diagram') {
                        // Diagrams belong in the main pane, alongside title/description,
                        // rather than the metadata list on the right; omit the class/name:
                        diagramHTML += `<div class="meta-diagram">${propValue}</div>`;
                        continue;
                    }
                    propertiesHTML += `<dt>${propClass}</dt><dd>${propValue}</dd>`;
                }
            }
        }
    }
    propertiesHTML += metadataToHTML(el, lang);
    return { propertiesHTML, diagramHTML };
}

// Displayable raster/vector image extensions handled by resolveAssetImagesInHtml():
const DISPLAYABLE_IMAGE_EXT = /\.(png|jpe?g|gif|svg)(?:[?#].*)?$/i;
// Marker class applied to <img> placeholders, so resolveAssetImagesInHtml() can find
// and replace them again once getHTML()/passify() has produced the full HTML string:
export const PENDING_ASSET_CLASS = 'asset-pending';

function escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Replace <img src="..."> and <object data="..." type="image/...">...</object>
 * references to displayable image files (png, jpg, jpeg, svg) with a placeholder
 * <img> element carrying the original reference in a 'data-asset-ref' attribute.
 * The placeholder is later resolved - still as a string, before anything is
 * inserted into the DOM - by resolveAssetImagesInHtml(). This keeps
 * getHTML()/passify() fully synchronous.
 *
 * @param html - HTML string potentially containing <img>/<object> image references
 * @returns HTML string with displayable image references replaced by placeholders
 */
function insertAssetPlaceholders(html: string): string {
    let result = html;

    // <object data="ref" type="image/...">content</object> -> placeholder <img>
    result = result.replace(RE.tagSingleObject, (match, before, ref, after, content) => {
        const attrs = `${before} ${after}`;
        const typeMatch = attrs.match(/type\s*=\s*["']([^"']+)["']/i);
        const mimeType = typeMatch ? typeMatch[1].toLowerCase() : '';
        const isImageType = mimeType.startsWith('image/');
        if (!isImageType && !DISPLAYABLE_IMAGE_EXT.test(ref)) {
            return match; // leave for normal object handling
        }
        if (!DISPLAYABLE_IMAGE_EXT.test(ref) && !['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'].includes(mimeType)) {
            return match; // not a displayable image type, leave for normal object handling
        }
        const alt = escapeAttr(String(content).trim().slice(0, 200) || ref);
        return `<img class="${PENDING_ASSET_CLASS}" data-asset-ref="${escapeAttr(ref)}" alt="${alt}">`;
    });

    // <img src="ref" ...> -> placeholder <img> (skip refs already pointing to a data: URL)
    result = result.replace(RE.tagImg, (match, before, ref, after) => {
        if (/^data:/i.test(ref)) return match; // already inline, leave as-is
        if (!DISPLAYABLE_IMAGE_EXT.test(ref)) return match; // not a recognized displayable image extension
        const attrs = `${before} ${after}`;
        const altMatch = attrs.match(/alt\s*=\s*["']([^"']*)["']/i);
        const alt = escapeAttr(altMatch ? altMatch[1] : ref);
        return `<img class="${PENDING_ASSET_CLASS}" data-asset-ref="${escapeAttr(ref)}" alt="${alt}">`;
    });

    return result;
}

/**
 * Resolve all pending image placeholders (see insertAssetPlaceholders()) found in
 * an HTML *string* and return the resulting HTML string with images fully inlined.
 * Meant to be called once on the HTML produced by getHTML()/GetHTML.*, BEFORE it
 * is inserted into the DOM (e.g. via v-html) - as opposed to resolving placeholders
 * after insertion, this avoids any dependency on DOM/ref timing.
 *
 * For each placeholder <img class="asset-pending" data-asset-ref="...">:
 * - a fully qualified reference (http(s)://...) is fetched via the network,
 * - a relative reference is looked up in the asset cache (PLI.getAssets()),
 * - png/jpg/jpeg/gif content is converted to a data: URL and set as the <img> src,
 * - svg content replaces the placeholder with inline <svg> markup,
 * - if the asset cannot be obtained, the placeholder is replaced by a red
 *   inline error message (<span class="meta-error">).
 *
 * @param html - HTML string possibly containing pending asset placeholders
 * @returns HTML string with all placeholders resolved to inline images (or error messages)
 */
export async function resolveAssetImagesInHtml(html: string): Promise<string> {
    if (!html) return html;

    // Match placeholder <img class="asset-pending" data-asset-ref="..." alt="...">
    // elements (attribute order as produced by insertAssetPlaceholders() above):
    const placeholderRe = /<img class="asset-pending" data-asset-ref="([^"]*)" alt="([^"]*)">/g;
    const matches = Array.from(html.matchAll(placeholderRe));
    // LOG.debug('resolveAssetImagesInHtml: found placeholders', matches);
    if (matches.length === 0) return html;

    // Cache lookups/fetches by reference, since the same asset may be referenced
    // by more than one placeholder within the same HTML string:
    const resolved = new Map<string, { ok: true; blob: Blob } | { ok: false; message: string }>();

    async function resolveRef(ref: string): Promise<{ ok: true; blob: Blob } | { ok: false; message: string }> {
        const cached = resolved.get(ref);
        if (cached) return cached;

        let result: { ok: true; blob: Blob } | { ok: false; message: string };
        try {
            // LOG.debug('resolveRef', ref);
            if (LIB.isRelativeReference(ref)) {
                const assets = await PLI.getAssets();
                // LOG.debug('resolveRef: assets', assets);
                const asset = assets.find(a => a.filename === ref);
                if (!asset) {
                    result = { ok: false, message: `<<Image '${ref}' not found.>>` };
                } else {
                    result = { ok: true, blob: asset.blob };
                }
            } else if (PLI.isBrowserEnv()) {
                const response = await fetch(ref);
                if (!response.ok) {
                    result = { ok: false, message: `<<Failed to load image '${ref}' (HTTP ${response.status}).>>` };
                } else {
                    result = { ok: true, blob: await response.blob() };
                }
            } else {
                result = { ok: false, message: `<<Image '${ref}' cannot be fetched in this environment.>>` };
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            LOG.error(`resolveAssetImagesInHtml: failed to obtain image '${ref}':`, e);
            result = { ok: false, message: `<<Failed to load image '${ref}': ${msg}>>` };
        }

        resolved.set(ref, result);
        return result;
    }

    // Resolve each distinct reference once, then substitute all placeholder occurrences:
    const refs = Array.from(new Set(matches.map(m => m[1])));
    const outcomes = new Map<string, { ok: true; replacement: string } | { ok: false; message: string }>();
    await Promise.all(refs.map(async ref => {
        const outcome = await resolveRef(ref);
        if (!outcome.ok) {
            outcomes.set(ref, { ok: false, message: outcome.message });
            return;
        }
        try {
            const isSvg = outcome.blob.type === 'image/svg+xml' || /\.svg(?:[?#].*)?$/i.test(ref);
            if (isSvg) {
                const svgText = await outcome.blob.text();
                outcomes.set(ref, { ok: true, replacement: sanitizeInlineSvg(svgText, ref) });
            } else {
                const dataUrl = await LIB.blobToDataURL(outcome.blob);
                outcomes.set(ref, { ok: true, replacement: `<img src="${escapeAttr(dataUrl)}">` }); // alt restored below
            }
        } catch (e: unknown) {
            LOG.error(`resolveAssetImagesInHtml: failed to render image '${ref}':`, e);
            outcomes.set(ref, { ok: false, message: `Failed to render image '${ref}'.` });
        }
    }));

    return html.replace(placeholderRe, (match, ref: string, alt: string) => {
        const outcome = outcomes.get(ref);
        if (!outcome) return match;
        if (!outcome.ok) {
            return `<span class="meta-error" style="color:red;">${escapeAttr(outcome.message)}</span>`;
        }
        // Re-insert the original 'alt' text for raster images (inline SVGs carry it via aria-label):
        return outcome.replacement.includes('<img ')
            ? outcome.replacement.replace('<img ', `<img alt="${alt}" `)
            : outcome.replacement;
    });
}

/**
 * Parse SVG markup obtained from the asset cache (or network) and return a
 * sanitized, inline-ready <svg ...>...</svg> string (as plain text, since
 * resolveAssetImagesInHtml() operates on HTML strings, not the DOM).
 *
 * @param svgText - raw SVG markup
 * @param ref - original asset reference, used for error/alt text only
 * @returns sanitized inline SVG markup, or a <span class="meta-error"> on failure
 */
function sanitizeInlineSvg(svgText: string, ref: string): string {
    if (!PLI.isBrowserEnv()) {
        // No DOMParser/XMLSerializer available outside the browser; pass the SVG through
        // passify()'s own sanitization (dangerous tags/attributes are still stripped there).
        return svgText;
    }
    const parsed = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svgEl = parsed.documentElement;
    if (!svgEl || svgEl.nodeName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) {
        return `<span class="meta-error" style="color:red;">Image '${escapeAttr(ref)}' is not a valid SVG.</span>`;
    }
    svgEl.classList.remove(PENDING_ASSET_CLASS);
    // If the SVG already has a viewBox, keep its original width/height attributes:
    // they define the intrinsic (original) size, and the CSS rule max-width: 100%
    // will only shrink it when the column is narrower. If there is no viewBox, the
    // width/height attributes (if any) are the only size reference, so derive a
    // viewBox from them and drop the attributes - otherwise the SVG would have no
    // intrinsic size and browsers may stretch it to fill the column:
    if (!svgEl.getAttribute('viewBox')) {
        const w = parseFloat(svgEl.getAttribute('width') || '');
        const h = parseFloat(svgEl.getAttribute('height') || '');
        if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
        }
        svgEl.removeAttribute('width');
        svgEl.removeAttribute('height');
    }
    return new XMLSerializer().serializeToString(svgEl);
}
