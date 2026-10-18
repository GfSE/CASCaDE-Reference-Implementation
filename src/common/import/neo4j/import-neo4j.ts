/*!
 * CASCaRA Neo4j importer.
 *
 * Reads CASCaRA data directly from a Neo4j database and reconstructs
 * packages previously exported with getCypher().
 */

import neo4j, { Driver } from 'neo4j-driver';

import {
    IRsp,
    Rsp,
    Msg
} from '../../lib/messages';

import {
    LOG
} from '../../lib/helpers';

import {
    APackage,
    TPigItem
} from '../../schema/pig/ts/pig-metaclasses';


export interface INeo4jImportOptions {
    uri: string;
    username: string;
    password: string;
    database?: string;
}


interface INeo4jNode {
    labels: string[];
    properties: Record<string, any>;
}


interface INeo4jRelationship {
    sourceId: string;
    targetId: string;
    type: string;
    properties: Record<string, any>;
}


/**
 * Import CASCaRA packages directly from Neo4j.
 */
export class Neo4jImporter {

    /**
     * Test the Neo4j connection.
     */
    static async testConnection(
        options: INeo4jImportOptions
    ): Promise<IRsp> {

        const driver = this.createDriver(options);

        try {

            await driver.verifyConnectivity();

            return Rsp.create(
                0,
                undefined,
                'json',
                'Neo4j'
            );

        } catch (error: unknown) {

            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            return Msg.create(
                690,
                'Neo4j',
                message
            );

        } finally {

            await driver.close();
        }
    }


    /**
     * Import every CASCaRA package stored in the Neo4j database.
     *
     * One IRsp<TPigItem[]> is returned per package.
     */
    static async import(
        options: INeo4jImportOptions
    ): Promise<IRsp<TPigItem[]>[]> {

        const driver =
            this.createDriver(options);

        const session =
            driver.session({
                database:
                    options.database || 'neo4j',

                defaultAccessMode:
                    neo4j.session.READ
            });


        try {

            /*
             * Read all CASCaRA nodes.
             *
             * This intentionally ignores unrelated GraphRAG,
             * embedding, chunk, etc. nodes.
             */
            const nodeResult =
                await session.run(`
                    MATCH (item:CascaraItem)

                    RETURN
                        labels(item) AS labels,
                        properties(item) AS properties
                `);


            const nodes: INeo4jNode[] =
                nodeResult.records.map(
                    record => ({
                        labels:
                            record.get('labels') || [],

                        properties:
                            this.normalizeProperties(
                                record.get('properties') || {}
                            )
                    })
                );


            /*
             * Only read relationships created and managed by
             * the CASCaRA Neo4j exporter.
             */
            const relationshipResult =
                await session.run(`
                    MATCH
                        (source:CascaraItem)
                        -[relationship]->
                        (target:CascaraItem)

                    WHERE relationship.cascaraManaged = true

                    RETURN
                        source.id AS sourceId,
                        target.id AS targetId,
                        type(relationship) AS type,
                        properties(relationship) AS properties
                `);


            const relationships:
                INeo4jRelationship[] =
                relationshipResult.records.map(
                    record => ({
                        sourceId:
                            String(
                                record.get('sourceId') || ''
                            ),

                        targetId:
                            String(
                                record.get('targetId') || ''
                            ),

                        type:
                            String(
                                record.get('type') || ''
                            ),

                        properties:
                            this.normalizeProperties(
                                record.get('properties') || {}
                            )
                    })
                );


            LOG.info(
                `Neo4jImporter: found ` +
                `${nodes.length} CASCaRA node(s) and ` +
                `${relationships.length} managed relationship(s)`
            );


            /*
             * Map every node by its CASCaRA ID.
             *
             * We deliberately do not rely on Neo4j elementId().
             */
            const nodeById =
                new Map<string, INeo4jNode>();


            for (const node of nodes) {

                const id =
                    node.properties.id;

                if (
                    typeof id === 'string' &&
                    id.length > 0
                ) {
                    nodeById.set(
                        id,
                        node
                    );
                }
            }


            /*
             * Find package nodes.
             *
             * getCypher() gives aPackage nodes the Package label.
             */
            const packageNodes =
                nodes.filter(node =>
                    node.labels.includes('Package') ||
                    node.properties.itemType ===
                        'cas:aPackage'
                );


            if (
                packageNodes.length === 0
            ) {

                return [
                    Msg.create(
                        690,
                        'Neo4j',
                        'No CASCaRA packages were found.'
                    ) as IRsp<TPigItem[]>
                ];
            }


            const results:
                IRsp<TPigItem[]>[] = [];


            for (
                const packageNode
                of packageNodes
            ) {

                results.push(
                    this.buildPackage(
                        packageNode,
                        nodeById,
                        relationships
                    )
                );
            }


            return results;

        } catch (error: unknown) {

            const message =
                error instanceof Error
                    ? error.message
                    : String(error);


            LOG.error(
                'Neo4jImporter: import failed',
                error
            );


            return [
                Msg.create(
                    690,
                    'Neo4j',
                    message
                ) as IRsp<TPigItem[]>
            ];

        } finally {

            await session.close();
            await driver.close();
        }
    }


