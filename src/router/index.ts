import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import AppHome from '@/components/Home.vue';
import AppDashboards from '@/components/Dashboards.vue';
import AppInterfaces from '@/components/Interfaces.vue';
import AppView from '@/components/Viewing.vue';

const routes: Array<RouteRecordRaw> = [
    {
    path: '/',
    name: 'Home',
    component: AppHome,
  },
  {
    path: '/dashboards',
    name: 'Dashboards',
    component: AppDashboards,
  },
  {
    path: '/interfaces',
    name: 'Interfaces',
    component: AppInterfaces,
  },
  {
    path: '/viewing',
    name: 'Viewing',
    component: AppView,
  }
];

const router = createRouter({
  history: createWebHistory(), // Use HTML5 History mode for cleaner URLs
  routes,
});

export default router;
