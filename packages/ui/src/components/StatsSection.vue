<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <div :class="[
          'p-2 rounded-lg',
          iconColorClasses
        ]">
          <component :is="iconComponent" class="w-5 h-5" />
        </div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
      </div>
    </div>

    <div class="space-y-3">
      <div
        v-for="item in items"
        :key="item.label"
        class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
      >
        <span class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ item.label }}</span>
        <span class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ item.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ServerIcon,
  CpuChipIcon,
  ChartBarIcon,
  UsersIcon,
  CircleStackIcon,
  KeyIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'

interface Props {
  title: string
  icon: string
  items: Array<{ label: string; value: string | number }>
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const icons = {
    server: ServerIcon,
    memory: CpuChipIcon,
    chart: ChartBarIcon,
    users: UsersIcon,
    database: CircleStackIcon,
    key: KeyIcon,
    clock: ClockIcon
  }

  return icons[props.icon as keyof typeof icons] || ServerIcon
})

const iconColorClasses = computed(() => {
  return 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
})
</script>
