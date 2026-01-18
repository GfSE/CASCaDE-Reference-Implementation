/** Product Information Graph (PIG) - ReqIF to PIG Transformation
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - The transformation delivers a PIG package as an IRsp object with responseType 'pig-package'.
*   - The response comes in an JSON-LD structure according to the PIG schema, namely: IPackage, IEntity, IRelationship, IProperty, ...  
*   - It will be checked with schema and constrints before ingesting into a PIG store.
*/

import { IRsp } from '../../lib/messages';
import { IEntity, IRelationship, IProperty, IAnEntity, IARelationship } from '../../schemas/pig/ts/pig-metaclasses';

export class reqif2pig {
    private validate(xml: Document): boolean {
        // ToDo: implement ReqIF validation here.
        return xml.getElementsByTagName("REQ-IF-HEADER").length == 0
            && xml.getElementsByTagName("REQ-IF-CONTENT").length == 0;
    }
    toPig(xml: string[] | Document[], options?: any): IRsp {

        const opts = Object.assign(
            {
                propType: "dcterms:type",  // the type/category of a resource, e.g. folder or diagram.
                prefixN: "N-",
                rspInvalidReqif: { ok: false, status: 899, statusText: "ReqIF data is invalid" } as IRsp
            },
            options
        );

        const parsed = parseXML(xml);
        if (!parsed.ok)
            return parsed;

        const reqifDoc = parsed.response as Document;

        /*    var rsp:IRsp;
            if (this.validate(reqifDoc))
                rsp = { ok: true, status: 0, statusText: "ReqIF data is valid", responseType: 'pig-package' };
            else
                return opts.rspInvalidReqif;
    
            // Transform ReqIF data provided as an XML string to SpecIF data.
            rsp.response = extractMetaData(xmlDoc.getElementsByTagName("REQ-IF-HEADER"));
            rsp.response.dataTypes = extractDatatypes(xmlDoc.getElementsByTagName("DATATYPES"));
            rsp.response.propertyClasses = extractPropertyClasses(xmlDoc.getElementsByTagName("SPEC-TYPES"));
            rsp.response.resourceClasses = extractElementClasses(xmlDoc.getElementsByTagName("SPEC-TYPES"), ['SPECIFICATION-TYPE', 'SPEC-OBJECT-TYPE']);
            rsp.response.statementClasses = extractElementClasses(xmlDoc.getElementsByTagName("SPEC-TYPES"), [/*'RELATION-GROUP-TYPE',/'SPEC-RELATION-TYPE']);
            rsp.response.resources = extractResources("SPEC-OBJECTS")
                // ReqIF hierarchy roots are SpecIF resources:
                .concat(extractResources("SPECIFICATIONS"));
            rsp.response.statements = extractStatements(xmlDoc.getElementsByTagName("SPEC-RELATIONS"));
            rsp.response.hierarchies = extractHierarchies(xmlDoc.getElementsByTagName("SPECIFICATIONS"));
        */
        // Temporary:
        const rsp: IRsp = { status: 999, statusText: "Transformation not yet implemented", responseType: 'document' };

        rsp.response = reqifDoc;  // just return the XML document for now.
        console.info(rsp);
        return rsp;

        // Parse an XML string and returns an XML Document;
        // proposed by: https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parsing_an_XML_string (through GitHub Copilot)
        function parseXML(input: string[] | Document[]): IRsp {
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
