<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
    <div class="flex items-center">
      <component :is="iconComponent" class="w-8 h-8 mr-4" :class="iconColor" />
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-200">{{ title }}</p>
        <p class="text-2xl font-bold" :class="textColor">{{ formattedValue }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  QueueListIcon,
  BriefcaseIcon,
  PlayIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

interface Props {
  title: string
  value: number
  icon: string
  color: 'primary' | 'success' | 'danger' | 'warning'
}

const props = defineProps<Props>()

const iconComponents = {
  QueueListIcon,
  BriefcaseIcon,
  PlayIcon,
  ExclamationTriangleIcon,
}

const iconComponent = computed(() => iconComponents[props.icon as keyof typeof iconComponents])

const iconColor = computed(() => {
  const colors = {
    primary: 'text-primary-600 dark:text-primary-800',
    success: 'text-success-600 dark:text-success-800',
    danger: 'text-danger-600 dark:text-danger-800',
    warning: 'text-warning-600 dark:text-warning-800',
  }
  return colors[props.color]
})

const textColor = computed(() => {
  const colors = {
    primary: 'text-primary-900 dark:text-primary-700',
    success: 'text-success-900 dark:text-success-700',
    danger: 'text-danger-900 dark:text-danger-700',
    warning: 'text-warning-900 dark:text-warning-700',
  }
  return colors[props.color]
})

const formattedValue = computed(() => {
  return props.value.toLocaleString()
})
</script>
