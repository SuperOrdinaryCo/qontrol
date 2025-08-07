import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '@/api/client';
import type { QueueInfo, LoadingState } from '@/types';

export const useQueuesStore = defineStore('queues', () => {
  // State
  const queues = ref<QueueInfo[]>([]);
  const loading = ref<LoadingState['queues']>(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);
  const searchQuery = ref<string>('');

  // Getters
  const totalJobs = computed(() => {
    return queues.value.reduce((total, queue) => {
      return total + Object.values(queue.counts).reduce((sum, count) => sum + count, 0);
    }, 0);
  });

  const queuesByState = computed(() => {
    return queues.value.reduce((acc, queue) => {
      Object.entries(queue.counts).forEach(([state, count]) => {
        acc[state] = (acc[state] || 0) + count;
      });
      return acc;
    }, {} as Record<string, number>);
  });

  const filteredQueues = computed(() => {
    if (!searchQuery.value.trim()) {
      return queues.value;
    }

    const query = searchQuery.value.toLowerCase().trim();
    return queues.value.filter(queue =>
      queue.name.toLowerCase().includes(query)
    );
  });

  const sortedQueues = computed(() => {
    return [...filteredQueues.value].sort((a, b) => {
      const aTotal = Object.values(a.counts).reduce((sum, count) => sum + count, 0);
      const bTotal = Object.values(b.counts).reduce((sum, count) => sum + count, 0);
      return bTotal - aTotal; // Sort by total jobs descending
    });
  });

  // Actions
  async function fetchQueues() {
    try {
      loading.value = true;
      error.value = null;
      const data = await apiClient.getQueues();
      queues.value = data;
      lastUpdated.value = new Date();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch queues';
      console.error('Failed to fetch queues:', err);
    } finally {
      loading.value = false;
    }
  }

  function getQueueByName(name: string): QueueInfo | undefined {
    return queues.value.find(queue => queue.name === name);
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  function clearSearch() {
    searchQuery.value = '';
  }

  function reset() {
    queues.value = [];
    loading.value = false;
    error.value = null;
    lastUpdated.value = null;
    searchQuery.value = '';
  }

  return {
    // State
    queues,
    loading,
    error,
    lastUpdated,
    searchQuery,

    // Getters
    totalJobs,
    queuesByState,
    filteredQueues,
    sortedQueues,

    // Actions
    fetchQueues,
    getQueueByName,
    setSearchQuery,
    clearSearch,
    reset,
  };
});
