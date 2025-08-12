import Dashboard from '@/components/Dashboard.vue';
import QueueDetail from '@/components/QueueDetail.vue';
import Settings from '@/components/Settings.vue';

export const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
  },
  {
    path: '/queue/:name',
    name: 'queue-detail',
    component: QueueDetail,
    props: true,
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
  },
];
