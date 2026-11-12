/*!
 * RAS 3.0 data importer: transforms RAS 3.0 asset metadata (conforming to the
 * RAS3.0_Core_Schema.json) into CASCaRA JSON-LD, ready to be loaded via APackage.setJSONLD().
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 */
/**
 * RAS 3.0 Data Importer
 * ---------------------
 * Converts a RAS 3.0 asset descriptor (nested JSON, see RAS3.0_Core_Schema.json) into a
 * CASCaRA JSON-LD aPackage document. The resulting document references the RAS 3.0
 * type definitions published in packages/common/ontology/ras30/ras30.cas.jsonld
 * (entity type ras30:ClassName, property ras30:ClassName.attributeName,
 * link ras30:ClassName_attributeName) and the shared semantic infrastructure
 * (cas:manifest-RAS30, cas:anEntity, cas:aProperty, cas:aTargetLink, cas:aPackage).
 *
 * That type package (and the semantic infrastructure it builds on) must be loaded
 * into the target application before (or together with) the data package produced here,
 * so that type/inherited-property resolution succeeds.
 *
 * Authors: oskar.dungern@gfse.org
 *
 * Usage:
 *   import { Ras30Importer } from './import-ras30';
 *   const jsonld = Ras30Importer.transform(ras30Data);
 *   const aPackage = new APackage().setJSONLD(jsonld);
 */

import { PLI } from '../../lib/platform-independence';
import { IRsp, Msg } from '../../lib/messages';
import { APackage } from '../../schema/pig/ts/pig-metaclasses';

// ---------------------------------------------------------------------------
// RAS 3.0 input data model (nested JSON per RAS3.0_Core_Schema.json)
// ---------------------------------------------------------------------------

export interface IRas30AssetId {
    idValue: string;
    idScheme: 'UUID' | 'URI' | 'DOI' | 'ARK';
}

export interface IRas30Name {
    title: string;
    shortName?: string[];
    language?: string;
}

export interface IRas30DescriptionPurpose {
    summary: string;
    details?: string;
    intendedUse?: string;
}

export interface IRas30IdentityAndIntent {
    assetId: IRas30AssetId;
    name: IRas30Name;
    descriptionPurpose: IRas30DescriptionPurpose;
}

export interface IRas30MaintainerOrganisation {
    orgName: string;
    orgId?: string;
}

export interface IRas30Contact {
    contactName?: string;
    contactUri: string;
}

export interface IRas30License {
    spdxIdentifier: string;
    licenseUrl?: string;
}

export interface IRas30AccessLocation {
    primaryUri: string;
    mirrorUris?: string[];
}

export interface IRas30StewardshipAndAccess {
    maintainerOrganisation: IRas30MaintainerOrganisation;
    contact: IRas30Contact;
    license: IRas30License;
    accessLocation: IRas30AccessLocation;
}

export interface IRas30Version {
    versionLabel: string;
    releaseDate?: string;
}

export interface IRas30LifecycleStatus {
    state: 'draft' | 'released' | 'deprecated' | 'archived';
    statusDate?: string;
}

export interface IRas30VersioningAndLifecycle {
    createdDate: string;
    lastModifiedDate: string;
    version: IRas30Version;
    lifecycleStatus: IRas30LifecycleStatus;
}

export interface IRas30ParentAssetLink {
    parentId: string;
    relationshipNote?: string;
}

export interface IRas30VersionHistory {
    priorVersionUri: string;
    changeSummary?: string;
    changeDate?: string;
}

export interface IRas30GovernanceAndProvenance {
    lineageRelationship?: 'derivesFrom' | 'variantOf' | 'supersedes' | 'composes';
    parentAssetLink?: IRas30ParentAssetLink;
    versionHistory?: IRas30VersionHistory[];
}

export interface IRas30Core {
    identityAndIntent: IRas30IdentityAndIntent;
    stewardshipAndAccess: IRas30StewardshipAndAccess;
    versioningAndLifecycle: IRas30VersioningAndLifecycle;
    governanceAndProvenance?: IRas30GovernanceAndProvenance;
}

export interface IRas30ImportOptions {
    /** @id to use for the generated aPackage; defaults to a new ras30: id derived from assetId.idValue */
    packageId?: string;
    /** dcterms:modified timestamp for the package and its entities; defaults to now */
    modified?: string;
    /** dcterms:creator for the package */
    creator?: string;
    /** dcterms:title for the package; defaults to the asset's name.title */
    title?: string;
}

