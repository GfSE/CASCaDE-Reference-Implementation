import { App, Plugin } from 'vue';
import JsonImportComponent from "./JsonImportPlugin.vue"

const jsonImportPlugin: Plugin = {
    install(app: App) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('JsonImportComponent', JsonImportComponent);
    }
}

export default jsonImportPlugin;