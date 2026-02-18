import { BUILD_INFO } from '../../build-info';

const PIG_DOMAIN = 'http://product-information-graph.org/';

export const DEF = {
    defaultTime: 'T12:00:00',
    defaultTimezone: 'Z',
    pigPath: PIG_DOMAIN,
    jsonldSchemaPath: PIG_DOMAIN + 'schema/2026-02-18/jsonld/',
    // Default for local terms (names) without an explicit namespace
    defaultDataNamespace: PIG_DOMAIN + 'default/data#',  // for data instances with prefix d:
    defaultOntologyNamespace: PIG_DOMAIN + 'default/ontology#',  // for (application or project) ontology terms with prefix o:
    pigVersion: '2026-02-12',
    ...BUILD_INFO
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
    termWithNamespace: /^([a-zA-Z_][a-zA-Z0-9_\\-\\.]*):([^\s]+)$/,
    isoDateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}(:\d{2})?)?$/,
    hasTimezone: /(Z|[+-]\d{2}(:\d{2})?)$/
}
