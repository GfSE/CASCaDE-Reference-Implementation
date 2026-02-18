declare module 'saxon-js' {
    export interface TransformOptions {
        stylesheetText?: string;
        stylesheetLocation?: string;
        sourceText?: string;
        sourceNode?: any;
        destination?: 'serialized' | 'document' | 'application';
        deliverResultDocument?: (uri: string) => void;
        baseOutputURI?: string;
    }

    export interface TransformResult {
        principalResult: string | Document | any;
        resultDocuments?: Record<string, string | Document>;
    }

    export interface ProcessorInfo {
        productName: string;
        productVersion: string;
        vendor: string;
        saxonEdition: string;
    }

    export function transform(
        options: TransformOptions,
        execution?: 'sync' | 'async'
    ): Promise<TransformResult> | TransformResult;

    export function getProcessorInfo(): ProcessorInfo;

    export default {
        transform,
        getProcessorInfo
    };
}
