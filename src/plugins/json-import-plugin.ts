import { App, Plugin } from 'vue';

const jsonImportPlugin: Plugin = {
    install(app: App, options?) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('JsonImportComponent', {
            methods: {
                handleClick() {console.log('Performing JSON Import!')}
            },
            template: "<v-btn color='primary' @click='handleClick()'>Import JSON</v-btn>"
        });
    }
}

export default jsonImportPlugin;