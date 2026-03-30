import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import ajvPlugin from './plugins/ajv';
import { LOG } from './common/lib/helpers';
// import { initModules } from './module-init-browser';

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import router from './router';
import '@/styles/main.css';

const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'cas',
        themes: {
            cas: {
                colors: {
                    primary: '#ffd800',
                    secondary: '#fbe25a',

                    // cas-100: '#ad0505',
                    // cas-75: '#c83b05',
                    // cas-50: '#e25505',
                    // cas-25: '#fc7705',
                    // cas-0: '#ff6d05',

                    // vue standard colors:
                    // primary: '#1976d2',
                    // secondary: '#424242',
                    success: '#4caf50',
                    info: '#2196f3',
                    warning: '#fb8c00',
                    error: '#ff5252',
                    background: '#f5f5f5',
                    surface: '#ffffff'
                },
                variables: {
                    'font-family': "'Roboto', Arial, sans-serif"
                }
            }
        }
    }
});

const app = createApp(App);

app.use(vuetify).use(router).use(ajvPlugin).use(createPinia());

// parameters: root, recursive, file to match
const pluginFiles = require.context('./plugins', true, /\.ts$/);

pluginFiles.keys().forEach((filePath: string) => {
  const plugin = pluginFiles(filePath).default; // Get the default export of the plugin
  if (typeof plugin === 'function') {
    app.use(plugin);
  } else if (plugin && typeof plugin.install === 'function') {
    app.use(plugin);
  }
});

// provide all global components
const exportComponents = Object.fromEntries(Object.entries(app._context.components).filter(([key, value]) => key.includes("Export")));
const importComponents = Object.fromEntries(Object.entries(app._context.components).filter(([key, value]) => key.includes("Import")));

LOG.info("Mounted import components:", importComponents);
app.provide('importComponents', importComponents);
LOG.info("Mounted export components:", exportComponents);
app.provide('exportComponents', exportComponents);

// initModules();

app.mount('#app');
