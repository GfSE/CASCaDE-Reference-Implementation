/*!
 * CASCaRA Graph (cas:) Definitions and Regular Expressions for global use
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 * We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
 */
/**
 * CASCaRA Graph (cas:) Definitions and Regular Expressions for global use
 * -----------------------------------------------------------------------
 * Authors: oskar.dungern@gfse.org
 * Copyright 2026 GfSE (https://gfse.org)
 * License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
 *
 */

import { BUILD_INFO } from '../../build-info';

/**
 * Interface for hosted ontology definitions
 */
export interface IHostedOntology {
    tag: string;    // namespace prefix with colon (e.g., 'dcterms:')
    uri: string;    // base URI of the ontology
    description?: string;  // optional brief description
}

const CAS_DOMAIN = 'http://product-information-graph.org/';
const CAS_VERSION = '2026-05-08';
const CAS_NS = 'cas:';
const DCMI_NS = 'dcterms:';

export const DEF = {
    pigVersion: CAS_VERSION,
    defaultTime: 'T12:00:00',
    defaultTimezone: 'Z',
    pigPath: CAS_DOMAIN,
    jsonldSchemaPath: CAS_DOMAIN + 'schema/' + CAS_VERSION + '/jsonld/',
    xslPath: 'assets/xslt/',
    prefixShape: `${CAS_NS.slice(0, -1)}Shapes_`,  // for shapes of remotely defined ontologies, such as dcterms: and schema:
    suffixShape: '_shape',  // for CASCaRA (and local) shapes
    // Default for local terms (names) without an explicit namespace
    defaultDataNamespace: 'd:',  // for data instances
    defaultOntologyNamespace: 'o:',  // for (application or project) ontology
 //   defaultDataURL: CAS_DOMAIN + 'default/data#',  // URL for data instances
 //   defaultOntologyURL: CAS_DOMAIN + 'default/ontology#',  // URL for (application or project) ontology
    ...BUILD_INFO,
    minLengthId: 3,
    maxSizeXML: 4 * 1024 * 1024, // 4MB
    timeBetweenPages: 800,
    pfxNsMeta: CAS_NS,
    pfxNsSemi: CAS_NS,
    pfxNsDcmi: DCMI_NS,
    /**
     * List of ontologies that are just context and don't require resolution.
     * These ontologies don't need to be included in the export, but are listed in the context in RDF or namespace in XML.
     * If an ontology is neither context nor hosted, it must be included in the export.
     * 
     * Each entry contains:
     * - tag: The namespace prefix with colon (e.g., 'dcterms:') - matches INamespace format
     * - uri: The base URI of the ontology
     * - description: Brief description of the ontology
     */
    contextOntologies: [
        {
            tag: DCMI_NS,
            uri: 'http://purl.org/dc/terms/',
            description: 'Dublin Core Metadata Terms'
        },
        {
            tag: 'skos:',
            uri: 'http://www.w3.org/2004/02/skos/core#',
            description: 'Simple Knowledge Organization System'
        },
        {
            tag: 'schema:',
            uri: 'http://schema.org/',
            description: 'Schema.org vocabulary'
        }
    ] as IHostedOntology[],
    /**
     * List of ontologies that are hosted on public servers and available for resolution.
     * These ontologies don't need to be included in the export unless option addHostedOntologies is true.
     * If an ontology is neither context nor hosted, it must be included in the export.
     * 
     * Each entry contains:
     * - tag: The namespace prefix with colon (e.g., 'dcterms:') - matches INamespace format
     * - uri: The base URI of the ontology
     * - description: Brief description of the ontology
     */
    hostedOntologies: [] as IHostedOntology[]
    /*
    // Example entries (currently commented out):
    // [
    //     {
    //         tag: DEF.pfxNsMeta,
    //         uri: DEF.pigPath,
    //         description: 'CASCaRA Graph metamodel'
    //     },
    //     {
    //         tag: 'owl:',
    //         uri: 'http://www.w3.org/2002/07/owl#',
    //         description: 'Web Ontology Language'
    //     },
    //     {
    //         tag: 'rdf:',
    //         uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    //         description: 'Resource Description Framework'
    //     },
    //     {
    //         tag: 'rdfs:',
    //         uri: 'http://www.w3.org/2000/01/rdf-schema#',
    //         description: 'RDF Schema'
    //     },
    //     {
    //         tag: 'sh:',
    //         uri: 'http://www.w3.org/ns/shacl#',
    //         description: 'Shapes Constraint Language'
    //     },
    //     {
    //         tag: 'xs:',
    //         uri: 'http://www.w3.org/2001/XMLSchema#',
    //         description: 'XML Schema Datatypes'
    //     },
    //     {
    //         tag: 'foaf:',
    //         uri: 'http://xmlns.com/foaf/0.1/',
    //         description: 'Friend of a Friend'
    //     },
    //     {
    //         tag: 'dcat:',
    //         uri: 'http://www.w3.org/ns/dcat#',
    //         description: 'Data Catalog Vocabulary'
    //     },
    //     {
    //         tag: 'prov:',
    //         uri: 'http://www.w3.org/ns/prov#',
    //         description: 'Provenance Ontology'
    //     },
    //     {
    //         tag: 'oslc_rm:',
    //         uri: 'http://open-services.net/ns/rm#',
    //         description: 'OSLC Requirement Management'
    //     },
    //     {
    //         tag: 'oslc_cm:',
    //         uri: 'http://open-services.net/ns/cm#',
    //         description: 'OSLC Configuration Management'
    //     }
    // ]
    */
};

export const RE = {
//    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
    // URI: /(^|\s|>)((https?:\/\/|www\.)([^\s\/.$?#=]+\.)*([^\s\/.$?#=]+\.[\w]{2,4})((?:\/[^\s#?\/]*?){0,9})(\?[^\s#?]+?)?(#[^\s#]*?)?)(\s|,|:|<|\.\s|\.?$)/gm;
    //             $1: Begins with start of text or space or tag end
    //                     $2: complete link
    //                      $3: "http(s)://" or "www."
    //                                         $4: 0..n subdomains
    //                                                           $5: domain.tld
    //                                                                                     $6: 0..9 subdirectories with or without trailing '/'
    //                                                                                                            $7: 0..1 query string
    //                                                                                                                          $8: 0..1 fragment=page anchor (hash)
    //                                                                                                                                       $9: ends with certain characters or eol
    // Namespace: /^([\w-]+)[.:]([\w\.-]*)$/
    Namespace: /^([\w-]+):([\w.-]*)$/, // only ':' as separator
    termWithNamespace: /^([a-zA-Z_][a-zA-Z0-9_-]*):([^:\s]+)$/,
    isoDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}(:\d{2})?)?$/,
    hasTimezone: /(Z|[+-]\d{2}(:\d{2})?)$/,
    contentInQuotes: /"(\S[^"]+?\S)"|'(\S[^']+?\S)'/i,  // empty space in the middle allowed, but not as first and last character
    contentInRoundBrackets: /^\(([\S\s]+?)\)$/i,  // empty spaces allowed
    contentInSquareBrackets: /^\[([\S\s]+?)\]$/i,  // empty spaces allowed
    // HTML detection: paired tags <tag>...</tag> or self-closing tags <tag />
    hasHTML: /<[a-zA-Z][^>]*>.*?<\/[a-zA-Z][^>]*>|<[a-zA-Z][^>]*\/>/s
}
