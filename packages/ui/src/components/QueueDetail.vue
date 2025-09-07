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
        <!-- Remove Queue Button -->
        <RemoveAction v-if="settings.showDangerActions" :queue-name="queueName" @removed="$router.back()"/>

        <!-- Add Job Button -->
        <button
          @click="jobsStore.openAddJobDrawer()"
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
        <SearchInput class="flex-1" @search="searchJobs" @clear="clearSearch" v-model:query="searchQuery" v-model:type="searchType" />

        <!-- Sort Order -->
        <SortOrder v-model="sortOrder" />

        <!-- Apply Filters -->
        <div class="flex items-end h-full mt-2 pt-[20px]">
          <button @click="applyFilters" class="btn-primary py-2 px-6 shadow-sm hover:shadow-md transition-shadow">
            Apply Filters
          </button>
        </div>
      </div>
    </div>

    <!-- Jobs Table -->
    <JobsTable :queue-name="queueName" />

    <!-- Pagination -->
    <PaginationBlock v-if="pagination.totalPages > 1" @to-page="paginate" />

    <!-- Custom Confirmation Dialog -->
    <ConfirmDialog />

    <!-- Add Job Drawer -->
    <AddJobDrawer
      :is-open="showAddJobDrawer"
      :queue-name="queueName"
      :duplicate-job="duplicateJobData"
      @close="closeAddJobDrawer"
      @submit="handleAddJob"
    />
  </div>
</template>

<script setup lang="ts">
import {ref, computed, watch, onMounted, onUnmounted} from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useJobsStore } from '@/stores/jobs'
import { useQueuesStore } from '@/stores/queues'
import { useSettingsStore } from '@/stores/settings'
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
import RemoveAction from '@/components/queue-actions/RemoveAction.vue';

const route = useRoute()
const jobsStore = useJobsStore()
const queuesStore = useQueuesStore()
const settingsStore = useSettingsStore()

const queueName = computed(() => route.params.name as string)

const {
  loading,
  pagination,
  filters,
  showAddJobDrawer,
  duplicateJobData,
} = storeToRefs(jobsStore)

const { settings, autoRefreshEnabled } = storeToRefs(settingsStore)

// Local filter state
const selectedStateTab = ref<string>('waiting')
const searchQuery = ref('')
const searchType = ref<'id' | 'name' | 'data'>('id')
const sortBy = ref('createdAt')
const sortOrder = ref('desc')

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
    searchType: searchType.value || undefined,
    page: 1,
    all: ['data', 'name'].includes(searchType.value),
  })

  // Don't preserve selection when changing tabs (original behavior)
  fetchJobs(false)
}

function applyFilters() {
  if (searchQuery.value.trim() === '') {
    searchType.value = 'id'
  }

  if (searchType.value === 'id' && searchQuery.value.trim() != '') {
    // Refresh the job ID search silently to avoid dropping/refilling table
    jobsStore.fetchJobById(queueName.value, searchQuery.value.trim(), true)

    return;
  }
  // Apply current tab state along with other filters
  jobsStore.updateFilters({
    states: [selectedStateTab.value] as any,
    search: searchQuery.value || undefined,
    searchType: searchType.value || undefined,
    all: ['data', 'name'].includes(searchType.value),
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
    jobsStore.fetchJobById(queueName.value, query.trim())
    return;
  }

  jobsStore.updateFilters({
    searchType: type,
    search: query,
    all: ['data', 'name'].includes(type),
  })

  fetchJobs(false)
}

function clearSearch() {
  jobsStore.updateFilters({
    searchType: searchType.value,
    search: searchQuery.value,
    all: ['data', 'name'].includes(searchType.value),
  })
}

async function handleAddJob(jobData: { name: string; data: any; options: any }) {
  try {
    await jobsStore.addJob(queueName.value, jobData)

    // Close the drawer using store method
    jobsStore.closeAddJobDrawer()

    // Refresh jobs to show the new job
    refreshJobs()

    // Show success message (you could add a toast notification here)
    console.log('Job added successfully')
  } catch (error) {
    console.error('Failed to add job:', error)
    // You could show an error message to the user here
  }
}

function closeAddJobDrawer() {
  jobsStore.closeAddJobDrawer()
}

function setupAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }

  if (autoRefreshEnabled.value && settings.value.autoRefreshInterval > 0) {
    refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Check if we're in job ID search mode
        if (searchType.value === 'id' && searchQuery.value.trim() !== '') {
          // Refresh the job ID search silently to avoid dropping/refilling table
          jobsStore.fetchJobById(queueName.value, searchQuery.value.trim(), true)
        } else {
          // Update filters with current search state before auto-refresh
          jobsStore.updateFilters({
            states: [selectedStateTab.value] as any,
            search: searchQuery.value || undefined,
            searchType: searchType.value || undefined,
            sortBy: sortBy.value as any,
            sortOrder: sortOrder.value as any,
            all: ['data', 'name'].includes(searchType.value),
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

function paginate(page: number) {
  if (filters.value.all) {
    jobsStore.updateJobsPage(page);
  }
  else {
    fetchJobs(false)
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
    searchType: searchType.value || undefined,
    all: ['data', 'name'].includes(searchType.value),
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
