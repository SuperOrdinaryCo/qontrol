<template>
  <div class="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" @click="$emit('click')">
    <div class="p-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <QueueListIcon class="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ queue.name }}</h3>
            <div class="flex items-center space-x-2 mt-1">
              <span v-if="queue.isPaused" class="state-paused">Paused</span>
              <span class="text-sm text-gray-500">{{ totalJobs }} jobs</span>
            </div>
          </div>
        </div>

        <ChevronRightIcon class="w-5 h-5 text-gray-400" />
      </div>

      <!-- Job State Badges -->
      <div class="mt-4 flex flex-wrap gap-2">
        <template v-for="[state, count] in Object.entries(queue.counts)" :key="state">
          <span v-if="count > 0" :class="`state-${state}`">
            {{ state }}: {{ count }}
          </span>
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
</script>
