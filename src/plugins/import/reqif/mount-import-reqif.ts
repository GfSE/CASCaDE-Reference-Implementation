import { App, Plugin } from 'vue';
import ReqifImportComponent from "./import-reqif.vue";

const reqifImportPlugin: Plugin = {
    install(app: App) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component('Import-ReqIF', ReqifImportComponent);
    }
}

export default reqifImportPlugin;