// ---------------------------------------------------------------------------
// ID conventions, matching scripts/ras30-to-cas.ts
// ---------------------------------------------------------------------------

const NS = 'ras30:';

function typeId(className: string): string {
    return `${NS}${className}`;
}

function propertyId(className: string, attrName: string): string {
    return `${NS}${className}.${attrName}`;
}

function linkId(className: string, attrName: string): string {
    return `${NS}${className}_${attrName}`;
}

// ---------------------------------------------------------------------------
// JSON-LD builder helpers
// ---------------------------------------------------------------------------

function titleValue(text: string): Array<{ '@value': string }> {
    return [{ '@value': text }];
}

function aProperty(value: string): Record<string, unknown> {
    return { 'cas:itemType': { '@id': 'cas:aProperty' }, '@value': value };
}

function aTargetLink(id: string): Record<string, unknown> {
    return { 'cas:itemType': { '@id': 'cas:aTargetLink' }, '@id': id };
}

class EntityBuilder {
    private graph: Record<string, unknown>[];
    private modified: string;

    constructor(graph: Record<string, unknown>[], modified: string) {
        this.graph = graph;
        this.modified = modified;
    }

    /**
     * Create a cas:anEntity graph item for the given RAS class, with the given
     * scalar attributes (name -> value, skipped if undefined) and child entity links
     * (name -> child entity @id, skipped if undefined).
     *
     * `title` and `description` are mapped to the native dcterms:title/dcterms:description
     * fields of the entity rather than being configured as cas:aProperty entries, since
     * these are built-in metadata fields of every anEntity instance.
     */
    addEntity(
        id: string,
        className: string,
        title: string | undefined,
        attrs: Record<string, string | string[] | undefined>,
        links: Record<string, string | undefined>,
        description?: string
    ): string {
        const item: Record<string, unknown> = this.makeBaseItem(id, className, title, description);
        for (const [attrName, value] of Object.entries(attrs)) {
            if (value === undefined) continue;
            const values = Array.isArray(value) ? value : [value];
            if (values.length === 0) continue;
            item[propertyId(className, attrName)] = values.map(v => aProperty(v));
        }
        for (const [linkName, targetId] of Object.entries(links)) {
            if (!targetId) continue;
            item[linkId(className, linkName)] = [aTargetLink(targetId)];
        }
        this.graph.push(item);
        return id;
    }

    addEntityMultiLink(
        id: string,
        className: string,
        title: string | undefined,
        attrs: Record<string, string | string[] | undefined>,
        multiLinks: Record<string, string[] | undefined>,
        singleLinks: Record<string, string | undefined> = {},
        description?: string
    ): string {
        const item: Record<string, unknown> = this.makeBaseItem(id, className, title, description);
        for (const [attrName, value] of Object.entries(attrs)) {
            if (value === undefined) continue;
            const values = Array.isArray(value) ? value : [value];
            if (values.length === 0) continue;
            item[propertyId(className, attrName)] = values.map(v => aProperty(v));
        }
        for (const [linkName, targetId] of Object.entries(singleLinks)) {
            if (!targetId) continue;
            item[linkId(className, linkName)] = [aTargetLink(targetId)];
        }
        for (const [linkName, targetIds] of Object.entries(multiLinks)) {
            if (!targetIds || targetIds.length === 0) continue;
            item[linkId(className, linkName)] = targetIds.map(t => aTargetLink(t));
        }
        this.graph.push(item);
        return id;
    }

    private makeBaseItem(id: string, className: string, title: string | undefined, description: string | undefined): Record<string, unknown> {
        const item: Record<string, unknown> = {
            '@id': id,
            '@type': typeId(className),
            'cas:itemType': { '@id': 'cas:anEntity' },
            'dcterms:modified': this.modified
        };
        if (title) {
            item['dcterms:title'] = titleValue(title);
        }
        if (description) {
            item['dcterms:description'] = titleValue(description);
        }
        return item;
    }
}

// ---------------------------------------------------------------------------
// Transformation: RAS 3.0 data -> CASCaRA JSON-LD graph items
// ---------------------------------------------------------------------------

/**
 * RAS 3.0 Importer
 * Static class for transforming RAS 3.0 asset metadata into CASCaRA JSON-LD
 */
