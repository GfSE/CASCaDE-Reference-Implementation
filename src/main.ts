import { createApp } from 'vue'
import App from './App.vue'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
    components,
    directives,
  })

const app = createApp(App);

app.use(vuetify)

const pluginFiles = require.context('./plugins', false, /\.ts$/);

pluginFiles.keys().forEach((filePath: string) => {
  const plugin = pluginFiles(filePath).default; // Get the default export of the plugin
  if (typeof plugin === 'function') {
    app.use(plugin);
  } else if (plugin && typeof plugin.install === 'function') {
    app.use(plugin);
  }
});

// provide all global components
// TODO: make it so that you can filter components based on their names
// const globalComponents = app._context.components;
const exportComponents = Object.fromEntries(Object.entries(app._context.components).filter(([key, value]) => key.includes("Export")));
const importComponents = Object.fromEntries(Object.entries(app._context.components).filter(([key, value]) => key.includes("Import")));

console.log(exportComponents);
app.provide('exportComponents', exportComponents);
console.log(importComponents);
app.provide('importComponents', importComponents);

app.mount('#app');
