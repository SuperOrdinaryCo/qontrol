<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <button @click="$router.back()" class="text-gray-400 hover:text-gray-600 dark:text-gray-100 hober:dark:text-gray-300">
          <ArrowLeftIcon class="w-6 h-6" />
        </button>
        <div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-200">{{ queueName }}</h2>
          <p class="text-gray-600 dark:text-gray-400">Queue details and jobs</p>
        </div>
      </div>

      <div class="flex items-center space-x-3">
        <!-- Queue Clean Button -->
        <button
            @click="showCleanDialog(selectedStateTab)"
            :disabled="cleaningQueue || !canCleanSelectedState"
            class="btn-secondary flex items-center text-red-600 hover:text-red-500 border-red-300 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrashIcon class="w-4 h-4 mr-2" :class="{ 'animate-pulse': cleaningQueue }" />
          {{ cleaningQueue ? 'Cleaning...' : `Clean ${selectedStateTab}` }}
        </button>

        <button @click="refreshJobs" :disabled="loading" class="btn-secondary flex items-center">
          <ArrowPathIcon class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>

        <!-- Pause/Resume Queue Button -->
        <button
          v-if="queueInfo"
          @click="toggleQueuePause"
          :disabled="pausingQueue"
          :class="[
            'btn-secondary flex items-center',
            queueInfo.isPaused
              ? 'text-green-600 hover:text-green-700 border-green-300 hover:border-green-400'
              : 'text-orange-600 hover:text-orange-500 border-orange-300 hover:border-orange-400'
          ]"
        >
          <component
            :is="queueInfo.isPaused ? PlayIcon : PauseIcon"
            class="w-4 h-4 mr-2"
            :class="{ 'animate-pulse': pausingQueue }"
          />
          {{ pausingQueue ? 'Processing...' : (queueInfo.isPaused ? 'Resume' : 'Pause') }}
        </button>
      </div>
    </div>

    <!-- Queue Stats as Tabs -->
    <div v-if="queueInfo" class="bg-white dark:bg-gray-800  rounded-lg border border-gray-200 dark:border-gray-800">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Queue Statistics</h3>
        <span v-if="queueInfo.isPaused" class="state-paused">Paused</span>
      </div>

      <!-- Tab Navigation -->
      <div class="border-b border-gray-200 dark:border-gray-800">
        <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            v-for="[state, count] in Object.entries(queueInfo.counts)"
            :key="state"
            @click="selectStateTab(state)"
            :class="[
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              selectedStateTab === state
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 hover:border-gray-300'
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
    <div class="bg-white dark:bg-gray-800  rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div class="flex flex-wrap items-end gap-6">
        <!-- Job ID Search -->
        <div class="min-w-64">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Find Job by ID</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <HashtagIcon class="h-5 w-5 text-gray-400 dark:text-gray-800" />
            </div>
            <input
              v-model="jobIdQuery"
              type="text"
              placeholder="Enter job ID for instant lookup..."
              class="block w-full pl-10 pr-4 py-3 border dark:text-gray-800 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 sm:text-sm"
              @keyup.enter="searchByJobId"
            />
            <div v-if="jobIdQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                @click="jobIdQuery = ''; clearJobIdSearch()"
                class="text-gray-400 hover:text-gray-600 dark:text-gray-800 hover:dark:text-gray-600 transition-colors"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
          <div v-if="jobIdQuery" class="mt-1 text-xs text-blue-600">
            Press Enter or wait for instant search...
          </div>
        </div>

        <!-- Data/Name Search -->
        <div class="flex-1 min-w-64">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Search Jobs Content</label>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400 dark:text-gray-800" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by job name or data content..."
              class="block w-full pl-10 pr-4 py-3 border dark:text-gray-800 border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 sm:text-sm"
            />
            <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <button
                @click="searchQuery = ''; applyFilters()"
                class="text-gray-400 hover:text-gray-600 dark:text-gray-800 hover:dark:text-gray-600 transition-colors"
              >
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
          <div v-if="searchQuery" class="mt-1 text-xs text-gray-600 dark:text-gray-200">
            Heavy search through job names and data
          </div>
        </div>

        <!-- Sort -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Sort by</label>
          <select
            v-model="sortBy"
            class="block w-36 py-3 px-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 sm:text-sm"
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
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Order</label>
          <select
            v-model="sortOrder"
            class="block w-28 py-3 px-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 focus:outline-none transition-all duration-200 sm:text-sm"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>

        <!-- Apply Filters -->
        <div class="flex items-end h-full">
          <button @click="applyFilters" class="btn-primary py-3 px-6 shadow-sm hover:shadow-md transition-shadow">
            Apply Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Jobs Table -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-visible">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Jobs</h3>

          <!-- Selection Bar (moved from above) -->
          <div v-if="hasSelection" class="flex items-center space-x-4">
            <span class="text-sm text-primary-600">
              {{ selection.selectedIds.size }} job(s) selected
            </span>
            <div class="flex items-center space-x-3">
              <button @click="clearSelection" class="text-sm text-primary-600 hover:text-primary-800">
                Clear selection
              </button>
              <!-- Bulk Retry Button (only show if failed jobs are selected) -->
              <button
                v-if="hasFailedJobsSelected"
                @click="handleBulkRetry"
                :disabled="bulkRetrying"
                class="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ bulkRetrying ? 'Retrying...' : 'Retry Selected' }}
              </button>
              <!-- Bulk Remove Button -->
              <button
                @click="handleBulkRemove"
                :disabled="bulkRemoving"
                class="text-xs px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ bulkRemoving ? 'Removing...' : 'Remove Selected' }}
              </button>
            </div>
          </div>

          <span class="text-sm text-gray-500">
            {{ pagination.total }} total jobs
          </span>
        </div>
      </div>

      <div v-if="loading" class="p-6">
        <div class="animate-pulse space-y-4">
          <div v-for="i in 10" :key="i" class="h-12 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>

      <div v-else-if="jobs.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-100">
        No jobs found
      </div>

      <div v-else>
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
          <div class="flex items-center">
            <input
              type="checkbox"
              :checked="selection.isAllSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:text-gray-600 rounded mr-4"
            />
            <div class="jobs-table-grid text-xs font-medium text-gray-500 dark:text-gray-100 uppercase tracking-wider">
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
        <div class="divide-y divide-gray-200 dark:divide-gray-600">
          <div
            v-for="(job, index) in jobs"
            :key="job.id"
            class="px-6 py-4 hover:bg-gray-50 hover:dark:bg-gray-700 cursor-pointer relative"
            @click="handleJobClick(job.id, index, $event)"
          >
            <div class="flex items-center">
              <input
                type="checkbox"
                :checked="selection.selectedIds.has(job.id)"
                @click.stop="handleJobClick(job.id, index, $event)"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded mr-4"
              />
              <div class="jobs-table-grid items-center text-sm">
                <div class="font-mono text-xs truncate dark:text-gray-100" :title="job.id">{{ job.id }}</div>
                <div class="truncate dark:text-gray-100" :title="job.name">{{ job.name }}</div>
                <div>
                  <span :class="`state-${job.state} dark:text-gray-100`">{{ job.state }}</span>
                </div>
                <div class="text-gray-500 dark:text-gray-100 truncate" :title="formatTimestamp(job.createdAt)">
                  {{ formatTimestamp(job.createdAt) }}
                </div>
                <div class="text-gray-500 dark:text-gray-100 truncate">
                  {{ job.duration ? formatDuration(job.duration) : '-' }}
                </div>
                <div class="text-center dark:text-gray-100">{{ job.attempts }}</div>
                <div class="text-center dark:text-gray-100">{{ job.priority || '-' }}</div>
                <div class="flex items-center space-x-2">
                  <button
                    @click.stop="viewJobDetail(job.id)"
                    class="text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    View
                  </button>
                  
                  <!-- Actions Dropdown -->
                  <div @click.stop>
                    <button
                      @click="toggleDropdown(job.id)"
                      class="p-1 text-gray-400 dark:text-gray-400 hover:dark:text-gray-200 hover:text-gray-600 transition-colors"
                      :class="{ 'text-gray-600 dark:text-gray-200': activeDropdown === job.id }"
                    >
                      <EllipsisVerticalIcon class="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dropdown Menu (moved to row level) -->
            <div
              v-if="activeDropdown === job.id"
              class="absolute right-6 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50"
              @click.stop
            >
              <!-- State-specific actions -->
              <button
                v-if="job.state === 'failed'"
                @click="handleRetryJob(job.id)"
                class="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-2"
              >
                <ArrowPathIcon class="h-4 w-4" />
                <span>Retry Job</span>
              </button>

              <button
                v-if="['waiting', 'waiting-children', 'active'].includes(job.state)"
                @click="handleDiscardJob(job.id)"
                class="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 hover:text-orange-700 flex items-center space-x-2"
              >
                <StopIcon class="h-4 w-4" />
                <span>Discard Job</span>
              </button>

              <button
                v-if="job.state === 'delayed'"
                @click="handlePromoteJob(job.id)"
                class="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 hover:text-green-700 flex items-center space-x-2"
              >
                <ArrowUpIcon class="h-4 w-4" />
                <span>Promote Job</span>
              </button>

              <!-- Separator if there are state-specific actions -->
              <div
                v-if="['waiting', 'waiting-children', 'active', 'failed', 'delayed'].includes(job.state)"
                class="border-t border-gray-100 my-1"
              ></div>

              <!-- Remove action (always available) -->
              <button
                @click="handleRemoveJob(job.id)"
                :disabled="removingJobId === job.id"
                class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-800 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <TrashIcon class="h-4 w-4" />
                <span>{{ removingJobId === job.id ? 'Removing...' : 'Remove Job' }}</span>
              </button>
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

    <!-- Custom Confirmation Dialog -->
    <ConfirmDialog
      v-model:isOpen="showConfirmDialog"
      :title="confirmDialogTitle"
      :message="confirmDialogMessage"
      :details="confirmDialogDetails"
      :loading="removingJobId !== null"
      confirm-text="Remove Job"
      cancel-text="Cancel"
      @confirm="confirmRemoveJob"
      @cancel="cancelRemoveJob"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useJobsStore } from '@/stores/jobs'
