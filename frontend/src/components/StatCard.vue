<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <div class="flex items-center">
      <component :is="iconComponent" class="w-8 h-8 mr-4" :class="iconColor" />
      <div>
        <p class="text-sm font-medium text-gray-500">{{ title }}</p>
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
    primary: 'text-primary-600',
    success: 'text-success-600',
    danger: 'text-danger-600',
    warning: 'text-warning-600',
  }
  return colors[props.color]
})

const textColor = computed(() => {
  const colors = {
    primary: 'text-primary-900',
    success: 'text-success-900',
    danger: 'text-danger-900',
    warning: 'text-warning-900',
  }
  return colors[props.color]
})

const formattedValue = computed(() => {
  return props.value.toLocaleString()
})
</script>
