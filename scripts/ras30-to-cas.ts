/*!
 * RAS 3.0 to CASCaRA Type Transformation
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * RAS 3.0 to CASCaRA Type Transformation
 * ---------------------------------------
 * Transforms the RAS 3.0 UML class model (see
 * design/RAS_30_Tramsformation/Specification/RAS30_UML_Class_Diagram_Detailed.puml)
 * into CASCaRA type definitions (cas:Entity, cas:Property, cas:Link) as a
 * JSON-LD document (@context + @graph).
 *
 * This is a type-level (schema) transformation only. A separate, later
 * transformation will convert RAS 3.0 data instances into a CASCaRA graph
 * (cas:anEntity / cas:aRelationship instances) using the types produced here.
 *
 * This document references (but does not copy) the meta-model types cas:manifest-RAS30
 * (a subtype of cas:Package), cas:Entity, cas:Property and cas:Link defined in
 * packages/common/ontology/Semantic-Infrastructure/CASCaRA-Semantic-Infrastructure.cas.jsonld.
 * To operate correctly, that semantic infrastructure package must be loaded first,
 * and this document (ras30.cas.jsonld) applied afterwards with 'update' semantics.
 *
 * Mapping rules:
 * - Every UML class                -> cas:Entity
 * - Every primitive UML attribute   -> cas:Property (referenced via cas:enumeratedProperty)
 * - Every UML composition (*--)     -> cas:Link (referenced via cas:enumeratedTargetLink,
 *                                      with cas:enumeratedEndpoint pointing to the target Entity)
 * - Every UML generalization        -> cas:specializes (not present in RAS 3.0 v1, supported for future use)
 *
 * Run with: npm run generate:ras30-types
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Source model: RAS 3.0 UML classes, attributes and compositions
// (hand-curated from RAS30_UML_Class_Diagram_Detailed.puml)
// ---------------------------------------------------------------------------

type Cardinality = 'required' | 'optional' | 'list';

interface IAttribute {
    name: string;
    datatype: string; // mapped to xs: datatype below
    cardinality: Cardinality;
    description?: string;
    enumValues?: string[];
}

interface IComposition {
    name: string;       // attribute name on the containing class
    target: string;     // target class name
    cardinality: Cardinality;
    description?: string;
}

interface IUmlClass {
    name: string;
    description?: string;
    attributes: IAttribute[];
    compositions: IComposition[];
}

const RAS30_CLASSES: IUmlClass[] = [
    {
        name: 'AccessLocation',
        attributes: [
            { name: 'primaryUri', datatype: 'xs:anyURI', cardinality: 'required', description: 'Canonical repo link' },
            { name: 'mirrorUris', datatype: 'xs:anyURI', cardinality: 'list', description: 'Optional replicas' }
        ],
        compositions: []
    },
    {
        name: 'AssetId',
        attributes: [
            { name: 'idValue', datatype: 'xs:string', cardinality: 'required', description: 'Canonical key (URI, UUID, DOI)' },
            { name: 'idScheme', datatype: 'xs:string', cardinality: 'required', description: 'Parsing hint', enumValues: ['UUID', 'URI', 'DOI', 'ARK'] }
        ],
        compositions: []
    },
    {
        name: 'Contact',
        attributes: [
            { name: 'contactName', datatype: 'xs:string', cardinality: 'optional', description: 'Person or team' },
            { name: 'contactUri', datatype: 'xs:anyURI', cardinality: 'required', description: 'Email, ticket queue…' }
        ],
        compositions: []
    },
    {
        name: 'DescriptionPurpose',
        attributes: [
            { name: 'summary', datatype: 'xs:string', cardinality: 'required', description: 'Elevator pitch' },
            { name: 'details', datatype: 'xs:string', cardinality: 'optional', description: 'Longer notes (markdown)' },
            { name: 'intendedUse', datatype: 'xs:string', cardinality: 'optional', description: 'Intended use' }
        ],
        compositions: []
    },
    {
        name: 'GovernanceAndProvenance',
        attributes: [
            { name: 'lineageRelationship', datatype: 'xs:string', cardinality: 'optional', description: 'Interprets parent asset link', enumValues: ['derivesFrom', 'variantOf', 'supersedes', 'composes'] }
        ],
        compositions: [
            { name: 'parentAssetLink', target: 'ParentAssetLink', cardinality: 'optional' },
            { name: 'versionHistory', target: 'VersionHistory', cardinality: 'list', description: 'Trace of prior releases' }
        ]
    },
    {
        name: 'IdentityAndIntent',
        attributes: [],
        compositions: [
            { name: 'assetId', target: 'AssetId', cardinality: 'required' },
            { name: 'name', target: 'Name', cardinality: 'required' },
            { name: 'descriptionPurpose', target: 'DescriptionPurpose', cardinality: 'required' }
        ]
    },
    {
        name: 'License',
        attributes: [
            { name: 'spdxIdentifier', datatype: 'xs:string', cardinality: 'required', description: 'SPDX ID' },
            { name: 'licenseUrl', datatype: 'xs:anyURI', cardinality: 'optional', description: 'Full text or LicenseRef-…' }
        ],
        compositions: []
    },
    {
        name: 'LifecycleStatus',
        attributes: [
            { name: 'state', datatype: 'xs:string', cardinality: 'required', description: 'Readiness flag', enumValues: ['draft', 'released', 'deprecated', 'archived'] },
            { name: 'statusDate', datatype: 'xs:date', cardinality: 'optional', description: 'Effective timestamp' }
        ],
        compositions: []
    },
    {
        name: 'MaintainerOrganisation',
        attributes: [
            { name: 'orgName', datatype: 'xs:string', cardinality: 'required', description: 'Legal name' },
            { name: 'orgId', datatype: 'xs:string', cardinality: 'optional', description: 'URI, DUNS, or CAGE' }
        ],
        compositions: []
    },
    {
        name: 'Name',
        attributes: [
            { name: 'title', datatype: 'xs:string', cardinality: 'required', description: 'Primary label' },
            { name: 'shortName', datatype: 'xs:string', cardinality: 'list', description: 'Acronym, code-name…' },
            { name: 'language', datatype: 'xs:string', cardinality: 'optional', description: 'IETF BCP-47 language code' }
        ],
        compositions: []
    },
    {
        name: 'ParentAssetLink',
        attributes: [
            { name: 'parentId', datatype: 'xs:anyURI', cardinality: 'required', description: 'Direct ancestor' },
            { name: 'relationshipNote', datatype: 'xs:string', cardinality: 'optional', description: 'Free-text qualifier' }
        ],
        compositions: []
    },
    {
        name: 'Ras30core',
        description: 'JSON schema for the Reusable Asset Specification 3.0 core metadata fields (nested version)',
        attributes: [],
        compositions: [
            { name: 'identityAndIntent', target: 'IdentityAndIntent', cardinality: 'required' },
            { name: 'stewardshipAndAccess', target: 'StewardshipAndAccess', cardinality: 'required' },
            { name: 'versioningAndLifecycle', target: 'VersioningAndLifecycle', cardinality: 'required' },
            { name: 'governanceAndProvenance', target: 'GovernanceAndProvenance', cardinality: 'optional' }
        ]
    },
    {
        name: 'StewardshipAndAccess',
        attributes: [],
        compositions: [
            { name: 'maintainerOrganisation', target: 'MaintainerOrganisation', cardinality: 'required' },
            { name: 'contact', target: 'Contact', cardinality: 'required' },
            { name: 'license', target: 'License', cardinality: 'required' },
            { name: 'accessLocation', target: 'AccessLocation', cardinality: 'required' }
        ]
    },
    {
        name: 'Version',
        attributes: [
            { name: 'versionLabel', datatype: 'xs:string', cardinality: 'required', description: 'Release identity (semver)' },
            { name: 'releaseDate', datatype: 'xs:date', cardinality: 'optional', description: 'When this version went live' }
        ],
        compositions: []
    },
    {
        name: 'VersionHistory',
        attributes: [
            { name: 'priorVersionUri', datatype: 'xs:anyURI', cardinality: 'required', description: 'Link to earlier card' },
            { name: 'changeSummary', datatype: 'xs:string', cardinality: 'optional', description: 'Bug fixes, etc.' },
            { name: 'changeDate', datatype: 'xs:date', cardinality: 'optional', description: 'Timestamp of that release' }
        ],
        compositions: []
    },
    {
        name: 'VersioningAndLifecycle',
        attributes: [
            { name: 'createdDate', datatype: 'xs:date', cardinality: 'required', description: 'First publication' },
            { name: 'lastModifiedDate', datatype: 'xs:dateTime', cardinality: 'required', description: 'Most recent change' }
        ],
        compositions: [
            { name: 'version', target: 'Version', cardinality: 'required' },
            { name: 'lifecycleStatus', target: 'LifecycleStatus', cardinality: 'required' }
        ]
    }
];

// ---------------------------------------------------------------------------
// ID conventions (ras30: namespace)
// ---------------------------------------------------------------------------

const NS = 'ras30:';

function entityId(className: string): string {
    return `${NS}${className}`;
}

function propertyId(className: string, attrName: string): string {
    return `${NS}${className}.${attrName}`;
}

function linkId(className: string, attrName: string): string {
    return `${NS}${className}_${attrName}`;
}

// ---------------------------------------------------------------------------
// Transformation: UML -> CASCaRA JSON-LD graph items
// ---------------------------------------------------------------------------

function titleValue(text: string) {
    return [{ '@value': text }];
}

function cardinalityCounts(cardinality: Cardinality): { minCount: number; maxCount?: number } {
    switch (cardinality) {
        case 'required':
            return { minCount: 1, maxCount: 1 };
        case 'optional':
            return { minCount: 0, maxCount: 1 };
        case 'list':
            return { minCount: 0 };
    }
}

function transformAttributeToProperty(cls: IUmlClass, attr: IAttribute): Record<string, unknown> {
    const { minCount, maxCount } = cardinalityCounts(attr.cardinality);
    const description = [
        attr.description,
        attr.enumValues ? `Allowed values: ${attr.enumValues.join(', ')}` : undefined
    ].filter(Boolean).join(' — ');

    const item: Record<string, unknown> = {
        '@id': propertyId(cls.name, attr.name),
        '@type': 'owl:DatatypeProperty',
        'cas:itemType': { '@id': 'cas:Property' },
        'dcterms:title': titleValue(attr.name),
        'sh:datatype': { '@id': attr.datatype },
        'sh:minCount': minCount
    };
    if (maxCount !== undefined) item['sh:maxCount'] = maxCount;
    if (description) item['skos:definition'] = titleValue(description);
    return item;
}

function transformCompositionToLink(cls: IUmlClass, comp: IComposition): Record<string, unknown> {
    const { minCount, maxCount } = cardinalityCounts(comp.cardinality);
    const item: Record<string, unknown> = {
        '@id': linkId(cls.name, comp.name),
        '@type': 'owl:ObjectProperty',
        'cas:itemType': { '@id': 'cas:Link' },
        'dcterms:title': titleValue(comp.name),
        'cas:enumeratedEndpoint': [{ '@id': entityId(comp.target) }],
        'sh:minCount': minCount
    };
    if (maxCount !== undefined) item['sh:maxCount'] = maxCount;
    if (comp.description) item['skos:definition'] = titleValue(comp.description);
    return item;
}

function transformClassToEntity(cls: IUmlClass): Record<string, unknown> {
    const item: Record<string, unknown> = {
        '@id': entityId(cls.name),
        '@type': 'owl:Class',
        'cas:itemType': { '@id': 'cas:Entity' },
        'dcterms:title': titleValue(cls.name)
    };
    if (cls.description) item['skos:definition'] = titleValue(cls.description);
    if (cls.attributes.length > 0) {
        item['cas:enumeratedProperty'] = cls.attributes.map(a => ({ '@id': propertyId(cls.name, a.name) }));
    }
    if (cls.compositions.length > 0) {
        item['cas:enumeratedTargetLink'] = cls.compositions.map(c => ({ '@id': linkId(cls.name, c.name) }));
    }
    return item;
}

function transformRas30TypesToCascara(classes: IUmlClass[]): Record<string, unknown> {
    const graph: Record<string, unknown>[] = [];

    for (const cls of classes) {
        graph.push(transformClassToEntity(cls));
        for (const attr of cls.attributes) {
            graph.push(transformAttributeToProperty(cls, attr));
        }
        for (const comp of cls.compositions) {
            graph.push(transformCompositionToLink(cls, comp));
        }
    }

    return {
        '@context': {
            // 'cas' namespace must match the one used by CASCaRA-Semantic-Infrastructure.cas.jsonld,
            // since cas:Package, cas:Entity, cas:Property and cas:Link are referenced from there (not copied).
            'cas': 'https://product-information-graph.org/semantic-infrastructure/2026-11-03/cas-jsonld#',
            'ras30': 'https://product-information-graph.org/examples/ras30#',
            'dcterms': 'http://purl.org/dc/terms/',
            'skos': 'http://www.w3.org/2004/02/skos/core#',
            'sh': 'http://www.w3.org/ns/shacl#',
            'dash': 'http://datashapes.org/dash#',
            'owl': 'http://www.w3.org/2002/07/owl#',
            'xs': 'http://www.w3.org/2001/XMLSchema#'
        },
        '@id': 'ras30:RAS30-CASCaRA-Types',
        // References the cas:manifest-RAS30 type (a subtype of cas:Package) defined in
        // CASCaRA-Semantic-Infrastructure.cas.jsonld. That package must be loaded first;
        // this document is then applied with 'update' semantics.
        '@type': 'cas:manifest-RAS30',
        'cas:itemType': { '@id': 'cas:aPackage' },
        'dcterms:title': titleValue('RAS 3.0 CASCaRA Type Definitions'),
        'dcterms:description': titleValue('CASCaRA Entity, Property and Link type definitions transformed from the RAS 3.0 UML class model.'),
        'dcterms:modified': new Date().toISOString(),
        '@graph': graph
    };
}

// ---------------------------------------------------------------------------
// Main: generate the file
// ---------------------------------------------------------------------------

function main() {
    const outputDoc = transformRas30TypesToCascara(RAS30_CLASSES);
    const outputDir = path.resolve(__dirname, '..', 'packages', 'common', 'ontology', 'ras30');
    const outputFile = path.join(outputDir, 'ras30.cas.jsonld');

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(outputDoc, null, 2) + '\n', 'utf-8');

    console.log(`Generated ${outputFile}`);
    console.log(`  Entities:   ${RAS30_CLASSES.length}`);
    console.log(`  Properties: ${RAS30_CLASSES.reduce((n, c) => n + c.attributes.length, 0)}`);
    console.log(`  Links:      ${RAS30_CLASSES.reduce((n, c) => n + c.compositions.length, 0)}`);
}

main();
