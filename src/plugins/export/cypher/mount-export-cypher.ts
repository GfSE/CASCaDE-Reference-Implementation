import { App, Plugin } from 'vue';
import CypherExportComponent from './export-cypher.vue';

const cypherExportPlugin: Plugin = {
    install(app: App) {
        // Don't change the name, it is used to filter the component in main.ts
        app.component('Export-Cypher', CypherExportComponent);
    }
};

export default cypherExportPlugin;

// See README.md for a cypher-shell example command.