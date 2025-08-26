<script setup lang="ts">
import {formatDuration, formatTimestamp} from '@/utils/date.ts';
import {ArrowPathIcon, ArrowUpIcon, EllipsisVerticalIcon, StopIcon, TrashIcon, DocumentDuplicateIcon, ArrowDownTrayIcon} from '@heroicons/vue/24/outline';
import {storeToRefs} from 'pinia';
import {useJobsStore} from '@/stores/jobs.ts';
import {computed, onMounted, onUnmounted, ref, nextTick} from 'vue';
import {useConfirmStore} from '@/stores/confirm.ts';
import JobDataTooltip from './JobDataTooltip.vue';

const props = defineProps<{
  queueName: string
}>()

const jobsStore = useJobsStore()
const confirmStore = useConfirmStore()

const queueName = computed(() => props.queueName)

const {
  jobs,
  loading,
  pagination,
  selection,
  hasSelection,
} = storeToRefs(jobsStore)

// Dropdown menu state
const activeDropdown = ref<string | null>(null)

// Bulk removal state
const bulkRemoving = ref(false)

// Bulk retry state
const bulkRetrying = ref(false)

// Bulk export state
const bulkExporting = ref(false)

// Removal state
const removingJobId = ref<string | null>(null)

// Bulk selection state
const lastSelectedIndex = ref<number>(-1)

// Job data tooltip state
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipJobData = ref<any>(null)
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null

// Check if any selected jobs are failed (for bulk retry feature)
const hasFailedJobsSelected = computed(() => {
  if (!hasSelection.value) return false

  const selectedJobs = jobs.value.filter(job => selection.value.selectedIds.has(job.id))
  return selectedJobs.some(job => job.state === 'failed')
})

// Job data tooltip functions
async function showJobDataTooltip(event: MouseEvent, job: any) {
  const x = event.pageX
  const y = event.pageY

  tooltipX.value = x + 5
  tooltipY.value = y - 5
  tooltipVisible.value = true

  await new Promise((resolve, reject) => {
    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout)
      reject(null)
    }

    tooltipTimeout = setTimeout(() => {
      resolve(null)
    }, 3000)
  })
      .then(() => {
        if (jobsStore.jobDetail?.id !== job.id) {
          return jobsStore.fetchJobDetail(queueName.value, job.id)
        }
      })
      .then(() => {
        nextTick(() => {
          tooltipJobData.value = jobsStore.jobDetail?.data
        })
      })
      .catch(e => {
        console.error('Error fetching job detail:', e)
      })
}

function hideJobDataTooltip() {
  // Clear timeout if user moves mouse away before tooltip shows
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
    tooltipTimeout = null
  }

  tooltipVisible.value = false
  tooltipJobData.value = null
}

function viewJobDetail(jobId: string) {
  if (jobsStore.jobDetail?.id !== jobId) {
    jobsStore.fetchJobDetail(queueName.value, jobId)
        .then(() => {
          jobsStore.showJobDetailDrawer = true;
        })
  } else {
    jobsStore.showJobDetailDrawer = true;
  }
}

function clearSelection() {
  jobsStore.clearSelection()
}

function toggleSelectAll() {
  jobsStore.toggleSelectAll()
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
  confirmStore.updateData({
    title: 'Confirm Bulk Job Removal',
    message: `Are you sure you want to remove ${jobIds.length} job(s)? This action cannot be undone and will also remove any child jobs.`,
    details: '',
  })

  confirmStore.confirm(() => {
    bulkRemoving.value = true

    confirmStore.setLoading(true)

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
          confirmStore.setLoading(false)
          confirmStore.show(false)
          confirmStore.clear()
        })
  })

  confirmStore.cancel(() => {
    confirmStore.show(false);
    confirmStore.clear()
  })

  confirmStore.show(true);
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

function handleBulkExport() {
  // Collect all selected job IDs
  const jobIds = Array.from(selection.value.selectedIds)

  if (jobIds.length === 0) return

  bulkExporting.value = true

  jobsStore.bulkExportJobs(queueName.value, jobIds)
      .then((result) => {
        console.log(`Bulk export completed: ${result.success} success, ${result.failed} failed`)
        if (result.failed > 0) {
          // Show errors if any jobs failed to export
          const errorMessage = `${result.success} jobs exported successfully. ${result.failed} jobs failed to export.`
          alert(errorMessage)
        }
      })
      .catch((error) => {
        console.error('Failed to bulk export jobs:', error)
        alert('Failed to bulk export jobs. Please try again.')
      })
      .finally(() => {
        bulkExporting.value = false
      })
}

async function handleRemoveJob(jobId: string) {
  if (removingJobId.value) return // Prevent multiple simultaneous removals

  // Show confirmation dialog
  confirmStore.updateData({
    title: 'Confirm Job Removal',
    message: `Are you sure you want to remove job ${jobId}? This action cannot be undone and will also remove any child jobs.`,
    details: '',
  })

  confirmStore.confirm(() => {
    removingJobId.value = jobId

    confirmStore.setLoading(true)

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
          confirmStore.setLoading(false)
          confirmStore.show(false)
          confirmStore.clear()
        })
  })

  confirmStore.cancel(() => {
    confirmStore.show(false);
    confirmStore.clear()
  })

  confirmStore.show(true);
}

function handleClickOutside() {
  // Close dropdown if clicked outside
  if (activeDropdown.value) {
    activeDropdown.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)

  // Clean up tooltip timeout to prevent memory leaks
  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
    tooltipTimeout = null
  }
})
</script>

<template>
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
            <!-- Bulk Export Button -->
            <button
                @click="handleBulkExport"
                :disabled="bulkExporting"
                class="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ bulkExporting ? 'Exporting...' : 'Export Selected' }}
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
      <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-50">
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
            @mouseenter="showJobDataTooltip($event, job)"
            @mouseleave="hideJobDataTooltip"
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
              class="absolute right-6 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-40"
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

            <!-- Duplicate Job action (always available) -->
            <div v-if="job.state === 'completed' || job.state === 'failed'" class="border-t border-gray-100 my-1"></div>
            <button
                v-if="job.state === 'completed' || job.state === 'failed'"
                @click="() => { jobsStore.duplicateJob(queueName, job.id) }"
                class="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-2"
            >
              <DocumentDuplicateIcon class="h-4 w-4" />
              <span>Duplicate Job</span>
            </button>

            <!-- Export Job action (always available) -->
            <div class="border-t border-gray-100 my-1"></div>
            <button
                @click="() => { jobsStore.exportJob(queueName, job.id) }"
                class="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-2"
            >
              <ArrowDownTrayIcon class="h-4 w-4" />
              <span>Export Job</span>
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

    <!-- Job Data Tooltip -->
    <JobDataTooltip
        :visible="tooltipVisible"
        :x="tooltipX"
        :y="tooltipY"
        :job-data="tooltipJobData"
    />
  </div>
</template>

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
