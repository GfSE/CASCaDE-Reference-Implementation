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
    termWithNamespace: /^([a-zA-Z_][a-zA-Z0-9_\-\.]*):([^\s]+)$/
}