import { useQueuesStore } from '@/stores/queues'
import { useSettingsStore } from '@/stores/settings'
import { ArrowLeftIcon, ArrowPathIcon, MagnifyingGlassIcon, XMarkIcon, HashtagIcon, EllipsisVerticalIcon, TrashIcon, StopIcon, ArrowUpIcon, PlayIcon, PauseIcon } from '@heroicons/vue/24/outline'
import { formatTimestamp, formatDuration } from '@/utils/date'
import ConfirmDialog from './ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
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
const jobIdQuery = ref('')

// Removal state
const removingJobId = ref<string | null>(null)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmDialogTitle = ref('')
const confirmDialogMessage = ref('')
const confirmDialogDetails = ref('')
const jobToRemove = ref<string | null>(null)

// Dropdown menu state
const activeDropdown = ref<string | null>(null)

// Bulk removal state
const bulkRemoving = ref(false)

// Bulk retry state
const bulkRetrying = ref(false)

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null
let jobIdSearchTimeout: ReturnType<typeof setTimeout> | null = null

// Queue pause/resume state
const pausingQueue = ref(false)

// Queue cleaning state
const cleaningQueue = ref(false)
const cleanAction = ref<string | null>(null)

// Bulk selection state
const lastSelectedIndex = ref<number>(-1)

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