export class Ras30Importer {
    /**
     * Import a single RAS 3.0 asset descriptor file (JSON per RAS3.0_Core_Schema.json),
     * transform it into CASCaRA JSON-LD and instantiate it via APackage.setJSONLD().
     *
     * @param source - File path (Node.js), URL, or File/Blob object (Browser)
     * @returns array with a single IRsp (first item of its response is APackage, rest are graph items)
     *
     * @example
     * // Browser
     * const file = fileInput.files[0];
     * const results = await Ras30Importer.import(file);
     */
    static async import(source: string | File | Blob): Promise<IRsp<unknown>[]> {
        const filename = typeof source === 'string' ? source : (source as File).name ?? '';

        const rsp = await PLI.readFileAsText(source);
        if (!rsp.ok) {
            return [rsp];
        }

        let data: IRas30Core;
        try {
            data = JSON.parse(rsp.response as string) as IRas30Core;
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            return [Msg.create(660, 'RAS 3.0', errorMessage)];
        }

        let doc: Record<string, unknown>;
        try {
            doc = this.transform(data);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            return [Msg.create(660, filename || 'RAS 3.0', errorMessage)];
        }

        const aPackage = new APackage().setJSONLD(doc);
        return [{ ...aPackage.status(), response: aPackage.getItems(), responseType: 'json' }];
    }

    /**
     * Transform a single RAS 3.0 asset descriptor into a CASCaRA JSON-LD aPackage document,
     * ready to be loaded with `new APackage().setJSONLD(doc)`.
     *
     * @param data - RAS 3.0 asset descriptor (nested JSON per RAS3.0_Core_Schema.json)
     * @param options - optional overrides for package id, timestamps, creator and title
     * @returns a JSON-LD aPackage document
     */
    static transform(data: IRas30Core, options: IRas30ImportOptions = {}): Record<string, unknown> {
        const modified = options.modified ?? new Date().toISOString();
        const assetIdValue = data.identityAndIntent?.assetId?.idValue ?? PLI.makeUUID();
        const rootId = `${NS}${this.sanitizeId(assetIdValue)}`;
        const packageId = options.packageId ?? `${rootId}-package`;
        const title = options.title ?? data.identityAndIntent?.name?.title ?? assetIdValue;

        const graph: Record<string, unknown>[] = [];
        const builder = new EntityBuilder(graph, modified);

        const rootEntityId = this.transformCore(builder, rootId, data);

        return {
            '@context': {
                'cas': 'https://product-information-graph.org/semantic-infrastructure/2026-11-03/cas-jsonld#',
                'ras30': 'https://product-information-graph.org/examples/ras30#',
                'dcterms': 'http://purl.org/dc/terms/'
            },
            '@id': packageId,
            '@type': 'cas:manifest-RAS30',
            'cas:itemType': { '@id': 'cas:aPackage' },
            'dcterms:modified': modified,
            'dcterms:title': titleValue(title),
            ...(options.creator ? { 'dcterms:creator': options.creator } : {}),
            'cas:hasRoot': [aTargetLink(rootEntityId)],
            '@graph': graph
        };
    }

    /** Replace characters that are not safe for a JSON-LD id suffix */
    private static sanitizeId(value: string): string {
        return value.replace(/[^A-Za-z0-9_.-]/g, '_');
    }

    private static transformCore(builder: EntityBuilder, rootId: string, data: IRas30Core): string {
        const identityId = `${rootId}_identityAndIntent`;
        const stewardshipId = `${rootId}_stewardshipAndAccess`;
        const versioningId = `${rootId}_versioningAndLifecycle`;
        const governanceId = `${rootId}_governanceAndProvenance`;

        const identityEntityId = this.transformIdentityAndIntent(builder, identityId, data.identityAndIntent);
        const stewardshipEntityId = this.transformStewardshipAndAccess(builder, stewardshipId, data.stewardshipAndAccess);
        const versioningEntityId = this.transformVersioningAndLifecycle(builder, versioningId, data.versioningAndLifecycle);
        const governanceEntityId = data.governanceAndProvenance
            ? this.transformGovernanceAndProvenance(builder, governanceId, data.governanceAndProvenance)
            : undefined;

        builder.addEntity(
            rootId,
            'Ras30core',
            data.identityAndIntent?.name?.title,
            {},
            {
                identityAndIntent: identityEntityId,
                stewardshipAndAccess: stewardshipEntityId,
                versioningAndLifecycle: versioningEntityId,
                governanceAndProvenance: governanceEntityId
            }
        );
        return rootId;
    }

