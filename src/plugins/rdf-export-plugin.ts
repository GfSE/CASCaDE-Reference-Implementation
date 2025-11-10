import { App, Plugin } from 'vue';

const rdfExportPlugin: Plugin = {
    install(app: App, options?) {
        // global property
        // app.config.globalProperties.$definedproperty = 'Example Global Property';

        // global method
        // app.config.globalProperties.$definedMethods = () => {
        //   console.log('Example Method');
        // };

        // global component
        app.component('RdfExportComponent', {
            methods: {
                handleClick() {console.log('Performing RDF Export!')}
            },
            template: "<button @click='handleClick()'>Export RDF</button>"
        });
    }
}

export default rdfExportPlugin;