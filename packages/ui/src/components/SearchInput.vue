<script setup lang="ts">
import { watch } from 'vue';
import { XMarkIcon } from '@heroicons/vue/24/outline';
import {useSettingsStore} from '@/stores/settings.ts';

type SearchType = 'id' | 'name' | 'data';
type Emits = {
  (e: 'search', value: { query: string, type: SearchType }): void;
  (e: 'type-change', value: { query: string, type: SearchType }): void;
  (e: 'clear'): void;
}

const settingsStore = useSettingsStore()

const query = defineModel<string>('query',{
  required: true,
})

const type = defineModel<SearchType>('type',{
  required: true,
})

// Unified search state
const emit = defineEmits<Emits>()

// Unified search helper functions
function getSearchPlaceholder(): string {
  switch (type.value) {
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
  if (!query.value.trim()) {
    emit('clear')
    return;
  }

  emit('search', {
    query: query.value.trim(),
    type: type.value,
  })
}

function clearSearch() {
  query.value = ''

  emit('clear')
}

watch(type, () => {
  const isLongSearch = ['data', 'name'].includes(type.value);
  settingsStore.autoRefreshEnabled = !isLongSearch;
})
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-2">Search Jobs</label>
    <div class="relative">
      <!-- Search Type Selector -->
      <div class="absolute inset-y-0 left-0 flex items-center">
        <select
            v-model="type"
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
          v-model="query"
          type="text"
          :placeholder="getSearchPlaceholder()"
          class="input-field pl-28"
          @keydown.enter="executeSearch"
      />

      <!-- Clear Button -->
      <div v-if="query" class="absolute inset-y-0 right-0 pr-3 flex items-center">
        <button
            @click="clearSearch"
            class="text-gray-400 dark:text-gray-100 hover:text-gray-600 hover:dark:text-gray-400 transition-colors"
        >
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Search Info -->
    <div v-if="query" class="mt-1 text-xs text-gray-600 dark:text-gray-200">
      <span v-if="type === 'id'" class="text-blue-600">Press Enter for instant job lookup</span>
      <span v-else-if="type === 'name'" class="text-green-600">Press Enter to search job names</span>
      <span v-else class="text-orange-600">Press Enter to search job data content</span>
    </div>
  </div>
</template>
