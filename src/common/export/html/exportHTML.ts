/*!
 * CASCaDE Reference Implementation – HTML Export Helpers
 * Copyright 2025 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaDE Reference Implementation – HTML Export Helpers
 * ------------------------------------------------------
 * This module provides central HTML helpers for the PIG metamodel classes.
 * For each supported type (APackage, AnEntity, ARelationship), the static
 * object `toHTML` offers a function that generates an HTML representation
 * of the respective instance.
 *
 * - Always returns valid HTML snippets (string or string[]).
 * - Error and status information is included in the HTML output.
 * - Output supports localization and multi-language fields.
 * - The logic is decoupled from the metamodel classes.
 *
 * Usage:
 *   import { toHTML } from './exportHTML';
 *   const html = toHTML.anEntity(entity, options);
 * or
 *   const html = anEntity.toHTML(options);
 *
 * Copyright 2026 GfSE (https://gfse.org)
 * License: Apache 2.0
 *
 * Design Decisions:
 * - Combine all HTML export logic in a single module for better maintainability.
 * - Prefer calls of helpers from genuine getHTML methods instead of additions to the metamodel protitypes
 *   and type merging - because the latter appears to be rather fragile.
 */


import { PigItemType, PigItemTypeValue, AnEntity, APackage, ARelationship, getLocalText, TPigInstance } from '../../schema/pig/ts/pig-metaclasses';
import { tagIETF, LIB } from '../../lib/helpers';

export type stringHTML = string;  // contains HTML code
export interface IOptionsHTML {
    widthMain?: string;
    itemType?: PigItemTypeValue[];
    lang?: tagIETF;
}

export const toHTML = {
    aPackage(pkg: APackage, options?: IOptionsHTML): stringHTML[] {
        const pkgSt = pkg.status();
        if (!pkgSt.ok) {
            return [
                `<div class="pig-error">
                    Invalid aPackage; status: (${pkgSt.status})<br>
                    ${pkgSt.statusText ?? ''}
                </div>`
            ];
        }

        // Extract language preference from options, default to 'en-US'
        const lang = options?.lang ?? 'en-US';
        const widthMain = options?.widthMain ?? '67%';
        const includeItemTypes = options?.itemType ?? [PigItemType.anEntity];

        // 1. Package metadata as first element with localization
        const titleText = passify(getLocalText(pkg.title, lang));
        const descText = passify(getLocalText(pkg.description, lang));

        const pkgMetadata = `<div class="pig-apackage" style="display: flex; gap: 1rem;">
                    <div class="col-main" style="flex: 0 0 ${widthMain}; min-width: 0;">
                        <h3 class="pig-title">${titleText || 'Untitled Package'}</h3>
                        ${descText ? `<div class="pig-description">${descText}</div>` : ''}
                    </div>
                    <div class="col-right" style="flex: 1; min-width: 0;">
                        <dl class="dl-horizontal">
                            <dt>Item Type</dt><dd>aPackage</dd>
                            <dt>ID</dt><dd>${passify(pkg.id)}</dd>
                            ${pkg.modified ? `<dt>Modified</dt><dd>${LIB.getLocalDate(pkg.modified, lang)}</dd>` : ''}
                            ${pkg.creator ? `<dt>Creator</dt><dd>${passify(pkg.creator)}</dd>` : ''}
                            <dt>Items in Graph</dt><dd>${pkg.graph.length}</dd>
                        </dl>
                    </div>
                </div>`;

        const result: stringHTML[] = [pkgMetadata];

        for (const item of pkg.graph) {
            if (includeItemTypes.includes(item.itemType) && typeof toHTML.anEntity === 'function') {
                // call directly the helper function instead of the getHTML method of the item:
                result.push(toHTML.anEntity(item as AnEntity, options));
            }
        }

        return result;
    },

    anEntity(entity: AnEntity, options?: IOptionsHTML): stringHTML {
        const enSt = entity.status();
        if (!enSt.ok) {
            return `<div class="pig-error">
                    Invalid anEntity; status: (${enSt.status})<br>
                    ${enSt.statusText ?? ''}
                </div>`;
        }
        const lang = options?.lang || 'en-US';
        const widthMain = options?.widthMain || '67%';

        const titleText = passify(getLocalText(entity.title, lang));
        const descText = passify(getLocalText(entity.description, lang));

        let propertiesHTML = '';
        if (entity.hasProperty?.length > 0) {
            propertiesHTML = '<div class="pig-properties"><dl class="dl-horizontal">';
            // the configured properties:
            for (const prop of entity.hasProperty) {
                const propData = prop.get();
                if (propData && propData.hasClass) {
                    const propValue = passify(propData.value || propData.idRef || '—');
                    const propClass = passify(propData.hasClass);
                    propertiesHTML += `<dt>${propClass}</dt><dd>${propValue}</dd>`;
                }
            }
            propertiesHTML += metadataToHTML(entity, lang);
            propertiesHTML += '</dl></div>';
        }

        return `<div class="pig-anentity" style="display: flex; gap: 1rem;">
                    <div class="col-main" style="flex: 0 0 ${widthMain}; min-width: 0;">
                        ${titleText ? `<h3 class="pig-title">${titleText}</h3>` : ''}
                        ${descText ? `<div class="pig-description">${descText}</div>` : ''}
                    </div>
                    <div class="col-right" style="flex: 1; min-width: 0;">
                        ${propertiesHTML}
                    </div>
                </div>`;
    },

    aRelationship(rel: ARelationship, options?: IOptionsHTML): stringHTML {
        const relSt = rel.status();
        if (!relSt.ok) {
            return `<div class="pig-error">
                    Invalid aRelationship; status: (${relSt.status})<br>
                    ${relSt.statusText ?? ''}
                </div>`;
        }
        // ToDo: Implementiere eine HTML-Repräsentation für ARelationship
        return '<div class="pig-not-implemented">HTML export for Relationship not implemented</div>';
    }
};

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

    let passified = html;

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
    const objectRegex = /<object([^>]*)>(.*?)<\/object>/gis;
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

//function metadataToHTML(item: TPigInstance, lang: tagIETF): string { ... as soon as aPackage is extended from AnElement
function metadataToHTML(item: AnEntity | ARelationship, lang: tagIETF): string {
    return `<dt>Item Type</dt><dd>anEntity</dd>
                <dt>ID</dt><dd>${passify(item.id)}</dd>
                <dt>Class</dt><dd>${passify(item.hasClass || '—')}</dd>
                <dt>Modified</dt><dd>${LIB.getLocalDate(item.modified, lang)}</dd>
                ${item.creator ? `<dt>Creator</dt><dd>${passify(item.creator)}</dd>` : ''}
                ${item.revision && item.revision.length > 0 ? `<dt>Revision</dt><dd>${passify(item.revision)}</dd>` : ''}
                ${item.priorRevision && item.priorRevision.length > 0 ? `<dt>Prior Revisions</dt><dd>${item.priorRevision.map((r: string) => passify(r)).join(', ')}</dd>` : ''}`
}
