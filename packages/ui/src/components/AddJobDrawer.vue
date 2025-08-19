<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-hidden"
    @click.self="cancel"
  >
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>

    <!-- Drawer -->
    <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl">
      <div class="flex h-full flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Job</h3>
          <button
            @click="cancel"
            class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Form -->
        <form @submit.prevent="submit" class="flex flex-1 flex-col overflow-hidden">
          <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <!-- Job Name -->
            <div>
              <label for="jobName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Name <span class="text-red-500">*</span>
              </label>
              <input
                id="jobName"
                v-model="form.name"
                type="text"
                required
                placeholder="Enter job name"
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <p v-if="errors.name" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.name }}</p>
            </div>

            <!-- Job Data -->
            <div>
              <label for="jobData" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Data (JSON)
              </label>
              <textarea
                id="jobData"
                v-model="form.data"
                rows="6"
                placeholder='{"key": "value"}'
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 font-mono text-sm"
              ></textarea>
              <p v-if="errors.data" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.data }}</p>
            </div>

            <!-- Job Options -->
            <div>
              <label for="jobOptions" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Options (JSON)
              </label>
              <textarea
                id="jobOptions"
                v-model="form.options"
                rows="6"
                placeholder='{"attempts": 3, "delay": 1000}'
                class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 font-mono text-sm"
              ></textarea>
              <p v-if="errors.options" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors.options }}</p>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="cancel"
                class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="loading"
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="loading" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </span>
                <span v-else>Confirm</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface AddJobData {
  name: string
  data: any
  options: any
}

interface Props {
  isOpen: boolean
  queueName: string
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', data: AddJobData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const form = reactive({
  name: '',
  data: '{}',
  options: '{}'
})

const errors = reactive({
  name: '',
  data: '',
  options: ''
})

function validateForm() {
  // Reset errors
  errors.name = ''
  errors.data = ''
  errors.options = ''

  let isValid = true

  // Validate name
  if (!form.name.trim()) {
    errors.name = 'Job name is required'
    isValid = false
  }

  // Validate JSON data
  try {
    JSON.parse(form.data)
  } catch (e) {
    errors.data = 'Invalid JSON format'
    isValid = false
  }

  // Validate JSON options
  try {
    JSON.parse(form.options)
  } catch (e) {
    errors.options = 'Invalid JSON format'
    isValid = false
  }

  return isValid
}

function clearForm() {
  form.name = ''
  form.data = '{}'
  form.options = '{}'
  errors.name = ''
  errors.data = ''
  errors.options = ''
}

function cancel() {
  clearForm()
  emit('close')
}

async function submit() {
  if (!validateForm()) {
    return
  }

  loading.value = true

  try {
    const jobData: AddJobData = {
      name: form.name.trim(),
      data: JSON.parse(form.data),
      options: JSON.parse(form.options)
    }

    emit('submit', jobData)
    clearForm()
  } catch (error) {
    console.error('Error submitting job:', error)
  } finally {
    loading.value = false
  }
}

// Reset form when drawer closes
watch(() => props.isOpen, (newValue) => {
  if (!newValue) {
    clearForm()
  }
})
</script>