// Check if any selected jobs are failed (for bulk retry feature)
const hasFailedJobsSelected = computed(() => {
  if (!hasSelection.value) return false

  const selectedJobs = jobs.value.filter(job => selection.value.selectedIds.has(job.id))
  return selectedJobs.some(job => job.state === 'failed')
})

// Check if the currently selected state can be cleaned
const canCleanSelectedState = computed(() => {
  // Only allow cleaning certain states that make sense
  const cleanableStates = ['completed', 'wait', 'waiting', 'active', 'paused', 'prioritized', 'delayed', 'failed']
  return cleanableStates.includes(selectedStateTab.value)
})

function getStateColor(state: string): string {
  const colors: Record<string, string> = {
    waiting: 'text-gray-600',
    active: 'text-primary-600',
    completed: 'text-success-600',
    failed: 'text-danger-600',
    delayed: 'text-warning-600',
    paused: 'text-gray-500',
    prioritized: 'text-purple-600',
    'waiting-children': 'text-blue-600',
  }
  return colors[state] || 'text-gray-600'
}

function getStateTabStyle(state: string, isSelected: boolean) {
  if (isSelected) {
    return 'bg-primary-100 text-primary-800'
  } else {
    return 'bg-gray-100 dark:bg-gray-200 text-gray-800 dark:text-gray-800'
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
  // Also refresh queue info to update counts - now using optimized single queue fetch
  queuesStore.fetchQueue(queueName.value)
}

function fetchJobs(preserveSelection = false, silentRefresh = false) {
  jobsStore.fetchJobs(queueName.value, filters.value, preserveSelection, silentRefresh)
}

function searchByJobId() {
  if (!jobIdQuery.value.trim()) return

  // Clear any existing search to avoid conflicts
  searchQuery.value = ''

  // Use the new job ID search functionality
  jobsStore.fetchJobById(queueName.value, jobIdQuery.value.trim())
}

function clearJobIdSearch() {
  // Clear job ID search and return to normal view
  fetchJobs(false)
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

function handleJobClick(jobId: string, index: number, event: Event) {
  // Close any open dropdowns when selecting jobs
  activeDropdown.value = null

  if (event instanceof MouseEvent && event.shiftKey && lastSelectedIndex.value !== -1) {
    // Shift+click: select range
    handleRangeSelection(index)
  } else {
    // Regular click: toggle single job
    jobsStore.toggleJobSelection(jobId)
    lastSelectedIndex.value = index
  }
}

function handleRangeSelection(currentIndex: number) {
  const startIndex = Math.min(lastSelectedIndex.value, currentIndex)
  const endIndex = Math.max(lastSelectedIndex.value, currentIndex)

  // Get all job IDs in the range
  const jobsInRange = jobs.value.slice(startIndex, endIndex + 1)

  // Check if all jobs in range are already selected
  const allInRangeSelected = jobsInRange.every(job => selection.value.selectedIds.has(job.id))

  if (allInRangeSelected) {
    // If all are selected, deselect the range
    jobsInRange.forEach(job => {
      if (selection.value.selectedIds.has(job.id)) {
        jobsStore.toggleJobSelection(job.id)
      }
    })
  } else {
    // If some or none are selected, select all in range
    jobsInRange.forEach(job => {
      if (!selection.value.selectedIds.has(job.id)) {
        jobsStore.toggleJobSelection(job.id)
      }
    })
  }
}

function clearSelection() {
  jobsStore.clearSelection()
}

function viewJobDetail(jobId: string) {
  jobsStore.fetchJobDetail(queueName.value, jobId)
}

async function handleRemoveJob(jobId: string) {
  if (removingJobId.value) return // Prevent multiple simultaneous removals

  // Show confirmation dialog
  showConfirmDialog.value = true
  confirmDialogTitle.value = 'Confirm Job Removal'
  confirmDialogMessage.value = `Are you sure you want to remove job ${jobId}? This action cannot be undone and will also remove any child jobs.`
  confirmDialogDetails.value = ''
  jobToRemove.value = jobId
}

function confirmRemoveJob() {
  // Check if this is a queue cleaning action
  if (cleanAction.value) {
    performCleanAction()
    return
  }

  if (!jobToRemove.value) return

  // Check if this is a bulk removal (jobToRemove contains comma-separated IDs)
  const isBulkRemoval = jobToRemove.value.includes(',')

  if (isBulkRemoval) {
    // Handle bulk removal
    const jobIds = jobToRemove.value.split(', ')
    bulkRemoving.value = true

    jobsStore.bulkRemoveJobs(queueName.value, jobIds)
      .then((result) => {
        console.log(`Bulk removal completed: ${result.success} success, ${result.failed} failed`)
        if (result.failed > 0) {
          // Show errors if any jobs failed to remove
          const errorMessage = `${result.success} jobs removed successfully. ${result.failed} jobs failed to remove.`
          alert(errorMessage)
        }
      })
      .catch((error) => {
        console.error('Failed to bulk remove jobs:', error)
        alert('Failed to bulk remove jobs. Please try again.')
      })
      .finally(() => {
        bulkRemoving.value = false
        showConfirmDialog.value = false
        jobToRemove.value = null
      })
  } else {
    // Handle single job removal (existing logic)
    removingJobId.value = jobToRemove.value

    jobsStore.removeJob(queueName.value, removingJobId.value)
      .then(() => {
        console.log(`Job ${removingJobId.value} removed successfully`)
      })
      .catch((error) => {
        console.error('Failed to remove job:', error)
        alert('Failed to remove job. Please try again.')
      })
      .finally(() => {
        removingJobId.value = null
        showConfirmDialog.value = false
        jobToRemove.value = null
      })
  }
}

function cancelRemoveJob() {
  showConfirmDialog.value = false
  jobToRemove.value = null
}

function toggleDropdown(jobId: string) {
  if (activeDropdown.value === jobId) {
    activeDropdown.value = null
  } else {
    activeDropdown.value = jobId
  }
}

function handleRetryJob(jobId: string) {
  activeDropdown.value = null
  jobsStore.retryJob(queueName.value, jobId)
    .then(() => {
      console.log(`Job ${jobId} retried successfully`)
    })
    .catch((error) => {
      console.error('Failed to retry job:', error)
      alert('Failed to retry job. Please try again.')
    })
}

function handleDiscardJob(jobId: string) {
  activeDropdown.value = null
  jobsStore.discardJob(queueName.value, jobId)
    .then(() => {
      console.log(`Job ${jobId} discarded successfully`)
    })
    .catch((error) => {
      console.error('Failed to discard job:', error)
      alert('Failed to discard job. Please try again.')
    })
}

function handlePromoteJob(jobId: string) {
  activeDropdown.value = null
  jobsStore.promoteJob(queueName.value, jobId)
    .then(() => {
      console.log(`Job ${jobId} promoted successfully`)
    })
    .catch((error) => {
      console.error('Failed to promote job:', error)
      alert('Failed to promote job. Please try again.')
    })
}

function handleBulkRemove() {
  // Collect all selected job IDs
  const jobIds = Array.from(selection.value.selectedIds)

  if (jobIds.length === 0) return

  // Show confirmation dialog for bulk removal
  showConfirmDialog.value = true
  confirmDialogTitle.value = 'Confirm Bulk Job Removal'
  confirmDialogMessage.value = `Are you sure you want to remove ${jobIds.length} job(s)? This action cannot be undone and will also remove any child jobs.`
  confirmDialogDetails.value = ''
  jobToRemove.value = jobIds.join(', ')
}

function handleBulkRetry() {
  // Collect all selected job IDs that are failed
  const selectedJobs = jobs.value.filter(job => selection.value.selectedIds.has(job.id))
  const failedJobIds = selectedJobs.filter(job => job.state === 'failed').map(job => job.id)

  if (failedJobIds.length === 0) return

  bulkRetrying.value = true

  jobsStore.bulkRetryJobs(queueName.value, failedJobIds)
    .then((result) => {
      console.log(`Bulk retry completed: ${result.success} success, ${result.failed} failed`)
      if (result.failed > 0) {
        // Show errors if any jobs failed to retry
        const errorMessage = `${result.success} jobs retried successfully. ${result.failed} jobs failed to retry.`
        alert(errorMessage)
      }
    })
    .catch((error) => {
      console.error('Failed to bulk retry jobs:', error)
      alert('Failed to bulk retry jobs. Please try again.')
    })
    .finally(() => {
      bulkRetrying.value = false
    })
}

async function toggleQueuePause() {
  if (!queueInfo.value || pausingQueue.value) return

  try {
    pausingQueue.value = true

    if (queueInfo.value.isPaused) {
      // Resume the queue
      await queuesStore.resumeQueue(queueName.value)
      console.log(`Queue ${queueName.value} resumed successfully`)
    } else {
      // Pause the queue
      await queuesStore.pauseQueue(queueName.value)
      console.log(`Queue ${queueName.value} paused successfully`)
    }

    // Refresh queue info to get updated status
    await queuesStore.fetchQueue(queueName.value)
  } catch (error) {
    console.error('Failed to toggle queue pause:', error)
    alert(`Failed to ${queueInfo.value.isPaused ? 'resume' : 'pause'} queue. Please try again.`)
  } finally {
    pausingQueue.value = false
  }
}

function setupAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  if (autoRefreshEnabled.value && settings.value.autoRefreshInterval > 0) {
    refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Check if we're in job ID search mode
        if (jobIdQuery.value.trim()) {
          // Refresh the job ID search silently to avoid dropping/refilling table
          jobsStore.fetchJobById(queueName.value, jobIdQuery.value.trim(), true)
        } else {
          // Update filters with current search state before auto-refresh
          jobsStore.updateFilters({
            states: [selectedStateTab.value] as any,
            search: searchQuery.value || undefined,
            sortBy: sortBy.value as any,
            sortOrder: sortOrder.value as any,
            page: filters.value.page, // Keep current page
          })

          // Preserve selection during auto-refresh AND make it silent
          fetchJobs(true, true)
        }

        // Always refresh queue counts during auto-refresh - now using optimized single queue fetch
        queuesStore.fetchQueue(queueName.value).catch(error => {
          console.error('Failed to refresh queue counts during auto-refresh:', error)
        })
      }
    }, settings.value.autoRefreshInterval * 1000)
  }
}