    private static transformIdentityAndIntent(builder: EntityBuilder, id: string, data: IRas30IdentityAndIntent): string {
        const assetIdId = `${id}_assetId`;
        const nameId = `${id}_name`;
        const descId = `${id}_descriptionPurpose`;

        builder.addEntity(assetIdId, 'AssetId', data.assetId.idValue, {
            idValue: data.assetId.idValue,
            idScheme: data.assetId.idScheme
        }, {});

        // Name.title maps directly to the native dcterms:title of the Name entity;
        // it is not additionally configured as a cas:aProperty.
        builder.addEntityMultiLink(nameId, 'Name', data.name.title, {
            shortName: data.name.shortName,
            language: data.name.language
        }, {});

        // DescriptionPurpose.summary maps directly to the native dcterms:description
        // of the DescriptionPurpose entity; it is not additionally configured as a cas:aProperty.
        builder.addEntity(descId, 'DescriptionPurpose', undefined, {
            details: data.descriptionPurpose.details,
            intendedUse: data.descriptionPurpose.intendedUse
        }, {}, data.descriptionPurpose.summary);

        builder.addEntity(id, 'IdentityAndIntent', data.name.title, {}, {
            assetId: assetIdId,
            name: nameId,
            descriptionPurpose: descId
        });
        return id;
    }

    private static transformStewardshipAndAccess(builder: EntityBuilder, id: string, data: IRas30StewardshipAndAccess): string {
        const orgId = `${id}_maintainerOrganisation`;
        const contactId = `${id}_contact`;
        const licenseId = `${id}_license`;
        const accessId = `${id}_accessLocation`;

        builder.addEntity(orgId, 'MaintainerOrganisation', data.maintainerOrganisation.orgName, {
            orgName: data.maintainerOrganisation.orgName,
            orgId: data.maintainerOrganisation.orgId
        }, {});

        builder.addEntity(contactId, 'Contact', data.contact.contactName ?? data.contact.contactUri, {
            contactName: data.contact.contactName,
            contactUri: data.contact.contactUri
        }, {});

        builder.addEntity(licenseId, 'License', data.license.spdxIdentifier, {
            spdxIdentifier: data.license.spdxIdentifier,
            licenseUrl: data.license.licenseUrl
        }, {});

        builder.addEntityMultiLink(accessId, 'AccessLocation', data.accessLocation.primaryUri, {
            primaryUri: data.accessLocation.primaryUri,
            mirrorUris: data.accessLocation.mirrorUris
        }, {});

        builder.addEntity(id, 'StewardshipAndAccess', undefined, {}, {
            maintainerOrganisation: orgId,
            contact: contactId,
            license: licenseId,
            accessLocation: accessId
        });
        return id;
    }

    private static transformVersioningAndLifecycle(builder: EntityBuilder, id: string, data: IRas30VersioningAndLifecycle): string {
        const versionId = `${id}_version`;
        const lifecycleId = `${id}_lifecycleStatus`;

        builder.addEntity(versionId, 'Version', data.version.versionLabel, {
            versionLabel: data.version.versionLabel,
            releaseDate: data.version.releaseDate
        }, {});

        builder.addEntity(lifecycleId, 'LifecycleStatus', data.lifecycleStatus.state, {
            state: data.lifecycleStatus.state,
            statusDate: data.lifecycleStatus.statusDate
        }, {});

        builder.addEntity(id, 'VersioningAndLifecycle', data.version.versionLabel, {
            createdDate: data.createdDate,
            lastModifiedDate: data.lastModifiedDate
        }, {
            version: versionId,
            lifecycleStatus: lifecycleId
        });
        return id;
    }

    private static transformGovernanceAndProvenance(builder: EntityBuilder, id: string, data: IRas30GovernanceAndProvenance): string {
        const parentLinkId = data.parentAssetLink ? `${id}_parentAssetLink` : undefined;
        if (parentLinkId && data.parentAssetLink) {
            builder.addEntity(parentLinkId, 'ParentAssetLink', data.parentAssetLink.parentId, {
                parentId: data.parentAssetLink.parentId,
                relationshipNote: data.parentAssetLink.relationshipNote
            }, {});
        }

        const historyIds = (data.versionHistory ?? []).map((h, i) => {
            const histId = `${id}_versionHistory_${i}`;
            builder.addEntity(histId, 'VersionHistory', h.priorVersionUri, {
                priorVersionUri: h.priorVersionUri,
                changeSummary: h.changeSummary,
                changeDate: h.changeDate
            }, {});
            return histId;
        });

        builder.addEntityMultiLink(id, 'GovernanceAndProvenance', data.lineageRelationship, {
            lineageRelationship: data.lineageRelationship
        }, {
            versionHistory: historyIds
        }, {
            parentAssetLink: parentLinkId
        });
        return id;
    }
}
