import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App);

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
const globalComponents = Object.fromEntries(Object.entries(app._context.components).filter(([key, value]) => key.includes("Export")));
console.log(globalComponents);
app.provide('globalComponents', globalComponents);

app.mount('#app');
