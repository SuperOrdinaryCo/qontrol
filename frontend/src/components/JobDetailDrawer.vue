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
      'fixed right-0 top-0 h-full w-1/2 bg-white shadow-xl z-50 transform transition-transform duration-300',
      isOpen ? 'translate-x-0' : 'translate-x-full'
    ]"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-lg font-semibold text-gray-900">Job Details</h2>
        <button
          @click="close"
          class="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon class="w-6 h-6" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loadingDetail" class="space-y-4">
          <div class="animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div class="h-20 bg-gray-200 rounded mb-4"></div>
            <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div class="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div v-else-if="jobDetail" class="space-y-6">
          <!-- Basic Info -->
          <div>
            <h3 class="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
            <dl class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div>
                <dt class="text-sm font-medium text-gray-500">ID</dt>
                <dd class="text-sm text-gray-900">{{ jobDetail.id }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Name</dt>
                <dd class="text-sm text-gray-900">{{ jobDetail.name }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">State</dt>
                <dd>
                  <span :class="`state-${jobDetail.state}`">
                    {{ jobDetail.state }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Attempts</dt>
                <dd class="text-sm text-gray-900">{{ jobDetail.attempts }}</dd>
              </div>
              <div v-if="jobDetail.priority">
                <dt class="text-sm font-medium text-gray-500">Priority</dt>
                <dd class="text-sm text-gray-900">{{ jobDetail.priority }}</dd>
              </div>
              <div v-if="jobDetail.duration">
                <dt class="text-sm font-medium text-gray-500">Duration</dt>
                <dd class="text-sm text-gray-900">{{ formatDuration(jobDetail.duration) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Timestamps -->
          <div>
            <h3 class="text-sm font-medium text-gray-900 mb-3">Timestamps</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm font-medium text-gray-500">Created At</dt>
                <dd class="text-sm text-gray-900">{{ formatTimestamp(jobDetail.createdAt) }}</dd>
              </div>
              <div v-if="jobDetail.processedOn">
                <dt class="text-sm font-medium text-gray-500">Processed On</dt>
                <dd class="text-sm text-gray-900">{{ formatTimestamp(jobDetail.processedOn) }}</dd>
              </div>
              <div v-if="jobDetail.finishedOn">
                <dt class="text-sm font-medium text-gray-500">Finished On</dt>
                <dd class="text-sm text-gray-900">{{ formatTimestamp(jobDetail.finishedOn) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Job Data -->
          <div>
            <h3 class="text-sm font-medium text-gray-900 mb-3">Job Data</h3>
            <pre class="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">{{ JSON.stringify(jobDetail.data, null, 2) }}</pre>
          </div>

          <!-- Result -->
          <div v-if="jobDetail.result">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Result</h3>
            <pre class="bg-success-50 rounded-lg p-4 text-sm overflow-x-auto">{{ JSON.stringify(jobDetail.result, null, 2) }}</pre>
          </div>

          <!-- Error Info -->
          <div v-if="jobDetail.failedReason">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Error Information</h3>
            <div class="bg-danger-50 rounded-lg p-4">
              <p class="text-sm text-danger-800 font-medium">{{ jobDetail.failedReason }}</p>
              <div v-if="jobDetail.stacktrace" class="mt-3">
                <details>
                  <summary class="text-sm text-danger-700 cursor-pointer">Stack Trace</summary>
                  <pre class="mt-2 text-xs text-danger-600 overflow-x-auto">{{ jobDetail.stacktrace.join('\n') }}</pre>
                </details>
              </div>
            </div>
          </div>

          <!-- Options -->
          <div v-if="Object.keys(jobDetail.opts).length > 0">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Options</h3>
            <pre class="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">{{ JSON.stringify(jobDetail.opts, null, 2) }}</pre>
          </div>

          <!-- Parent/Children -->
          <div v-if="jobDetail.parent || jobDetail.children?.length">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Relationships</h3>
            <div class="space-y-3">
              <div v-if="jobDetail.parent">
                <dt class="text-sm font-medium text-gray-500">Parent</dt>
                <dd class="text-sm text-gray-900">
                  {{ jobDetail.parent.queue }}:{{ jobDetail.parent.id }}
                </dd>
              </div>
              <div v-if="jobDetail.children?.length">
                <dt class="text-sm font-medium text-gray-500">Children</dt>
                <dd class="text-sm text-gray-900">
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

        <div v-else class="text-center text-gray-500 py-8">
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
</script>
