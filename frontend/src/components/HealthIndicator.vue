<template>
  <div class="flex items-center space-x-2">
    <div
      :class="[
        'w-3 h-3 rounded-full',
        healthStatus === 'healthy' ? 'bg-success-500' : 'bg-danger-500'
      ]"
    ></div>
    <span
      :class="[
        'text-sm font-medium',
        healthStatus === 'healthy' ? 'text-success-700' : 'text-danger-700'
      ]"
    >
      {{ healthStatus === 'healthy' ? 'Connected' : 'Disconnected' }}
    </span>
    <span v-if="latency" class="text-xs text-gray-500">
      ({{ latency }}ms)
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { apiClient } from '@/api/client'

const healthStatus = ref<'healthy' | 'unhealthy'>('healthy')
const latency = ref<number | undefined>()

let healthCheckInterval: ReturnType<typeof setInterval> | null = null

async function checkHealth() {
  try {
    const health = await apiClient.getHealth()
    healthStatus.value = health.status
    latency.value = health.redis.latency
  } catch (error) {
    healthStatus.value = 'unhealthy'
    latency.value = undefined
  }
}

onMounted(() => {
  checkHealth()
  healthCheckInterval = setInterval(checkHealth, 30000) // Check every 30 seconds
})

onUnmounted(() => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
  }
})
</script>
