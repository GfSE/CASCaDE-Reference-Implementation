import { App, Plugin } from 'vue';
import Neo4jExportComponent from './export-neo4j.vue';

const neo4jExportPlugin: Plugin = {
    install(app: App) {
        app.component('Export-Neo4j', Neo4jExportComponent);
    }
};

export default neo4jExportPlugin;