    /**
     * Build one CASCaRA package.
     */
    private static buildPackage(
        packageNode: INeo4jNode,
        nodeById: Map<string, INeo4jNode>,
        relationships: INeo4jRelationship[]
    ): IRsp<TPigItem[]> {

        const packageId =
            String(
                packageNode.properties.id
            );


        /*
         * Restore the package's normal CASCaRA fields.
         */
        const packageData =
            this.restoreNodeProperties(
                packageNode.properties
            );


        /*
         * Package instances may themselves contain configurable
         * properties or links, so restore their relationships too.
         */
        this.restoreRelationships(
            packageId,
            packageData,
            nodeById,
            relationships
        );


        /*
         * The exporter creates:
         *
         * Package -[:CONTAINS { cascaraKey:"contains:0" }]-> Item
         *
         * so these relationships tell us exactly which nodes belong
         * to this package and in which order.
         */
        const contained =
            relationships
                .filter(
                    relation =>
                        relation.sourceId ===
                            packageId &&
                        relation.type ===
                            'CONTAINS'
                )
                .sort(
                    (
                        first,
                        second
                    ) =>
                        this.relationshipIndex(first) -
                        this.relationshipIndex(second)
                );


        const graph:
            Record<string, any>[] = [];


        for (
            const relation
            of contained
        ) {

            const node =
                nodeById.get(
                    relation.targetId
                );


            if (!node) {

                LOG.warn(
                    `Neo4jImporter: package '${packageId}' ` +
                    `references missing node ` +
                    `'${relation.targetId}'`
                );

                continue;
            }


            const itemData =
                this.restoreNodeProperties(
                    node.properties
                );


            this.restoreRelationships(
                relation.targetId,
                itemData,
                nodeById,
                relationships
            );


            graph.push(
                itemData
            );
        }


        packageData.graph =
            graph;


        /*
         * getCypher() exported the native get() representation,
         * so restore that same native representation with set().
         */
        const aPackage =
            new APackage().set(
                packageData as any
            );


        const allItems =
            aPackage.getItems();


        const expectedCount =
            graph.length;


        const actualCount =
            Math.max(
                0,
                allItems.length - 1
            );


        if (
            actualCount === expectedCount &&
            aPackage.status().ok
        ) {

            LOG.info(
                `Neo4jImporter: successfully imported ` +
                `'${packageId}' with ` +
                `${actualCount} item(s)`
            );


            return Rsp.create(
                0,
                allItems,
                'json',
                'Neo4j',
                actualCount,
                expectedCount
            ) as IRsp<TPigItem[]>;
        }


        LOG.warn(
            `Neo4jImporter: reconstructed ` +
            `${actualCount} of ` +
            `${expectedCount} item(s) for ` +
            `'${packageId}'`
        );


        return Rsp.create(
            603,
            allItems,
            'json',
            'Import Neo4j',
            actualCount,
            expectedCount
        ) as IRsp<TPigItem[]>;
    }


