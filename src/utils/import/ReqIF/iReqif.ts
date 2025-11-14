/** Product Information Graph (PIG) - ReqIF Import
*   Dependencies: none
*   Authors: oskar.dungern@gfse.org, ..
*   License and terms of use: Apache 2.0 (http://www.apache.org/licenses/LICENSE-2.0)
*   We appreciate any correction, comment or contribution as Github issue (https://github.com/GfSE/CASCaDE-Reference-Implementation/issues)
*
*   Design Decisions:
*   - 
*/

import * as PigMetaclasses from '../../schemas/pig/pig-scaffold';
export interface IXhr {
    status: number,
    statusText: string,
    response?: Object,
    responseType?: string
}
export class ImportReqif {
    validate(reqifDoc: XMLDocument): boolean {
        // ToDo: implement ReqIF validation here.
        return true;
    }
    toPig(xmlDoc: XMLDocument, options?: any): IXhr {

        options = Object.assign(
            {
                propType: "ReqIF.Category",  // the type/category of a resource, e.g. folder or diagram.
                prefixN: "N-",
                errInvalidReqif: { status: 899, statusText: "ReqIF data is invalid" } as IXhr
            },
            options
        );

        //    const reqifDoc = parse(xmlDoc); --> add imoport of a XML parser.

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
        let xhr:IXhr = { status: 999, statusText: "Transformation not yet implemented", responseType: 'pig-package' };

        xhr.response = xmlDoc;  // just return the XML document for now.
        console.info(xhr);
        return xhr;
    }
}