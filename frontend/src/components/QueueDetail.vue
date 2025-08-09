<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <button @click="$router.back()" class="text-gray-400 hover:text-gray-600">
          <ArrowLeftIcon class="w-6 h-6" />
        </button>
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{{ queueName }}</h2>
          <p class="text-gray-600">Queue details and jobs</p>
        </div>
      </div>

      <div class="flex items-center space-x-3">
        <button @click="refreshJobs" :disabled="loading" class="btn-secondary">
          <ArrowPathIcon class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Queue Stats as Tabs -->
    <div v-if="queueInfo" class="bg-white rounded-lg border border-gray-200">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Queue Statistics</h3>
        <span v-if="queueInfo.isPaused" class="state-paused">Paused</span>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="[state, count] in Object.entries(queueInfo.counts)"
            :key="state"
            @click="selectStateTab(state)"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              selectedStateTab === state
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            <div class="flex items-center space-x-2">
              <span class="capitalize">{{ state }}</span>
              <span
                :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStateTabStyle(state, selectedStateTab === state)
                ]"
              >
                {{ count }}
              </span>
            </div>
          </button>
        </nav>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border border-gray-200 p-6">
      <div class="flex flex-wrap items-center gap-6">
        <!-- Search -->
        <div class="flex-1 min-w-64">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search Jobs</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by job ID, name, or data..."
              class="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 sm:text-sm"
            />
            <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                @click="searchQuery = ''; applyFilters()"
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Sort -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <select
            v-model="sortBy"
            class="block w-36 py-3 px-3 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 sm:text-sm"
          >
            <option value="createdAt">Created</option>
            <option value="processedOn">Processed</option>
            <option value="finishedOn">Finished</option>
            <option value="duration">Duration</option>
            <option value="state">State</option>
            <option value="name">Name</option>
          </select>
        </div>

        <!-- Sort Order -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Order</label>
          <select
            v-model="sortOrder"
            class="block w-28 py-3 px-3 border border-gray-300 rounded-lg shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 sm:text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <!-- Apply Filters -->
        <div class="flex items-end">
          <button @click="applyFilters" class="btn-primary py-3 px-6 shadow-sm hover:shadow-md transition-shadow">
            Apply Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Selection Bar -->
    <div v-if="hasSelection" class="bg-primary-50 border border-primary-200 rounded-lg p-4">
      <div class="flex items-center justify-between">
        <span class="text-sm text-primary-800">
          {{ selection.selectedIds.size }} job(s) selected
        </span>
        <div class="flex items-center space-x-3">
          <button @click="clearSelection" class="text-sm text-primary-600 hover:text-primary-800">
            Clear selection
          </button>
          <!-- v2 bulk actions placeholder -->
          <button disabled class="btn-secondary opacity-50">
            Bulk Actions (v2)
          </button>
        </div>
      </div>
    </div>

    <!-- Jobs Table -->
    <div class="bg-white shadow rounded-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900">Jobs</h3>
          <span class="text-sm text-gray-500">
            {{ pagination.total }} total jobs
          </span>
        </div>
      </div>

      <div v-if="loading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 10" :key="i" class="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>

      <div v-else-if="jobs.length === 0" class="p-6 text-center text-gray-500">
        No jobs found
      </div>

      <div v-else>
        <!-- Table Header -->
        <div class="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div class="flex items-center">
            <input
              type="checkbox"
              :checked="selection.isAllSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-4"
            />
            <div class="jobs-table-grid text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div class="truncate">ID</div>
              <div class="truncate">Name</div>
              <div class="truncate">State</div>
              <div class="truncate">Created</div>
              <div class="truncate">Duration</div>
              <div class="truncate">Attempts</div>
              <div class="truncate">Priority</div>
              <div class="truncate">Actions</div>
            </div>
          </div>
        </div>

        <!-- Table Body -->
        <div class="divide-y divide-gray-200">
          <div
            v-for="job in jobs"
            :key="job.id"
            class="px-6 py-4 hover:bg-gray-50 cursor-pointer"
            @click="toggleJobSelection(job.id)"
          >
            <div class="flex items-center">
              <input
                type="checkbox"
                :checked="selection.selectedIds.has(job.id)"
                @click.stop
                @change="toggleJobSelection(job.id)"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-4"
              />
              <div class="jobs-table-grid items-center text-sm">
                <div class="font-mono text-xs truncate" :title="job.id">{{ job.id }}</div>
                <div class="truncate" :title="job.name">{{ job.name }}</div>
                <div>
                  <span :class="`state-${job.state}`">{{ job.state }}</span>
                </div>
                <div class="text-gray-500 truncate" :title="formatTimestamp(job.createdAt)">
                  {{ formatTimestamp(job.createdAt) }}
                </div>
                <div class="text-gray-500 truncate">
                  {{ job.duration ? formatDuration(job.duration) : '-' }}
                </div>
                <div class="text-center">{{ job.attempts }}</div>
                <div class="text-center">{{ job.priority || '-' }}</div>
                <div>
                  <button
                    @click.stop="viewJobDetail(job.id)"
                    class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="pagination.totalPages > 1" class="flex items-center justify-between">
      <div class="text-sm text-gray-700">
        Showing page {{ pagination.page }} of {{ pagination.totalPages }}
        ({{ pagination.total }} total jobs)
      </div>

      <div class="flex items-center space-x-2">
        <button
          @click="goToPage(pagination.page - 1)"
          :disabled="pagination.page <= 1"
          class="btn-secondary disabled:opacity-50"
        >
          Previous
        </button>

        <div class="flex space-x-1">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            :class="[
              'px-3 py-2 text-sm rounded-md',
              page === pagination.page
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            ]"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="goToPage(pagination.page + 1)"
          :disabled="pagination.page >= pagination.totalPages"
          class="btn-secondary disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useJobsStore } from '@/stores/jobs'
