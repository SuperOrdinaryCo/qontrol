<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
      <p class="text-gray-600 dark:text-gray-400">Configure your dashboard preferences</p>
    </div>

    <!-- Settings Form -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Application Settings</h3>
      </div>

      <div class="p-6 space-y-6">
        <!-- Auto-refresh Interval -->
        <div>
          <label for="auto-refresh" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Auto-refresh Interval
          </label>
          <div class="flex items-center space-x-3">
            <input
              id="auto-refresh"
              v-model.number="localSettings.autoRefreshInterval"
              type="number"
              min="1"
              max="300"
              class="block w-32 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
            <span class="text-sm text-gray-500 dark:text-gray-400">seconds</span>
          </div>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            How often to automatically refresh data (1-300 seconds)
          </p>
        </div>

        <!-- Timezone -->
        <div>
          <label for="timezone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timezone Display
          </label>
          <select
            id="timezone"
            v-model="localSettings.timezone"
            class="block w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="local">Local Timezone</option>
            <option value="utc">UTC</option>
          </select>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose how timestamps are displayed
          </p>
        </div>

        <!-- Theme -->
        <div>
          <label for="theme" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <select
            id="theme"
            v-model="localSettings.theme"
            class="block w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose the appearance theme
          </p>
        </div>

        <!-- Auto-refresh Toggle -->
        <div>
          <div class="flex items-center">
            <input
              id="enable-auto-refresh"
              v-model="autoRefreshEnabled"
              type="checkbox"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label for="enable-auto-refresh" class="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable auto-refresh
            </label>
          </div>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Automatically refresh data at the specified interval
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            @click="resetSettings"
            class="btn-secondary"
          >
            Reset to Defaults
          </button>
          <div class="space-x-3">
            <button
              @click="saveSettings"
              class="btn-primary cursor-pointer"
              :disabled="!hasChanges"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Status -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Current Status</h4>
      <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <div>
          <dt class="text-sm text-gray-500 dark:text-gray-400">Auto-refresh</dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">
            {{ autoRefreshEnabled ? 'Enabled' : 'Disabled' }}
          </dd>
        </div>
        <div>
          <dt class="text-sm text-gray-500 dark:text-gray-400">Refresh Interval</dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">{{ settings.autoRefreshInterval }}s</dd>
        </div>
        <div>
          <dt class="text-sm text-gray-500 dark:text-gray-400">Timezone</dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">
            {{ settings.timezone === 'local' ? 'Local Timezone' : 'UTC' }}
          </dd>
        </div>
        <div>
          <dt class="text-sm text-gray-500 dark:text-gray-400">Current Time</dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">{{ currentTime }}</dd>
        </div>
        <div>
          <dt class="text-sm text-gray-500 dark:text-gray-400">Theme</dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">
            {{ getThemeDisplayName(settings.theme) }}
            <span v-if="settings.theme === 'system'" class="text-gray-500 dark:text-gray-400">
              ({{ isDarkMode ? 'Dark' : 'Light' }})
            </span>
          </dd>
        </div>
        <div>
          <dt class="text-sm text-gray-500 dark:text-gray-400">Version</dt>
          <dd class="text-sm text-gray-900 dark:text-gray-100">{{ version }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { formatTimestamp } from '@/utils/date'
import type { AppSettings } from '@/types'

// Version information
const version = __APP_VERSION__ || 'unknown'

const settingsStore = useSettingsStore()
const { settings, autoRefreshEnabled, isDarkMode } = storeToRefs(settingsStore)

// Local settings for form
const localSettings = ref<AppSettings>({ ...settings.value })

// Current time display
const currentTime = ref(formatTimestamp(new Date()))
let timeInterval: ReturnType<typeof setInterval> | null = null

const hasChanges = computed(() => {
  return JSON.stringify(localSettings.value) !== JSON.stringify(settings.value)
})

function getThemeDisplayName(theme: string) {
  switch (theme) {
    case 'light': return 'Light'
    case 'dark': return 'Dark'
    case 'system': return 'System'
    default: return theme
  }
}

function saveSettings() {
  settingsStore.updateSettings(localSettings.value)
}

function resetSettings() {
  settingsStore.resetSettings()
  localSettings.value = { ...settings.value }
}

function updateCurrentTime() {
  currentTime.value = formatTimestamp(new Date())
}

// Watch for external settings changes
watch(settings, (newSettings) => {
  localSettings.value = { ...newSettings }
}, { deep: true })

onMounted(() => {
  updateCurrentTime()
  timeInterval = setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>
