/** Product Information Graph (PIG) - ReqIF to PIG Transformation
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - The transformation delivers a PIG package as an IXhr object with responseType 'pig-package'.
*   - The response comes in an JSON-LD structure according to the PIG schema, namely: IPackage, IEntity, IRelationship, IProperty, ...  
*   - It will be checked with schema and constrints before ingesting into a PIG store.
*/

import { IXhr } from '../../lib/helper';
import { IEntity, IRelationship, IProperty, IAnEntity, IARelationship } from '../../schemas/pig/pig-metaclasses';

export class reqif2pig {
    private validate(xml: Document): boolean {
        // ToDo: implement ReqIF validation here.
        return xml.getElementsByTagName("REQ-IF-HEADER").length == 0
            && xml.getElementsByTagName("REQ-IF-CONTENT").length == 0;
    }
    toPig(xml: string, options?: any): IXhr {

        const opts = Object.assign(
            {
                propType: "dcterms:type",  // the type/category of a resource, e.g. folder or diagram.
                prefixN: "N-",
                xhrInvalidReqif: { ok: false, status: 899, statusText: "ReqIF data is invalid" } as IXhr
            },
            options
        );

        const parsed = parseXML(xml);
        if (!parsed.ok)
            return parsed;

        const reqifDoc = parsed.response as Document;

        /*    var xhr:IXhr;
            if (this.validate(reqifDoc))
                xhr = { ok: true, status: 0, statusText: "ReqIF data is valid", responseType: 'pig-package' };
            else
                return opts.xhrInvalidReqif;
    
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
        const xhr: IXhr = { status: 999, statusText: "Transformation not yet implemented", responseType: 'document' };

        xhr.response = reqifDoc;  // just return the XML document for now.
        console.info(xhr);
        return xhr;

        // Parse an XML string and returns an XML Document;
        // proposed by: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parsing_an_XML_string (through GitHub Copilot)
        function parseXML(input: string | Document): IXhr {
            if (typeof (input) !== 'string') {
                // already a Document / XMLDocument
                return { ok: true, status: 297, statusText: '', response: input, responseType: 'document' };
            }
            // browser DOMParser
            const
                parser = new DOMParser(),
                doc = parser.parseFromString(input, 'application/xml');
            // basic parse error detection (works in major browsers)
            if (doc.getElementsByTagName('parsererror').length > 0) {
                return { ok: false, status: 898, statusText: 'XML parse error: invalid XML document' };
            }
            return { ok: true, status: 298, statusText: '', response: doc, responseType: 'document' };
        }
    }
}