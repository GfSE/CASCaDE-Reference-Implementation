import { App, Plugin } from 'vue';

const jsonExportPlugin: Plugin = {
    install(app: App, options?) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('JsonExportComponent', {
            // methods: {
            //     handleClick() {console.log('Performing JSON Export!')}
            // },
            data() {
                return {
                        dialog: false
                    };
            },
            template: " \
            <v-btn color='secondary' @click='dialog = true'>Export JSON</v-btn> \
            <v-dialog v-model='dialog'> \
                <v-card> \
                    <v-card-title>Select Export Elements</v-card-title> \
                    <v-card-text>TBD...</v-card-text> \
                    <v-card-actions> \
                        <v-btn color='red' @click='dialog = false'>Close</v-btn> \
                    </v-card-actions> \
                </v-card> \
            </v-dialog> \
            "
        });
    }
}

export default jsonExportPlugin;