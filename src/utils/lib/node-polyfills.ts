/**
 * Synchronous DOM Polyfill for Node.js environment
 * NOTE: XSLT transformation is NOT polyfilled - using Karma for XSLT tests
 */
import { LIB, LOG } from './helpers';

function initNodePolyfills(): void {
    LOG.debug('Checking Node environment:', LIB.isNodeEnv());

    if (!LIB.isNodeEnv()) {
        LOG.debug('Browser environment detected - using native DOM APIs');
        return;
    }

    LOG.debug('Loading Node.js polyfills...');

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const xmldom = require('xmldom');

        if (typeof global.DOMParser === 'undefined') {
            (global as any).DOMParser = xmldom.DOMParser;
            LOG.debug('DOMParser polyfilled');
        }

        if (typeof global.XMLSerializer === 'undefined') {
            (global as any).XMLSerializer = xmldom.XMLSerializer;
            LOG.debug('XMLSerializer polyfilled');
        }

        // XSLTProcessor is NOT polyfilled for Node.js
        // Tests requiring XSLT must run in browser via Karma
        if (typeof global.XSLTProcessor === 'undefined') {
            LOG.warn('XSLTProcessor not available in Node.js environment');
            LOG.warn('Tests requiring XSLT transformation should use Karma (browser environment)');
        }
    } catch (error) {
        LOG.error('Failed to load Node.js DOM polyfills:', error);
    }
}

// Initialize immediately
initNodePolyfills();

export { };

/**
 * Synchronous DOM Polyfill for Node.js environment with XSLT 1.0 support using xmldom and xslt-processor.
 * xslt-processor is not working this way, so we cannot offer XSLT server-side at this time.
 * 
 * We use Karma to test the XSLT transformation in a browser environment where it is natively supported, see above.
 * /
import { LIB, LOG } from './helpers';

function initNodePolyfills(): void {
    LOG.debug('Checking Node environment:', LIB.isNodeEnv());

    if (!LIB.isNodeEnv()) return;

    LOG.debug('Loading Node.js polyfills...');

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const xmldom = require('xmldom');

        if (typeof global.DOMParser === 'undefined') {
            (global as any).DOMParser = xmldom.DOMParser;
            LOG.debug('DOMParser polyfilled');
        }

        if (typeof global.XMLSerializer === 'undefined') {
            (global as any).XMLSerializer = xmldom.XMLSerializer;
            LOG.debug('XMLSerializer polyfilled');
        }

        // Use xslt-processor for XSLT 1.0 transformation
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const xsltProcessor = require('xslt-processor');

        if (typeof global.XSLTProcessor === 'undefined') {
            (global as any).XSLTProcessor = class XSLTProcessor {
                private stylesheet: any = null;

                importStylesheet(xslDoc: Document): void {
                    this.stylesheet = xslDoc;
                }

                transformToDocument(xmlDoc: Document): Document {
                    if (!this.stylesheet) {
                        throw new Error('No stylesheet imported');
                    }

                    try {
                        const xmlSerializer = new xmldom.XMLSerializer();
                        const xmlString = xmlSerializer.serializeToString(xmlDoc);
                        const xslString = xmlSerializer.serializeToString(this.stylesheet);

                        // Use xslt-processor's functional API directly
                        // It exports: xmlParse, xsltProcess, xmlSerialize
                        const xml = xsltProcessor.XmlParser.prototype.xmlParse(xmlString);
                        const xslt = xsltProcessor.XmlParser.prototype.xmlParse(xslString);
                        const result = xsltProcessor.Xslt.prototype.xsltProcess(xml, xslt);

                        // Serialize the result using xslt-processor's own serializer
                        let resultString: string;
                        if (typeof xsltProcessor.xmlSerialize === 'function') {
                            resultString = xsltProcessor.xmlSerialize(result);
                        } else if (typeof result === 'string') {
                            resultString = result;
                        } else {
                            // Fallback: assume it's a DOM and has str property or method
                            resultString = result.str || result.xml || String(result);
                        }

                        // Parse the result string back to a Document
                        const parser = new xmldom.DOMParser();
                        return parser.parseFromString(resultString, 'text/xml');
                    } catch (error) {
                        LOG.error('XSLT transformation failed:', error);
                        throw error;
                    }
                }

                transformToFragment(xmlDoc: Document, outputDoc: Document): DocumentFragment {
                    const resultDoc = this.transformToDocument(xmlDoc);
                    const fragment = outputDoc.createDocumentFragment();

                    if (resultDoc.documentElement) {
                        const children = Array.from(resultDoc.documentElement.childNodes);
                        children.forEach(child => {
                            fragment.appendChild(outputDoc.importNode(child, true));
                        });
                    }

                    return fragment;
                }
            };
            LOG.debug('XSLTProcessor polyfilled (XSLT 1.0)');
        }
    } catch (error) {
        LOG.error('Failed to load Node.js DOM polyfills:', error);
    }
}

// Initialize immediately
initNodePolyfills();

export { };
*/
