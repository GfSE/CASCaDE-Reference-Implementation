import { App, Plugin } from 'vue';

const myPlugin: Plugin = {
  install(app: App, options?) {

    // global property
    app.config.globalProperties.$applicationName = 'Product Information Graph Home';

    // global method
    app.config.globalProperties.$handleJsonImport = () => {
      console.log('Performing Json Import!');
    };

    app.config.globalProperties.$handleJsonExport = () => {
      console.log('Performing Json Export!');
    };

    app.config.globalProperties.$handleRDFExport = () => {
      console.log('Performing RDF Export!');
    };

    // global component
    app.component('MyGlobalComponent', {
      template: '<div>This is a global component from the plugin.</div>'
    });
  }
};

export default myPlugin;