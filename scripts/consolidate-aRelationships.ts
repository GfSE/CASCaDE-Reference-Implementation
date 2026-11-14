/**
 * Consolidate aRelationships
 *
 * Problem: a JSON-LD CASCaDE data file (SpecIF format) may contain multiple
 * `cas:aRelationship` items of the same relationship type (`@type`) that share
 * the same source endpoint(s) (`${@type}-toSource`), but each pointing to a
 * different, single target endpoint (`${@type}-toTarget`).
 *
 * This script consolidates such duplicates: for every group of aRelationship
 * items having the same `@type` and the same set of source endpoint ids, it
 * keeps a single relationship item and merges all target endpoints found in
 * the group into that item's `${@type}-toTarget` array (deduplicated by id).
 * The redundant relationship items are then removed from the `@graph`.
 *
 * Usage:
 *   npx tsx scripts/consolidate-aRelationships.ts <input.jsonld> [output.jsonld]
 *
 * If no output path is given, the result is written next to the input file
 * with a `.consolidated.jsonld` suffix; the original file is left untouched.
 */

import * as fs from 'fs';
import * as path from 'path';

interface JsonLdItemType {
    '@id': string;
}

interface GraphItem {
    '@id': string;
    '@type'?: string;
    'cas:itemType'?: JsonLdItemType;
    [key: string]: unknown;
}

interface JsonLdDocument {
    '@graph': GraphItem[];
    [key: string]: unknown;
}

const A_RELATIONSHIP = 'cas:aRelationship';

function isARelationship(item: GraphItem): boolean {
    return item['cas:itemType']?.['@id'] === A_RELATIONSHIP;
}

function endpointIds(item: GraphItem, property: string): string[] {
    const value = item[property];
    if (!Array.isArray(value)) return [];
    return value
        .map((endpoint) => (endpoint as { '@id'?: string })['@id'])
        .filter((id): id is string => typeof id === 'string');
}

function consolidate(doc: JsonLdDocument): { doc: JsonLdDocument; groupsConsolidated: number; itemsRemoved: number } {
    const graph = doc['@graph'];

    // groupKey -> list of items (in original order)
    const groups = new Map<string, GraphItem[]>();

    for (const item of graph) {
        if (!isARelationship(item) || !item['@type']) continue;

        const type = item['@type'];
        const sourceProperty = `${type}-toSource`;
        const sourceIds = endpointIds(item, sourceProperty).sort().join(',');
        if (!sourceIds) continue;

        const groupKey = `${type}|${sourceIds}`;
        const list = groups.get(groupKey);
        if (list) {
            list.push(item);
        } else {
            groups.set(groupKey, [item]);
        }
    }

    const itemsToRemove = new Set<GraphItem>();
    let groupsConsolidated = 0;

    for (const items of groups.values()) {
        if (items.length < 2) continue;

        const [keep, ...duplicates] = items;
        const type = keep['@type'] as string;
        const targetProperty = `${type}-toTarget`;

        const mergedTargets: unknown[] = Array.isArray(keep[targetProperty]) ? [...(keep[targetProperty] as unknown[])] : [];
        const seenTargetIds = new Set(endpointIds(keep, targetProperty));

        for (const duplicate of duplicates) {
            const targets = Array.isArray(duplicate[targetProperty]) ? (duplicate[targetProperty] as unknown[]) : [];
            for (const target of targets) {
                const id = (target as { '@id'?: string })['@id'];
                if (id && !seenTargetIds.has(id)) {
                    seenTargetIds.add(id);
                    mergedTargets.push(target);
                }
            }
            itemsToRemove.add(duplicate);
        }

        keep[targetProperty] = mergedTargets;
        groupsConsolidated++;
    }

    const consolidatedGraph = graph.filter((item) => !itemsToRemove.has(item));
    doc['@graph'] = consolidatedGraph;

    return { doc, groupsConsolidated, itemsRemoved: itemsToRemove.size };
}

function main(): void {
    const [, , inputArg, outputArg] = process.argv;

    if (!inputArg) {
        console.error('Usage: npx tsx scripts/consolidate-aRelationships.ts <input.jsonld> [output.jsonld]');
        process.exit(1);
    }

    const inputPath = path.resolve(inputArg);
    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exit(1);
    }

    const outputPath = outputArg
        ? path.resolve(outputArg)
        : inputPath.replace(/\.cas\.jsonld$/, '.consolidated.cas.jsonld');

    const raw = fs.readFileSync(inputPath, 'utf8');
    const doc = JSON.parse(raw) as JsonLdDocument;

    if (!Array.isArray(doc['@graph'])) {
        console.error('Input file does not contain a top-level "@graph" array.');
        process.exit(1);
    }

    const { doc: result, groupsConsolidated, itemsRemoved } = consolidate(doc);

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

    console.log(`Consolidated ${groupsConsolidated} group(s) of duplicate aRelationships.`);
    console.log(`Removed ${itemsRemoved} redundant item(s).`);
    console.log(`Output written to: ${outputPath}`);
}

main();
