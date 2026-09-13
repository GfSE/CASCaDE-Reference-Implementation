import { App, Plugin } from 'vue';
import XmlExportComponent from "./export-xml.vue";

const xmlExportPlugin: Plugin = {
    install(app: App /*, options?*/) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   LOG.info('Example Method');
        // };

        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component('Export-XML', XmlExportComponent);
    }
}

export default xmlExportPlugin;
