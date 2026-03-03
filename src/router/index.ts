import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import PageHome from '@/components/PageHome.vue';
import PageDashboards from '@/components/PageDashboards.vue';
import PageInterfaces from '@/components/PageInterfaces.vue';
import PageViewing from '@/components/PageViewing.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: PageHome,
  },
  {
    path: '/dashboards',
    name: 'Dashboards',
    component: PageDashboards,
  },
  {
    path: '/interfaces',
    name: 'Interfaces',
    component: PageInterfaces,
  },
  {
    path: '/viewing',
    name: 'Viewing',
    component: PageViewing,
  }
];

/* Trial to set the current (subdirectory) path as base - doesn't work with vue3
const base = window.location.pathname.replace(/\/[^/]*$/, '/');
const router = createRouter({
    history: createWebHistory(base),
    routes,
});*/
const router = createRouter({
  history: createWebHistory(), // Use HTML5 History mode for cleaner URLs
  routes,
});

export default router;
