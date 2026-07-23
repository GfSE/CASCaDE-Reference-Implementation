import { App, Plugin } from 'vue';
import CypherExportComponent from './export-cypher.vue';

const cypherExportPlugin: Plugin = {
    install(app: App) {
        app.component('Export-Cypher', CypherExportComponent);
    }
};

export default cypherExportPlugin;

//this is the command to run the cypher file in the neo4j database using cypher-shell. You need to replace "password" with your actual password and "location of the cypher file.cypher" with the actual path to your cypher file.
//cypher-shell.bat -a bolt://localhost:7687 -u neo4j -p "password" -d test -f "location of the cypher file.cypher"