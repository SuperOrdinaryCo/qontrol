<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer" @click="$emit('click')">
    <div class="p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <QueueListIcon class="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ queue.name }}</h3>
            <div class="flex items-center space-x-2 mt-1">
              <span v-if="queue.isPaused" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Paused
              </span>
              <span class="text-sm text-gray-500 dark:text-gray-300">{{ totalJobs }} jobs</span>
            </div>
          </div>
        </div>

        <ChevronRightIcon class="w-5 h-5 text-gray-400" />
      </div>

      <!-- Job State Counters with Colors -->
      <div class="mt-4 grid grid-cols-8 gap-1.5">
        <template v-for="[state, count] in Object.entries(queue.counts)" :key="state">
          <div class="flex flex-col items-center px-2 py-2 rounded-lg" :class="getStateBackgroundClass(state)">
            <span class="text-xs font-medium text-center leading-tight" :class="getStateTextClass(state)">
              {{ state === 'waiting-children' ? 'waiting-children' : state }}
            </span>
            <span class="text-sm font-bold mt-0.5" :class="getStateTextClass(state)">
              {{ count }}
            </span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { QueueListIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { QueueInfo } from '@/types'

interface Props {
  queue: QueueInfo
}

const props = defineProps<Props>()

defineEmits<{
  click: []
}>()

const totalJobs = computed(() => {
  return Object.values(props.queue.counts).reduce((sum, count) => sum + count, 0)
})

function getStateBackgroundClass(state: string): string {
  const backgroundClasses: Record<string, string> = {
    waiting: 'bg-[#feb204]',
    active: 'bg-[#06768d]',
    completed: 'bg-[#306844]',
    failed: 'bg-[#940000]',
    delayed: 'bg-[#090088]',
    paused: 'bg-[#696969]',
    'waiting-children': 'bg-[#feb204]',
    prioritized: 'bg-[#02006c]'
  }
  return backgroundClasses[state] || 'bg-gray-500'
}

function getStateTextClass(state: string): string {
  const textClasses: Record<string, string> = {
    waiting: 'text-gray-900',
    active: 'text-gray-100',
    completed: 'text-gray-100',
    failed: 'text-gray-100',
    delayed: 'text-gray-100',
    paused: 'text-gray-100',
    'waiting-children': 'text-gray-900',
    prioritized: 'text-gray-100'
  }
  return textClasses[state] || 'text-gray-900'
}
</script>
