import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

// Import components for routing
import Dashboard from './components/Dashboard.vue'
import QueueDetail from './components/QueueDetail.vue'
import Settings from './components/Settings.vue'

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes: [
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
  ],
})

// Create app
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