    /**
     * Restore relationships which the exporter removed from normal
     * node properties and represented as Neo4j edges instead.
     */
    private static restoreRelationships(
        sourceId: string,
        item: Record<string, any>,
        nodeById: Map<string, INeo4jNode>,
        relationships: INeo4jRelationship[]
    ): void {

        const outgoing =
            relationships
                .filter(
                    relation =>
                        relation.sourceId ===
                            sourceId &&
                        relation.type !==
                            'CONTAINS'
                )
                .sort(
                    (
                        first,
                        second
                    ) =>
                        this.relationshipIndex(first) -
                        this.relationshipIndex(second)
                );


        for (
            const relation
            of outgoing
        ) {

            /*
             * Configurable CASCaRA links use their link class as
             * Neo4j relationship type, so linkDirection tells us
             * which CASCaRA field they belong to.
             */
            const linkDirection =
                relation.properties
                    .linkDirection;


            if (
                linkDirection ===
                    'hasSourceLink' ||
                linkDirection ===
                    'hasTargetLink'
            ) {

                if (
                    !Array.isArray(
                        item[linkDirection]
                    )
                ) {
                    item[linkDirection] = [];
                }


                item[linkDirection].push({
                    itemType:
                        relation.properties
                            .linkItemType ||
                        (
                            linkDirection ===
                                'hasSourceLink'
                                ? 'cas:aSourceLink'
                                : 'cas:aTargetLink'
                        ),

                    hasClass:
                        relation.properties
                            .linkClass,

                    idRef:
                        relation.targetId
                });


                continue;
            }


            switch (
                relation.type
            ) {

                case 'SPECIALIZES':

                    item.specializes =
                        relation.targetId;

                    break;


                case 'HAS_ENUMERATED_PROPERTY':

                    this.pushId(
                        item,
                        'enumeratedProperty',
                        relation.targetId
                    );

                    break;


                case 'HAS_ENUMERATED_SOURCE_LINK':

                    this.pushId(
                        item,
                        'enumeratedSourceLink',
                        relation.targetId
                    );

                    break;


                case 'HAS_ENUMERATED_TARGET_LINK':

                    this.pushId(
                        item,
                        'enumeratedTargetLink',
                        relation.targetId
                    );

                    break;


                case 'HAS_ENUMERATED_ENDPOINT':

                    this.pushId(
                        item,
                        'enumeratedEndpoint',
                        relation.targetId
                    );

                    break;


                case 'COMPOSES':

                    this.pushId(
                        item,
                        'composes',
                        relation.targetId
                    );

                    break;


                case 'HAS_ENUMERATED_VALUE': {

                    const target =
                        nodeById.get(
                            relation.targetId
                        );


                    if (!target) {

                        LOG.warn(
                            `Neo4jImporter: missing ` +
                            `EnumerationValue ` +
                            `'${relation.targetId}'`
                        );

                        break;
                    }


                    if (
                        !Array.isArray(
                            item.enumeratedValue
                        )
                    ) {
                        item.enumeratedValue = [];
                    }


                    item.enumeratedValue.push(
                        this.restoreNodeProperties(
                            target.properties
                        )
                    );


                    break;
                }


                case 'HAS_PROPERTY': {

                    if (
                        !Array.isArray(
                            item.hasProperty
                        )
                    ) {
                        item.hasProperty = [];
                    }


                    const property:
                        Record<string, any> = {

                        itemType:
                            relation.properties
                                .itemType ||
                            'cas:aProperty',

                        hasClass:
                            relation.properties
                                .propertyClass ||
                            relation.targetId
                    };


                    if (
                        relation.properties
                            .value !== undefined
                    ) {

                        property.value =
                            this.restoreValue(
                                relation.properties
                                    .value
                            );
                    }


                    if (
                        relation.properties
                            .composesJson !==
                        undefined
                    ) {

                        property.composes =
                            this.parseJson(
                                relation.properties
                                    .composesJson
                            );
                    }


                    item.hasProperty.push(
                        property
                    );


                    break;
                }


                default:

                    LOG.warn(
                        `Neo4jImporter: unhandled managed ` +
                        `relationship '${relation.type}' ` +
                        `from '${relation.sourceId}'`
                    );

                    break;
            }
        }
    }


