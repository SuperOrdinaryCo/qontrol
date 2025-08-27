<template>
  <div class="fixed inset-0 z-50 overflow-hidden" v-if="isOpen" @click.self="close">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>

    <!-- Modal -->
    <div class="absolute inset-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
      <div class="flex h-full flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800">
          <div class="flex items-center space-x-3">
            <div class="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H8c-2.21 0-4-1.79-4-4zm0 0V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Redis Statistics</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">Real-time Redis server metrics and performance data</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <!-- Auto Refresh Toggle -->
            <button
              @click="toggleAutoRefresh"
              :class="[
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                autoRefresh
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              ]"
            >
              {{ autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF' }}
            </button>
            <!-- Refresh Button -->
            <button
              @click="fetchRedisStats"
              :disabled="loading"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <svg :class="['w-5 h-5', { 'animate-spin': loading }]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
            </button>
            <!-- Close Button -->
            <button
              @click="close"
              class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-6">
          <div v-if="loading && !stats" class="flex items-center justify-center h-full">
            <div class="text-center">
              <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="text-gray-600 dark:text-gray-400">Loading Redis statistics...</p>
            </div>
          </div>

          <div v-else-if="error" class="flex items-center justify-center h-full">
            <div class="text-center">
              <svg class="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Failed to load Redis stats</h4>
              <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
              <button @click="fetchRedisStats" class="btn-primary px-4 py-2 text-sm rounded-lg">
                Try Again
              </button>
            </div>
          </div>

          <div v-else-if="stats" class="space-y-6">
            <!-- Last Updated -->
            <div class="text-right text-sm text-gray-500 dark:text-gray-400">
              Last updated: {{ formatDate(stats.timestamp) }}
            </div>

            <!-- Overview Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Redis Version"
                :value="stats.info.redis_version"
                icon="server"
                color="primary"
              />
              <StatCard
                title="Uptime"
                :value="formatUptime(stats.info.uptime_in_seconds)"
                icon="clock"
                color="success"
              />
              <StatCard
                title="Connected Clients"
                :value="stats.info.connected_clients"
                icon="users"
                color="purple"
              />
              <StatCard
                title="Used Memory"
                :value="formatBytes(stats.info.used_memory)"
                icon="memory"
                color="orange"
              />
            </div>

            <!-- Detailed Sections -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Server Info -->
              <StatsSection
                title="Server Information"
                icon="server"
                :items="serverInfo"
              />

              <!-- Memory Stats -->
              <StatsSection
                title="Memory Usage"
                icon="memory"
                :items="memoryStats"
              />

              <!-- Performance Metrics -->
              <StatsSection
                title="Performance Metrics"
                icon="chart"
                :items="performanceStats"
              />

              <!-- Client Information -->
              <StatsSection
                title="Client Information"
                icon="users"
                :items="clientStats"
              />

              <!-- Persistence Info -->
              <StatsSection
                title="Persistence"
                icon="database"
                :items="persistenceStats"
              />

              <!-- Keyspace Stats -->
              <StatsSection
                title="Keyspace Statistics"
                icon="key"
                :items="keyspaceStats"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { apiClient } from '@/api/client'
import StatCard from './StatCard.vue'
import StatsSection from './StatsSection.vue'

interface Props {
  isOpen: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const error = ref<string | null>(null)
const stats = ref<any>(null)
const autoRefresh = ref(false)
let refreshInterval: ReturnType<typeof setInterval> | null = null

const serverInfo = computed(() => {
  if (!stats.value?.info) return []
  const info = stats.value.info
  return [
    { label: 'Version', value: info.redis_version },
    { label: 'Mode', value: info.redis_mode || 'standalone' },
    { label: 'OS', value: info.os },
    { label: 'Architecture', value: `${info.arch_bits}-bit` },
    { label: 'Process ID', value: info.process_id },
    { label: 'TCP Port', value: info.tcp_port },
    { label: 'Config File', value: info.config_file || 'N/A' },
  ]
})

const memoryStats = computed(() => {
  if (!stats.value?.info) return []
  const info = stats.value.info
  return [
    { label: 'Used Memory', value: formatBytes(info.used_memory) },
    { label: 'Used Memory RSS', value: formatBytes(info.used_memory_rss) },
    { label: 'Peak Memory', value: formatBytes(info.used_memory_peak) },
    { label: 'Memory Fragmentation', value: `${(info.mem_fragmentation_ratio || 0).toFixed(2)}x` },
    { label: 'Max Memory', value: info.maxmemory ? formatBytes(info.maxmemory) : 'No limit' },
    { label: 'Max Memory Policy', value: info.maxmemory_policy || 'N/A' },
  ]
})

const performanceStats = computed(() => {
  if (!stats.value?.info) return []
  const info = stats.value.info
  return [
    { label: 'Commands Processed', value: formatNumber(info.total_commands_processed) },
    { label: 'Instantaneous Ops/sec', value: formatNumber(info.instantaneous_ops_per_sec) },
    { label: 'Keyspace Hits', value: formatNumber(info.keyspace_hits) },
    { label: 'Keyspace Misses', value: formatNumber(info.keyspace_misses) },
    { label: 'Hit Rate', value: calculateHitRate(info.keyspace_hits, info.keyspace_misses) },
    { label: 'Expired Keys', value: formatNumber(info.expired_keys) },
    { label: 'Evicted Keys', value: formatNumber(info.evicted_keys) },
  ]
})

const clientStats = computed(() => {
  if (!stats.value?.info) return []
  const info = stats.value.info
  return [
    { label: 'Connected Clients', value: info.connected_clients },
    { label: 'Blocked Clients', value: info.blocked_clients },
    { label: 'Max Clients', value: info.maxclients },
    { label: 'Client Longest Output List', value: info.client_longest_output_list },
    { label: 'Client Biggest Input Buf', value: formatBytes(info.client_biggest_input_buf || 0) },
  ]
})

const persistenceStats = computed(() => {
  if (!stats.value?.info) return []
  const info = stats.value.info
  return [
    { label: 'RDB Changes Since Last Save', value: formatNumber(info.rdb_changes_since_last_save) },
    { label: 'Last Save Time', value: info.rdb_last_save_time ? formatDate(new Date(info.rdb_last_save_time * 1000)) : 'Never' },
    { label: 'Last Background Save', value: info.rdb_last_bgsave_status || 'N/A' },
    { label: 'AOF Enabled', value: info.aof_enabled ? 'Yes' : 'No' },
    { label: 'AOF Rewrite in Progress', value: info.aof_rewrite_in_progress ? 'Yes' : 'No' },
    { label: 'AOF Last Write Status', value: info.aof_last_write_status || 'N/A' },
  ]
})

const keyspaceStats = computed(() => {
  if (!stats.value?.info) return []
  const info = stats.value.info
  const keyspaceData = []

  // Extract keyspace information for each database
  for (let i = 0; i < 16; i++) {
    const dbKey = `db${i}`
    if (info[dbKey]) {
      const dbInfo = info[dbKey]
      // Parse format like "keys=1,expires=0,avg_ttl=0"
      const matches = dbInfo.match(/keys=(\d+),expires=(\d+),avg_ttl=(\d+)/)
      if (matches) {
        keyspaceData.push({
          label: `Database ${i}`,
          value: `${formatNumber(matches[1])} keys, ${formatNumber(matches[2])} expires`
        })
      }
    }
  }

  if (keyspaceData.length === 0) {
    keyspaceData.push({ label: 'No Data', value: 'No keyspace information available' })
  }

  return keyspaceData
})

function close() {
  emit('close')
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
}

async function fetchRedisStats() {
  if (loading.value) return

  loading.value = true
  error.value = null

  try {
    const response = await apiClient.getRedisStats()
    stats.value = response
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch Redis stats'
    console.error('Failed to fetch Redis stats:', err)
  } finally {
    loading.value = false
  }
}

function setupAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }

  if (autoRefresh.value) {
    refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRedisStats()
      }
    }, 5000) // Refresh every 5 seconds
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatNumber(num: number | string): string {
  if (!num) return '0'
  const number = typeof num === 'string' ? parseInt(num) : num
  return number.toLocaleString()
}

function formatUptime(seconds: number): string {
  if (!seconds) return '0s'

  const days = Math.floor(seconds / (24 * 3600))
  const hours = Math.floor((seconds % (24 * 3600)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString()
}

function calculateHitRate(hits: number, misses: number): string {
  const total = hits + misses
  if (total === 0) return '0%'
  return `${((hits / total) * 100).toFixed(1)}%`
}

// Watch for auto refresh changes
watch(autoRefresh, setupAutoRefresh)

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fetchRedisStats()
    if (autoRefresh.value) {
      setupAutoRefresh()
    }
  } else {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }
})

onMounted(() => {
  if (props.isOpen) {
    fetchRedisStats()
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
