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
            methods: {
                handleClick() {console.log('Performing JSON Export!')}
            },
            template: "<v-btn color='secondary' @click='handleClick()'>Export JSON</v-btn>"
        });
    }
}

export default jsonExportPlugin;