    /**
     * Convert Neo4j node properties back into the native
     * CASCaRA representation written by getCypher().
     */
    private static restoreNodeProperties(
        properties: Record<string, any>
    ): Record<string, any> {

        const result:
            Record<string, any> = {};


        for (
            const [key, value]
            of Object.entries(properties)
        ) {

            /*
             * Helper used by getCypher() when a referenced node had
             * not yet been written as a full CASCaRA node.
             */
            if (
                key === 'referenceOnly'
            ) {
                continue;
            }


            /*
             * Package context is explicitly stored as JSON.
             */
            if (
                key === 'contextJson'
            ) {

                result.context =
                    this.parseJson(value);

                continue;
            }


            /*
             * title/description/definition may have a flattened
             * display value and an exact JSON copy.
             *
             * Prefer the exact copy.
             */
            if (
                (
                    key === 'title' ||
                    key === 'description' ||
                    key === 'definition'
                ) &&
                properties[
                    `${key}Json`
                ] !== undefined
            ) {
                continue;
            }


            if (
                key === 'titleJson' ||
                key === 'descriptionJson' ||
                key === 'definitionJson'
            ) {

                result[
                    key.substring(
                        0,
                        key.length - 4
                    )
                ] =
                    this.parseJson(value);

                continue;
            }


            result[key] =
                this.restoreValue(value);
        }


        return result;
    }


    /**
     * Restore JSON-serialized arrays/objects.
     */
    private static restoreValue(
        value: any
    ): any {

        if (
            typeof value !== 'string'
        ) {
            return value;
        }


        const trimmed =
            value.trim();


        if (
            !trimmed.startsWith('[') &&
            !trimmed.startsWith('{')
        ) {
            return value;
        }


        try {

            return JSON.parse(
                value
            );

        } catch {

            return value;
        }
    }


    private static parseJson(
        value: any
    ): any {

        if (
            typeof value !== 'string'
        ) {
            return value;
        }


        try {

            return JSON.parse(
                value
            );

        } catch {

            return value;
        }
    }


    private static pushId(
        item: Record<string, any>,
        field: string,
        id: string
    ): void {

        if (
            !Array.isArray(
                item[field]
            )
        ) {
            item[field] = [];
        }


        item[field].push(
            id
        );
    }


    /**
     * cascaraKey values look like:
     *
     * contains:0
     * hasProperty:1
     * hasTargetLink:2
     */
    private static relationshipIndex(
        relation: INeo4jRelationship
    ): number {

        const key =
            relation.properties
                .cascaraKey;


        if (
            typeof key !== 'string'
        ) {
            return Number.MAX_SAFE_INTEGER;
        }


        const separator =
            key.lastIndexOf(':');


        if (
            separator < 0
        ) {
            return Number.MAX_SAFE_INTEGER;
        }


        const index =
            Number(
                key.substring(
                    separator + 1
                )
            );


        return Number.isFinite(index)
            ? index
            : Number.MAX_SAFE_INTEGER;
    }


    /**
     * Neo4j's JavaScript driver represents database integers
     * with neo4j.Integer.
     */
    private static normalizeProperties(
        properties: Record<string, any>
    ): Record<string, any> {

        const result:
            Record<string, any> = {};


        for (
            const [key, value]
            of Object.entries(properties)
        ) {

            result[key] =
                this.normalizeValue(
                    value
                );
        }


        return result;
    }


    private static normalizeValue(
        value: any
    ): any {

        if (
            neo4j.isInt(value)
        ) {

            return value.inSafeRange()
                ? value.toNumber()
                : value.toString();
        }


        if (
            Array.isArray(value)
        ) {

            return value.map(
                entry =>
                    this.normalizeValue(
                        entry
                    )
            );
        }


        if (
            value &&
            typeof value === 'object' &&
            value.constructor === Object
        ) {

            const result:
                Record<string, any> = {};


            for (
                const [key, entry]
                of Object.entries(value)
            ) {

                result[key] =
                    this.normalizeValue(
                        entry
                    );
            }


            return result;
        }


        return value;
    }


    private static createDriver(
        options: INeo4jImportOptions
    ): Driver {

        return neo4j.driver(
            options.uri,
            neo4j.auth.basic(
                options.username,
                options.password
            )
        );
    }
}