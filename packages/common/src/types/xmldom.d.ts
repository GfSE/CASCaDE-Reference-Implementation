declare module '@xmldom/xmldom' {
    export class DOMParser {
        parseFromString(source: string, mimeType?: string): Document;
    }
    
    export class XMLSerializer {
        serializeToString(node: Node): string;
    }
    
    export class DOMImplementation {
        createDocument(
            namespaceURI: string | null,
            qualifiedName: string | null,
            doctype: DocumentType | null
        ): Document;
    }
}
