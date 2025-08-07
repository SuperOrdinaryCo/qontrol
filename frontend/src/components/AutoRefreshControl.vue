<template>
  <div class="flex items-center space-x-3">
    <button
      @click="toggleAutoRefresh"
      :class="[
        'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        autoRefreshEnabled
          ? 'bg-success-100 text-success-800 hover:bg-success-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      ]"
    >
      <component
        :is="autoRefreshEnabled ? PlayIcon : PauseIcon"
        class="w-4 h-4"
      />
      <span>{{ autoRefreshEnabled ? 'Auto-refresh' : 'Paused' }}</span>
    </button>

    <span class="text-sm text-gray-500">
      Every {{ settings.autoRefreshInterval }}s
    </span>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { PlayIcon, PauseIcon } from '@heroicons/vue/24/solid'

const settingsStore = useSettingsStore()
const { settings, autoRefreshEnabled } = storeToRefs(settingsStore)

function toggleAutoRefresh() {
  settingsStore.toggleAutoRefresh()
}
</script>
