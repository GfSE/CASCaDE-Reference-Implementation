import { App, Plugin } from 'vue';

const pluginImportReqif: Plugin = {
    install(app: App, options?) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('ComponentImportReqIF', {
            data() {
                return {
                        dialog: false
                    };
            },
            template: " \
            <v-btn color='primary' @click='dialog = true'>Import ReqIF</v-btn> \
            <v-dialog v-model='dialog'> \
                <v-card> \
                    <v-card-title>Select Import Elements</v-card-title> \
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

export default pluginImportReqif;