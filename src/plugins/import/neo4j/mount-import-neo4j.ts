import { App, Plugin } from 'vue';
import Neo4jImportComponent from './import-neo4j.vue';

const neo4jImportPlugin: Plugin = {
    install(app: App) {
        // Mount component globally.
        // Don't change the name, it is used to filter the component in main.ts.
        app.component('Import-Neo4j', Neo4jImportComponent);
    }
};

export default neo4jImportPlugin;