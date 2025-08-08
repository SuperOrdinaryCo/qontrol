<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Queue Dashboard</h2>
        <p class="text-gray-600">Monitor your BullMQ queues and jobs</p>
      </div>

      <div class="flex items-center space-x-3">
        <button
          @click="refreshQueues"
          :disabled="loading"
          class="btn-secondary"
        >
          <ArrowPathIcon class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Queues"
        :value="filteredQueues.length"
        icon="QueueListIcon"
        color="primary"
      />
      <StatCard
        title="Total Jobs"
        :value="totalJobs"
        icon="BriefcaseIcon"
        color="primary"
      />
      <StatCard
        title="Active Jobs"
        :value="queuesByState.active || 0"
        icon="PlayIcon"
        color="success"
      />
      <StatCard
        title="Failed Jobs"
        :value="queuesByState.failed || 0"
        icon="ExclamationTriangleIcon"
        color="danger"
      />
    </div>

    <!-- Error State -->
    <div v-if="error" class="bg-danger-50 border border-danger-200 rounded-lg p-4">
      <div class="flex">
        <ExclamationTriangleIcon class="h-5 w-5 text-danger-400" />
        <div class="ml-3">
          <h3 class="text-sm font-medium text-danger-800">Error loading queues</h3>
          <p class="mt-1 text-sm text-danger-700">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Queues List -->
    <div class="bg-white shadow rounded-lg">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Queues</h3>
          
          <!-- Search Input -->
          <div class="relative max-w-xs">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search queues..."
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                @click="clearSearch"
                class="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon class="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading && queues.length === 0" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 3" :key="i" class="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else-if="sortedQueues.length === 0 && searchQuery" class="p-6 text-center text-gray-500">
        <div class="space-y-2">
          <MagnifyingGlassIcon class="h-8 w-8 text-gray-300 mx-auto" />
          <p>No queues found matching "{{ searchQuery }}"</p>
          <button
            @click="clearSearch"
            class="text-blue-600 hover:text-blue-500 text-sm"
          >
            Clear search
          </button>
        </div>
      </div>

      <div v-else-if="queues.length === 0" class="p-6 text-center text-gray-500">
        No queues found
      </div>

      <div v-else class="divide-y divide-gray-200">
        <QueueCard
          v-for="queue in sortedQueues"
          :key="queue.name"
          :queue="queue"
          @click="navigateToQueue(queue.name)"
        />
      </div>
    </div>

    <!-- Last Updated -->
    <div v-if="lastUpdated" class="text-sm text-gray-500 text-center">
      Last updated: {{ formatTimestamp(lastUpdated) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useQueuesStore } from '@/stores/queues'
import { useSettingsStore } from '@/stores/settings'
import { ArrowPathIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import StatCard from '@/components/StatCard.vue'
import QueueCard from '@/components/QueueCard.vue'
import { formatTimestamp } from '@/utils/date'

const router = useRouter()
const queuesStore = useQueuesStore()
const settingsStore = useSettingsStore()

const {
  queues,
  loading,
  error,
  lastUpdated,
  totalJobs,
  queuesByState,
  filteredQueues,
  sortedQueues,
  searchQuery,
} = storeToRefs(queuesStore)

const { settings, autoRefreshEnabled } = storeToRefs(settingsStore)

let refreshInterval: ReturnType<typeof setInterval> | null = null

function refreshQueues() {
  queuesStore.fetchQueues()
}

function navigateToQueue(queueName: string) {
  router.push({ name: 'queue-detail', params: { name: queueName } })
}

function clearSearch() {
  queuesStore.clearSearch()
}

function setupAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  if (autoRefreshEnabled.value && settings.value.autoRefreshInterval > 0) {
    refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshQueues()
      }
    }, settings.value.autoRefreshInterval * 1000)
  }
}

onMounted(() => {
  refreshQueues()
  setupAutoRefresh()
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Watch for settings changes
import { watch } from 'vue'
watch([autoRefreshEnabled, () => settings.value.autoRefreshInterval], setupAutoRefresh)
</script>
