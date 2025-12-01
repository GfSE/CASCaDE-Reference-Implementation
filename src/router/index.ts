import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Dashboards from '../components/Dashboards.vue';
import Interfaces from '../components/Interfaces.vue';

const routes: Array<RouteRecordRaw> = [
    {
    path: '/',
    name: 'Dashboards',
    component: Dashboards,
  },
  {
    path: '/interfaces',
    name: 'Interfaces',
    component: Interfaces,
  }
];

const router = createRouter({
  history: createWebHistory(), // Use HTML5 History mode for cleaner URLs
  routes,
});

export default router;
