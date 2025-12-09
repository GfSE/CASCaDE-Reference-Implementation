import { App, Plugin } from 'vue';
import RdfExportComponent from "./RdfExportPlugin.vue";

const rdfExportPlugin: Plugin = {
    install(app: App, options?) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('RdfExportComponent', RdfExportComponent);
    }
}

export default rdfExportPlugin;
