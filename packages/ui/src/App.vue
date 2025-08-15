<template>
  <div id="app" class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo and Navigation -->
          <div class="flex items-center space-x-8">
            <router-link :to="{ name: 'dashboard' }" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">BQ</span>
              </div>
              <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">BullMQ Dashboard</h1>
            </router-link>

            <nav class="flex space-x-4">
              <router-link
                :to="{ name: 'dashboard' }"
                class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium"
                :class="{ 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20': $route.name === 'dashboard' }"
              >
                Queues
              </router-link>
              <router-link
                :to="{ name: 'settings' }"
                class="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium"
                :class="{ 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20': $route.name === 'settings' }"
              >
                Settings
              </router-link>
            </nav>
          </div>

          <!-- Auto-refresh controls -->
          <div class="flex items-center space-x-4">
            <AutoRefreshControl />
            <HealthIndicator />
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <router-view />
    </main>

    <!-- Job Detail Drawer -->
    <JobDetailDrawer />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import AutoRefreshControl from '@/components/AutoRefreshControl.vue'
import HealthIndicator from '@/components/HealthIndicator.vue'
import JobDetailDrawer from '@/components/JobDetailDrawer.vue'

const settingsStore = useSettingsStore()

onMounted(() => {
  // Load settings on app start
  settingsStore.loadSettings()
})
</script>
