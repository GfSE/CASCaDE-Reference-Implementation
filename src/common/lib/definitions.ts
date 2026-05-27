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

const CAS_DOMAIN = 'http://product-information-graph.org/';
const CAS_VERSION = '2026-05-08';

export const DEF = {
    pigVersion: CAS_VERSION,
    defaultTime: 'T12:00:00',
    defaultTimezone: 'Z',
    pigPath: CAS_DOMAIN,
    jsonldSchemaPath: CAS_DOMAIN + 'schema/' + CAS_VERSION + '/jsonld/',
    xslPath: 'assets/xslt/',
    // Default for local terms (names) without an explicit namespace
    defaultDataNamespace: 'd:',  // for data instances
    defaultOntologyNamespace: 'o:',  // for (application or project) ontology
 //   defaultDataURL: CAS_DOMAIN + 'default/data#',  // URL for data instances
 //   defaultOntologyURL: CAS_DOMAIN + 'default/ontology#',  // URL for (application or project) ontology
    ...BUILD_INFO,
    minLengthId: 3,
    maxSizeXML: 4 * 1024 * 1024, // 4MB
    timeBetweenPages: 800,
    pfxNsMeta: 'cas:',
    pfxNsSemi: 'cas:',
    pfxNsDcmi: 'dcterms:'
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
    termWithNamespace: /^([a-zA-Z_][a-zA-Z0-9_-]*):([^:\s]+)$/,
    isoDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}(:\d{2})?)?$/,
    hasTimezone: /(Z|[+-]\d{2}(:\d{2})?)$/
}