// Queue cleaning functions
function toggleCleanMenu() {
  showCleanMenu.value = !showCleanMenu.value
}

function showCleanDialog(action: string) {
  cleanAction.value = action

  // Set up confirmation dialog based on action
  showConfirmDialog.value = true
  confirmDialogTitle.value = `Clean ${action.charAt(0).toUpperCase() + action.slice(1)} Jobs`
  confirmDialogMessage.value = `Are you sure you want to clean all ${action} jobs from queue "${queueName.value}"?`
  confirmDialogDetails.value = `This will permanently remove all ${action} jobs from the queue. This action cannot be undone.`
}

async function performCleanAction() {
  if (!cleanAction.value) return

  try {
    cleaningQueue.value = true

    // Use the selected state directly for cleaning
    const result = await queuesStore.cleanQueue(queueName.value, { type: cleanAction.value as any })
    console.log(`Cleaned ${result.cleaned} ${cleanAction.value} jobs`)

    // Refresh queue info and jobs after cleaning
    await queuesStore.fetchQueue(queueName.value)
    refreshJobs()
  } catch (error) {
    console.error(`Failed to clean ${cleanAction.value} jobs:`, error)
    alert(`Failed to clean ${cleanAction.value} jobs. Please try again.`)
  } finally {
    cleaningQueue.value = false
    cleanAction.value = null
    showConfirmDialog.value = false
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

  // Load jobs with the selected state (no selection to preserve on original load)
  fetchJobs(false)

  // Setup auto-refresh
  setupAutoRefresh()

  // Add click outside handler for dropdown
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // Remove click outside handler
  document.removeEventListener('click', handleClickOutside)

  // Reset jobs store when leaving
  jobsStore.reset()
})

// Add click outside handler function
function handleClickOutside() {
  // Close dropdown if clicked outside
  if (activeDropdown.value) {
    activeDropdown.value = null
  }
}

// Watch for tab changes to save to localStorage
watch(selectedStateTab, (newState) => {
  localStorage.setItem(`queue-${queueName.value}-selectedState`, newState)
})

// Watch for job ID changes for auto-search
watch(jobIdQuery, (newValue) => {
  // Clear existing timeout
  if (jobIdSearchTimeout) {
    clearTimeout(jobIdSearchTimeout)
  }

  if (newValue.trim()) {
    // Debounce job ID search by 500ms
    jobIdSearchTimeout = setTimeout(() => {
      searchByJobId()
    }, 500)
  } else {
    // Clear search when input is empty
    clearJobIdSearch()
  }
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
