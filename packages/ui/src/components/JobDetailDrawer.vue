<template>
  <!-- Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black bg-opacity-50 z-40"
    @click="close"
  ></div>

  <!-- Drawer -->
  <div
    :class="[
      'fixed right-0 top-0 h-full w-1/2 bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300',
      isOpen ? 'translate-x-0' : 'translate-x-full'
    ]"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Job Details</h2>
        <button
          @click="close"
          class="text-gray-400 hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-200"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loadingDetail" class="space-y-4">
          <div class="animate-pulse">
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-2"></div>
            <div class="h-20 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2"></div>
            <div class="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>

        <div v-else-if="jobDetail" class="space-y-6">
          <!-- Basic Info -->
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Basic Information</h3>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">ID</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ jobDetail.id }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Name</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ jobDetail.name }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">State</dt>
                <dd>
                  <span :class="`state-${jobDetail.state} dark:text-gray-100`">
                    {{ jobDetail.state }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Attempts</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ jobDetail.attempts }}</dd>
              </div>
              <div v-if="jobDetail.priority">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Priority</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ jobDetail.priority }}</dd>
              </div>
              <div v-if="jobDetail.duration">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Duration</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ formatDuration(jobDetail.duration) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Timestamps -->
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">Timestamps</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Created At</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ formatTimestamp(jobDetail.createdAt) }}</dd>
              </div>
              <div v-if="jobDetail.processedOn">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Processed On</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ formatTimestamp(jobDetail.processedOn) }}</dd>
              </div>
              <div v-if="jobDetail.finishedOn">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Finished On</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">{{ formatTimestamp(jobDetail.finishedOn) }}</dd>
              </div>
              <div v-if="jobDetail.opts.delay && jobDetail.state === 'delayed'">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Scheduled For</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">
                  <span>{{ formatTimestamp(new Date(jobDetail.createdAt.getTime() + jobDetail.opts.delay)) }}</span>
                  <span class="ml-2 text-xs text-warning-600">
                    ({{ formatDelayRemaining(jobDetail.opts.delay, jobDetail.createdAt) }})
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <!-- Job Data -->
          <div>
            <h3 class="text-sm font-medium text-gray-900 mb-3 dark:text-gray-200">Job Data</h3>
            <pre class="bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">{{ JSON.stringify(jobDetail.data, null, 2) }}</pre>
          </div>

          <!-- Result -->
          <div v-if="jobDetail.result">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">Result</h3>
            <pre class="bg-success-50 dark:bg-success-800 dark:text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">{{ JSON.stringify(jobDetail.result, null, 2) }}</pre>
          </div>

          <!-- Error Info -->
          <div v-if="jobDetail.failedReason">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">Error Information</h3>
            <div class="bg-danger-50 rounded-lg p-4">
              <p class="text-sm text-danger-800 font-medium">{{ jobDetail.failedReason }}</p>
              <div v-if="jobDetail.stacktrace" class="mt-3">
                <details>
                  <summary class="text-sm text-danger-700 cursor-pointer">Stack Trace</summary>
                  <details v-for="(attempt, index) in jobDetail.stacktrace" :key="index" :open="index + 1 === jobDetail.stacktrace.length">
                    <summary class="text-sm text-danger-700 cursor-pointer">Attempt #{{ index + 1 }} -> {{ showBasicError(attempt) }} </summary>
                    <pre class="mt-2 text-xs text-danger-600 overflow-x-auto">{{ attempt }}</pre>
                  </details>
                </details>
              </div>
            </div>
          </div>

          <!-- Options -->
          <div v-if="Object.keys(jobDetail.opts).length > 0">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">Options</h3>
            <pre class="bg-gray-50 dark:bg-gray-700 dark:text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">{{ JSON.stringify(jobDetail.opts, null, 2) }}</pre>
          </div>

          <!-- Parent/Children -->
          <div v-if="jobDetail.parent || jobDetail.children?.length">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-200 mb-3">Relationships</h3>
            <div class="space-y-3">
              <div v-if="jobDetail.parent">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Parent</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">
                  {{ jobDetail.parent.queue }}:{{ jobDetail.parent.id }}
                </dd>
              </div>
              <div v-if="jobDetail.children?.length">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-300">Children</dt>
                <dd class="text-sm text-gray-900 dark:text-gray-100">
                  <ul class="list-disc list-inside">
                    <li v-for="child in jobDetail.children" :key="`${child.queue}:${child.id}`">
                      {{ child.queue }}:{{ child.id }}
                    </li>
                  </ul>
                </dd>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center text-gray-500 dark:text-gray-300 py-8">
          No job selected
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useJobsStore } from '@/stores/jobs'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { formatTimestamp, formatDuration } from '@/utils/date'

const jobsStore = useJobsStore()
const { jobDetail, loadingDetail } = storeToRefs(jobsStore)

const isOpen = computed(() => jobDetail.value !== null)

function close() {
  jobsStore.jobDetail = null
}

function formatDelayRemaining(delay: number, createdAt: Date): string {
  const scheduledTime = createdAt.getTime() + delay
  const now = Date.now()
  const remaining = scheduledTime - now

  if (remaining <= 0) {
    return 'ready to process'
  }

  const seconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `in ${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `in ${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `in ${minutes}m ${seconds % 60}s`
  } else {
    return `in ${seconds}s`
  }
}

function showBasicError(error: string): string {
  const errorLine = error.split('\n')[0];

  if (errorLine) {
    return errorLine.slice(0, 60)
  }

  return 'Error:';
}
</script>
