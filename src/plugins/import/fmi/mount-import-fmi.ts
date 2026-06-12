import { App, Plugin } from 'vue';
import FmiImportComponent from "./import-fmi.vue";

const fmiImportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally
        // Don't change the name, it is used to filter the component in main.ts
        app.component('Import-FMI', FmiImportComponent);
    }
}

export default fmiImportPlugin;
