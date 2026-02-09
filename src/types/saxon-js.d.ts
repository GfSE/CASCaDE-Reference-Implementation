declare module 'saxon-js' {
    export interface TransformOptions {
        stylesheetText?: string;
        stylesheetLocation?: string;
        stylesheetFileName?: string;
        stylesheetBaseURI?: string;
        sourceText?: string;
        sourceLocation?: string;
        sourceFileName?: string;
        sourceNode?: Node;
        destination?: 'replaceBody' | 'appendToBody' | 'prependToBody' | 'raw' | 'document' | 'serialized' | 'application';
        deliverResultDocument?: (uri: string) => void;
        deliverMessage?: (content: string) => void;
        stylesheetParams?: Record<string, any>;
        initialTemplate?: string;
        initialMode?: string;
        initialFunction?: string;
        functionParams?: any[];
        tunnelParams?: Record<string, any>;
        baseOutputURI?: string;
        principalResult?: string;
        masterDocument?: Node;
    }

    export interface TransformResult {
        principalResult: string | Node | Document;
        resultDocuments?: Record<string, string | Node>;
        stylesheetInternal?: any;
    }

    export function transform(
        options: TransformOptions,
        execution?: 'sync' | 'async'
    ): Promise<TransformResult> | TransformResult;

    export function getProcessorInfo(): {
        vendor: string;
        vendorURL: string;
        productName: string;
        productVersion: string;
    };

    export const XPath: {
        evaluate(
            expression: string,
            contextItem?: any,
            namespaceContext?: Record<string, string>,
            options?: any
        ): any;
    };
}
