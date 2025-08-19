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
        <!-- Add Job Button -->
        <button
          @click="showAddJobDrawer = true"
          class="btn-primary px-4 py-2 text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center space-x-2"
        >
          <PlusIcon class="w-4 h-4" />
          <span>Add Job</span>
        </button>

        <!-- Queue Clean Button -->
        <CleanAction :queue-name="queueName" :queue-state="selectedStateTab" @cleaned="refreshJobs" />

        <!-- Queue Refresh Button -->
        <RefreshAction :loading="loading" @click="refreshJobs" />

        <!-- Pause/Resume Queue Button -->
        <PauseAction v-if="queueInfo" :queue-info="queueInfo" :queue-name="queueName" />
      </div>
    </div>

    <!-- Queue Stats as Tabs -->
    <QueueTabs v-if="queueInfo" :queue-info="queueInfo" :model-value="selectedStateTab" @update:model-value="selectStateTab" />

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800  rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <div class="flex flex-wrap items-start gap-6">
        <!-- Job ID Search -->
        <SearchInput class="flex-1" @search="searchJobs" @clear="clearSearch" @change="searchJobs" />

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
        <SortOrder v-model="sortOrder" />

        <!-- Apply Filters -->
        <div class="flex items-end h-full mt-2 pt-[20px]">
          <button @click="applyFilters" class="btn-primary py-3 px-6 shadow-sm hover:shadow-md transition-shadow">
            Apply Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Jobs Table -->
    <JobsTable :queue-name="queueName" />

    <!-- Pagination -->
    <PaginationBlock v-if="pagination.totalPages > 1" @to-page="fetchJobs(false)" />

    <!-- Custom Confirmation Dialog -->
    <ConfirmDialog />

    <!-- Add Job Drawer -->
    <AddJobDrawer
      :is-open="showAddJobDrawer"
      :queue-name="queueName"
      @close="showAddJobDrawer = false"
      @submit="handleAddJob"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useJobsStore } from '@/stores/jobs'
import { useQueuesStore } from '@/stores/queues'
import { useSettingsStore } from '@/stores/settings'
import { apiClient } from '@/api/client'
import { ArrowLeftIcon, PlusIcon } from '@heroicons/vue/24/outline'
import ConfirmDialog from './ConfirmDialog.vue'
import JobsTable from '@/components/JobsTable.vue';
import QueueTabs from '@/components/QueueTabs.vue';
import RefreshAction from '@/components/queue-actions/RefreshAction.vue';
import PauseAction from '@/components/queue-actions/PauseAction.vue';
import CleanAction from '@/components/queue-actions/CleanAction.vue';
import PaginationBlock from '@/components/PaginationBlock.vue';
import SortOrder from '@/components/SortOrder.vue';
import SearchInput from '@/components/SearchInput.vue';
import AddJobDrawer from '@/components/AddJobDrawer.vue';

const route = useRoute()
const jobsStore = useJobsStore()
const queuesStore = useQueuesStore()
const settingsStore = useSettingsStore()

const queueName = computed(() => route.params.name as string)

const {
  loading,
  pagination,
  filters,
} = storeToRefs(jobsStore)

const { settings, autoRefreshEnabled } = storeToRefs(settingsStore)

// Local filter state
const selectedStateTab = ref<string>('waiting')
const searchQuery = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')
const jobIdQuery = ref('')

// Add job drawer state
const showAddJobDrawer = ref(false)

// Auto-refresh
let refreshInterval: ReturnType<typeof setInterval> | null = null

const queueInfo = computed(() =>
  queuesStore.getQueueByName(queueName.value)
)

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
  if (jobIdQuery.value.trim()) {
    // Refresh the job ID search silently to avoid dropping/refilling table
    jobsStore.fetchJobById(queueName.value, jobIdQuery.value.trim(), true)

    return;
  }
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

function searchJobs({ query, type }: { query: string, type: 'id' | 'name' | 'data' }) {
  if (type === 'id') {
    jobIdQuery.value = query.trim()
    jobsStore.fetchJobById(queueName.value, query.trim())
    return;
  }

  searchQuery.value = query.trim()
}

function clearSearch() {
  searchQuery.value = ''
  jobIdQuery.value = ''
  // Clear job ID search and return to normal view
  fetchJobs(false)
}

async function handleAddJob(jobData: { name: string; data: any; options: any }) {
  try {
    await apiClient.addJob(queueName.value, jobData)

    // Close the drawer
    showAddJobDrawer.value = false

    // Refresh jobs to show the new job
    refreshJobs()

    // Show success message (you could add a toast notification here)
    console.log('Job added successfully')
  } catch (error) {
    console.error('Failed to add job:', error)
    // You could show an error message to the user here
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
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  // Reset jobs store when leaving
  jobsStore.reset()
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
