/** Product Information Graph (PIG) - helper routines
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - 
*/

// An xhr-like object to return the result of the import;
// use it as follows (according to GitHub Copilot):
// - XML Document:
//   const xhrDoc: IXhr<Document> = { status: 200, statusText: 'OK', response: doc, responseType: 'document' };
// - or JSON payload:
//   type PigPackage = { /* ... */ };
//   const xhrJson: IXhr<PigPackage> = { status: 200, statusText: 'OK', response: pigPackage, responseType: 'json' };
// - or dynamically:
//   if (xhr.responseType === 'document') {
//      const doc = xhr.response as Document;
//   };
export interface IXhr<T = unknown> {
    status: number;
    statusText?: string;
    response?: T; // z.B. Document, string, object, ...
    responseType?: XMLHttpRequestResponseType; // '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text'
    headers?: Record<string, string>;
    ok?: boolean; // convenience: status in 200-299
}
export const xhrOk:IXhr = { status: 0, ok: true };
