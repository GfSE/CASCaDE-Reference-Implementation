import { createApp } from 'vue'
import App from './App.vue'
import Plugin from '@/plugins/Plugin'

const app = createApp(App);

app.use(Plugin);

app.mount('#app');
