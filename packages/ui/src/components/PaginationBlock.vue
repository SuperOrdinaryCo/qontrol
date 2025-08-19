<script setup lang="ts">
import {useJobsStore} from '@/stores/jobs.ts';
import {storeToRefs} from 'pinia';
import {computed} from 'vue';

type Emits = {
  (e: 'toPage', value: number): void;
}

const emit = defineEmits<Emits>();

const jobsStore = useJobsStore()

const { pagination } = storeToRefs(jobsStore)

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

function goToPage(page: number) {
  if (page >= 1 && page <= pagination.value.totalPages) {
    jobsStore.updatePage(page)
    emit('toPage', page)
  }
}
</script>

<template>
  <div class="flex items-center justify-between">
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
</template>
