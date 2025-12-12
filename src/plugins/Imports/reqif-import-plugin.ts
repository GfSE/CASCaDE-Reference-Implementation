import { App, Plugin } from 'vue';
import ReqifImportComponent from "./ReqifImportPlugin.vue";

const reqifImportPlugin: Plugin = {
    install(app: App) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('ReqifImportComponent', ReqifImportComponent);
    }
}

export default jsonImportPlugin;
