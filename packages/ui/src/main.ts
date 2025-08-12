import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './assets/main.css'

import {routes} from '@/routes.ts';
import {getBaseUrl} from '@/utils/base-url.ts';

// Create router with relative base path handling
const router = createRouter({
  history: createWebHistory(getBaseUrl()),
  routes,
})

// Create app
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')
