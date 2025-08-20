<script setup lang="ts">
import { ref } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';

type SearchType = 'id' | 'name' | 'data';
type Emits = {
  (e: 'search', value: { query: string, type: SearchType }): void;
  (e: 'change', value: { query: string, type: SearchType }): void;
  (e: 'clear'): void;
}

// Unified search state
const unifiedSearchQuery = ref('')
const searchType = ref<SearchType>('id')

const emit = defineEmits<Emits>()

// Unified search helper functions
function getSearchPlaceholder(): string {
  switch (searchType.value) {
    case 'id':
      return 'Enter job ID for instant lookup...'
    case 'name':
      return 'Search by job name...'
    case 'data':
      return 'Search by job data content...'
    default:
      return 'Search jobs...'
  }
}

function executeSearch() {
  if (!unifiedSearchQuery.value.trim()) return

  emit('search', {
    query: unifiedSearchQuery.value.trim(),
    type: searchType.value
  })
}

function handleChange() {
  if (!unifiedSearchQuery.value.trim()) return

  emit('change', {
    query: unifiedSearchQuery.value.trim(),
    type: searchType.value
  })
}

function clearSearch() {
  unifiedSearchQuery.value = ''

  emit('clear')
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Search Jobs</label>
    <div class="relative">
      <!-- Search Type Selector -->
      <div class="absolute inset-y-0 left-0 flex items-center">
        <select
            v-model="searchType"
            class="h-full rounded-l-lg border-0 bg-transparent py-0 pl-3 pr-7 text-gray-500 dark:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
        >
          <option value="id">ID</option>
          <option value="name">Name</option>
          <option value="data">Data</option>
        </select>
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-600 ml-1"></div>
      </div>

      <!-- Search Input -->
      <input
          v-model="unifiedSearchQuery"
          type="text"
          :placeholder="getSearchPlaceholder()"
          class="input-field pl-28"
          @keyup.enter="executeSearch"
          @change="handleChange"
      />

      <!-- Clear Button -->
      <div v-if="unifiedSearchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <button
            @click="clearSearch"
            class="text-gray-400 hover:text-gray-600 dark:text-gray-800 hover:dark:text-gray-600 transition-colors"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Search Info -->
    <div v-if="unifiedSearchQuery" class="mt-1 text-xs text-gray-600 dark:text-gray-200">
      <span v-if="searchType === 'id'" class="text-blue-600">Press Enter for instant job lookup</span>
      <span v-else-if="searchType === 'name'" class="text-green-600">Press Enter to search job names</span>
      <span v-else class="text-orange-600">Press Enter to search job data content</span>
    </div>
  </div>
</template>