import { useQueuesStore } from '@/stores/queues'
import { useSettingsStore } from '@/stores/settings'
import { ArrowLeftIcon, ArrowPathIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { formatTimestamp, formatDuration } from '@/utils/date'

const route = useRoute()
const jobsStore = useJobsStore()
const queuesStore = useQueuesStore()
const settingsStore = useSettingsStore()

const queueName = computed(() => route.params.name as string)

const {
  jobs,
  loading,
  pagination,
  filters,
  selection,
  hasSelection,
} = storeToRefs(jobsStore)

const { settings, autoRefreshEnabled } = storeToRefs(settingsStore)

// Local filter state
const selectedStateTab = ref<string>('waiting')
const searchQuery = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null

const queueInfo = computed(() =>
  queuesStore.getQueueByName(queueName.value)
)

const totalJobs = computed(() => {
  if (!queueInfo.value) return 0
  return Object.values(queueInfo.value.counts).reduce((a, b) => a + b, 0)
})

const visiblePages = computed(() => {
  const current = pagination.value.page
  const total = pagination.value.totalPages
  const delta = 2

  const range = []
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    range.push(i)
  }

  return range
})

function getStateColor(state: string): string {
  const colors: Record<string, string> = {
    waiting: 'text-gray-600',
    active: 'text-primary-600',
    completed: 'text-success-600',
    failed: 'text-danger-600',
    delayed: 'text-warning-600',
    paused: 'text-gray-500',
    'waiting-children': 'text-blue-600',
  }
  return colors[state] || 'text-gray-600'
}

function getStateTabStyle(state: string, isSelected: boolean) {
  if (isSelected) {
    return 'bg-primary-100 text-primary-800'
  } else {
    return 'bg-gray-100 text-gray-800'
  }
}

function selectStateTab(state: string) {
  selectedStateTab.value = state

  // Update filters based on selected tab (always filter by specific state)
  jobsStore.updateFilters({
    states: [state] as any,
    search: searchQuery.value || undefined,
    sortBy: sortBy.value as any,
    sortOrder: sortOrder.value as any,
    page: 1,
  })

  // Don't preserve selection when changing tabs (original behavior)
  fetchJobs(false)
}

function applyFilters() {
  // Apply current tab state along with other filters
  jobsStore.updateFilters({
    states: [selectedStateTab.value] as any,
    search: searchQuery.value || undefined,
    sortBy: sortBy.value as any,
    sortOrder: sortOrder.value as any,
    page: 1, // Reset to first page
  })
  // Don't preserve selection when applying filters (original behavior)
  fetchJobs(false)
}

function refreshJobs() {
  // Preserve selection when manually refreshing (with visible loading)
  fetchJobs(true, false)
}

function fetchJobs(preserveSelection = false, silentRefresh = false) {
  jobsStore.fetchJobs(queueName.value, filters.value, preserveSelection, silentRefresh)
}

function goToPage(page: number) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    jobsStore.updatePage(page)
    // Don't preserve selection when changing pages (original behavior)
    fetchJobs(false)
  }
}

function toggleSelectAll() {
  jobsStore.toggleSelectAll()
}

function toggleJobSelection(jobId: string) {
  jobsStore.toggleJobSelection(jobId)
}

function clearSelection() {
  jobsStore.clearSelection()
}

function viewJobDetail(jobId: string) {
  jobsStore.fetchJobDetail(queueName.value, jobId)
}

function setupAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  if (autoRefreshEnabled.value && settings.value.autoRefreshInterval > 0) {
    refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Preserve selection during auto-refresh AND make it silent
        fetchJobs(true, true)
      }
    }, settings.value.autoRefreshInterval * 1000)
  }
}

onMounted(() => {
  // Load queue info first
  queuesStore.fetchQueues()

  // Set default tab - try to restore from localStorage, otherwise default to 'waiting'
  const savedState = localStorage.getItem(`queue-${queueName.value}-selectedState`)
  if (savedState && ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'waiting-children'].includes(savedState)) {
    selectedStateTab.value = savedState
  } else {
    selectedStateTab.value = 'waiting'
  }

  // Update filters with the selected state before fetching jobs
  jobsStore.updateFilters({
    states: [selectedStateTab.value] as any,
    search: searchQuery.value || undefined,
    sortBy: sortBy.value as any,
    sortOrder: sortOrder.value as any,
    page: 1,
  })

  // Load jobs with the selected state (no selection to preserve on initial load)
  fetchJobs(false)

  // Setup auto-refresh
  setupAutoRefresh()
})

// Watch for tab changes to save to localStorage
watch(selectedStateTab, (newState) => {
  localStorage.setItem(`queue-${queueName.value}-selectedState`, newState)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // Reset jobs store when leaving
  jobsStore.reset()
})

// Watch for settings changes
watch([autoRefreshEnabled, () => settings.value.autoRefreshInterval], setupAutoRefresh)
</script>

<style scoped>
.jobs-table-grid {
  display: grid;
  grid-template-columns:
    minmax(6rem, 0.8fr)   /* ID */
    minmax(8rem, 2fr)     /* Name */
    minmax(4rem, 0.8fr)   /* State */
    minmax(6rem, 1.2fr)   /* Created */
    minmax(5rem, 1fr)     /* Duration */
    minmax(4rem, 0.6fr)   /* Attempts */
    minmax(4rem, 0.6fr)   /* Priority */
    minmax(4rem, 0.6fr);  /* Actions */
  gap: 1rem;
  align-items: center;
  width: 100%;
}

.jobs-table-grid > div {
  min-width: 0; /* Allow items to shrink below their content size */
  overflow: hidden;
}
</style>
