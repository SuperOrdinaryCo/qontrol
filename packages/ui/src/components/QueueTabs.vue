<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { watch } from 'vue';
import { QueueInfo } from '@/types';

defineProps<{
  queueInfo: QueueInfo
}>()

const selectedStateTab = defineModel({
  default: 'waiting',
  validator: (value: string) => ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'waiting-children'].includes(value)
})

const router = useRouter()
const route = useRoute()

function selectStateTab(state: string) {
  selectedStateTab.value = state
  router.push({ query: { state } })
}

function getStateTabStyle(isSelected: boolean) {
  if (isSelected) {
    return 'bg-primary-100 text-primary-800'
  } else {
    return 'bg-gray-100 dark:bg-gray-200 text-gray-800 dark:text-gray-800'
  }
}

watch(() => route.query.state, () => {
  if (route.query.state && selectedStateTab.value !== route.query.state) {
    selectedStateTab.value = route.query.state as string
  }
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800  rounded-lg border border-gray-200 dark:border-gray-800">
    <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-600">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Queue Statistics</h3>
      <span v-if="queueInfo.isPaused" class="state-paused">Paused</span>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-800 w-full overflow-x-auto">
      <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
        <button
            v-for="[state, count] in Object.entries(queueInfo.counts)"
            :key="state"
            @click="selectStateTab(state)"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              selectedStateTab === state
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300'
            ]"
        >
          <span class="flex items-center space-x-2">
            <span class="capitalize">{{ state }}</span>
            <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStateTabStyle(selectedStateTab === state)
                ]"
            >
                {{ count }}
              </span>
          </span>
        </button>
      </nav>
    </div>
  </div>
</template>
