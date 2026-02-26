import { App, Plugin } from 'vue';
import JsonExportComponent from "./export-jsonld.vue";

const jsonExportPlugin: Plugin = {
    install(app: App) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('Export-JSONLD', JsonExportComponent);
    }
}

export default jsonExportPlugin;
