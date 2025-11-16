/** Product Information Graph (PIG) - ReqIF Import
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - 
*/

// import * as PigMetaclasses from '../../schemas/pig/pig-metaclasses'; --> needed later when implementing the transformation.
export interface IXhr<T = unknown> {
    status: number;
    statusText: string;
    response?: T; // z.B. Document, string, object, ...
    responseType?: XMLHttpRequestResponseType; // '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text'
    headers?: Record<string, string>;
    ok?: boolean; // convenience: status in 200-299
}
export class ImportReqif {
    private validate(reqifDoc: string): boolean {
        // ToDo: implement ReqIF validation here.
        return true;
    }
    toPig(xml: string, options?: any): IXhr {

        options = Object.assign(
            {
                propType: "ReqIF.Category",  // the type/category of a resource, e.g. folder or diagram.
                prefixN: "N-",
                errInvalidReqif: { ok: false, status: 899, statusText: "ReqIF data is invalid" } as IXhr
            },
            options
        );

        const parsed = parseXML(xml);
        if (!parsed.ok)
            return parsed;

        const reqifDoc = parsed.response as Document;

        /*    var xhr:IXhr;
            if (this.validate(reqifDoc))
                xhr = { status: 0, statusText: "ReqIF data is valid", responseType: 'pig-package' };
            else
                return options.errInvalidReqif;
    
            // Transform ReqIF data provided as an XML string to SpecIF data.
            xhr.response = extractMetaData(xmlDoc.getElementsByTagName("REQ-IF-HEADER"));
            xhr.response.dataTypes = extractDatatypes(xmlDoc.getElementsByTagName("DATATYPES"));
            xhr.response.propertyClasses = extractPropertyClasses(xmlDoc.getElementsByTagName("SPEC-TYPES"));
            xhr.response.resourceClasses = extractElementClasses(xmlDoc.getElementsByTagName("SPEC-TYPES"), ['SPECIFICATION-TYPE', 'SPEC-OBJECT-TYPE']);
            xhr.response.statementClasses = extractElementClasses(xmlDoc.getElementsByTagName("SPEC-TYPES"), [/*'RELATION-GROUP-TYPE',/'SPEC-RELATION-TYPE']);
            xhr.response.resources = extractResources("SPEC-OBJECTS")
                // ReqIF hierarchy roots are SpecIF resources:
                .concat(extractResources("SPECIFICATIONS"));
            xhr.response.statements = extractStatements(xmlDoc.getElementsByTagName("SPEC-RELATIONS"));
            xhr.response.hierarchies = extractHierarchies(xmlDoc.getElementsByTagName("SPECIFICATIONS"));
        */
        // Temporary:
        let xhr: IXhr = { status: 999, statusText: "Transformation not yet implemented", responseType: 'document' };

        xhr.response = reqifDoc;  // just return the XML document for now.
        console.info(xhr);
        return xhr;

        // Parse an XML string and returns an XML Document;
        // proposed by: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parsing_an_XML_string (through GitHub Copilot)
        function parseXML(input: string | Document): IXhr {
            if (typeof (input) !== 'string') {
                // already a Document / XMLDocument
                return { ok: true, status: 297, statusText: '', response: input, responseType: 'document' };
            };
            // browser DOMParser
            const
                parser = new DOMParser(),
                doc = parser.parseFromString(input, 'application/xml');
            // basic parse error detection (works in major browsers)
            if (doc.getElementsByTagName('parsererror').length > 0) {
                return { ok: false, status: 898, statusText: 'XML parse error: invalid XML document' };
            };
            return { ok: true, status: 298, statusText: '', response: doc, responseType: 'document' };
        }
    }
}