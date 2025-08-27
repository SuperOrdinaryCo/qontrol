<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6">
    <div class="flex items-center">
      <div :class="[
        'flex-shrink-0 p-3 rounded-lg',
        colorClasses
      ]">
        <component :is="iconComponent" class="w-6 h-6" />
      </div>
      <div class="ml-4 flex-1">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ title }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ formattedValue }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ServerIcon,
  CpuChipIcon,
  ClockIcon,
  UsersIcon
} from '@heroicons/vue/24/outline'

interface Props {
  title: string
  value: string | number
  icon: string
  color: string
}

const props = defineProps<Props>()

const iconComponent = computed(() => {
  const icons = {
    server: ServerIcon,
    memory: CpuChipIcon,
    clock: ClockIcon,
    users: UsersIcon
  }

  return icons[props.icon as keyof typeof icons] || ServerIcon
})

const colorClasses = computed(() => {
  const colors = {
    primary: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    success: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    danger: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
  }

  return colors[props.color as keyof typeof colors] || colors.blue
})

const formattedValue = computed(() => {
  if (typeof props.value === 'number' && props.value >= 1000) {
    return props.value.toLocaleString()
  }
  return props.value.toString()
})
</script>
