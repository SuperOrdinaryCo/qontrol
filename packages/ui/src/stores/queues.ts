import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '@/api/client';
import type { QueueInfo, LoadingState, JobState } from '@/types';

export const useQueuesStore = defineStore('queues', () => {
  // State
  const queues = ref<QueueInfo[]>([]);
  const loading = ref<LoadingState['queues']>(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);
  const searchQuery = ref<string>('');
  const sortOption = ref<string>('alphabetical');

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
    const filtered = [...filteredQueues.value];

    switch (sortOption.value) {
      case 'alphabetical':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'waiting':
        return filtered.sort((a, b) => (b.counts.waiting || 0) - (a.counts.waiting || 0));
      case 'active':
        return filtered.sort((a, b) => (b.counts.active || 0) - (a.counts.active || 0));
      case 'completed':
        return filtered.sort((a, b) => (b.counts.completed || 0) - (a.counts.completed || 0));
      case 'failed':
        return filtered.sort((a, b) => (b.counts.failed || 0) - (a.counts.failed || 0));
      case 'delayed':
        return filtered.sort((a, b) => (b.counts.delayed || 0) - (a.counts.delayed || 0));
      case 'paused':
        return filtered.sort((a, b) => (b.counts.paused || 0) - (a.counts.paused || 0));
      case 'prioritized':
        return filtered.sort((a, b) => (b.counts.prioritized || 0) - (a.counts.prioritized || 0));
      case 'waiting-children':
        return filtered.sort((a, b) => (b.counts['waiting-children'] || 0) - (a.counts['waiting-children'] || 0));
      default:
        return filtered.sort((a, b) => {
          const aTotal = Object.values(a.counts).reduce((sum, count) => sum + count, 0);
          const bTotal = Object.values(b.counts).reduce((sum, count) => sum + count, 0);
          return bTotal - aTotal; // Sort by total jobs descending
        });
    }
  });

  // Actions
  async function fetchQueues() {
    try {
      loading.value = true;
      error.value = null;
      queues.value = await apiClient.getQueues();
      lastUpdated.value = new Date();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch queues';
      console.error('Failed to fetch queues:', err);
    } finally {
      loading.value = false;
    }
  }

  async function fetchQueue(queueName: string) {
    try {
      error.value = null;
      const queueData = await apiClient.getQueue(queueName);

      // Update the specific queue in the local state
      const existingIndex = queues.value.findIndex(q => q.name === queueName);
      if (existingIndex !== -1) {
        queues.value[existingIndex] = queueData;
      } else {
        // Add queue if it doesn't exist in local state
        queues.value.push(queueData);
      }

      lastUpdated.value = new Date();
      console.log(`Successfully refreshed queue ${queueName} counts`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch queue';
      console.error('Failed to fetch queue:', err);
      throw err; // Re-throw so the UI can handle the error
    }
  }

  function getQueueByName(name: string): QueueInfo | undefined {
    return queues.value.find(queue => queue.name === name);
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  function setSortOption(option: string) {
    sortOption.value = option;
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
    sortOption.value = 'alphabetical';
  }

  function updateJobCount(queueName: string, state: keyof JobState, delta: number) {
    const queue = queues.value.find(q => q.name === queueName);
    if (queue && queue.counts[state] !== undefined) {
      queue.counts[state] = Math.max(0, queue.counts[state] + delta);
    }
  }

  async function pauseQueue(queueName: string) {
    try {
      await apiClient.pauseQueue(queueName);

      // Update the queue's paused status in local state
      const queue = queues.value.find(q => q.name === queueName);
      if (queue) {
        queue.isPaused = true;
      }

      console.log(`Successfully paused queue ${queueName}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to pause queue';
      console.error('Failed to pause queue:', err);
      throw err; // Re-throw so the UI can handle the error
    }
  }

  async function resumeQueue(queueName: string) {
    try {
      await apiClient.resumeQueue(queueName);

      // Update the queue's paused status in local state
      const queue = queues.value.find(q => q.name === queueName);
      if (queue) {
        queue.isPaused = false;
      }

      console.log(`Successfully resumed queue ${queueName}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to resume queue';
      console.error('Failed to resume queue:', err);
      throw err; // Re-throw so the UI can handle the error
    }
  }

  // Queue cleaning operations
  async function cleanQueue(queueName: string, options: { grace?: number; limit?: number; type?: 'completed' | 'failed' | 'active' | 'delayed' | 'waiting' | 'paused' | 'prioritized' } = {}) {
    try {
      error.value = null;
      const result = await apiClient.cleanQueue(queueName, options);
      console.log(`Successfully cleaned ${result.cleaned} ${options.type || 'completed'} jobs from queue ${queueName}`);
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clean queue';
      console.error('Failed to clean queue:', err);
      throw err;
    }
  }

  async function drainQueue(queueName: string) {
    try {
      error.value = null;
      const result = await apiClient.drainQueue(queueName);
      console.log(`Successfully drained queue ${queueName}`);
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to drain queue';
      console.error('Failed to drain queue:', err);
      throw err;
    }
  }

  async function obliterateQueue(queueName: string) {
    try {
      error.value = null;
      const result = await apiClient.obliterateQueue(queueName);
      console.log(`Successfully obliterated queue ${queueName}`);
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to obliterate queue';
      console.error('Failed to obliterate queue:', err);
      throw err;
    }
  }

  return {
    // State
    queues,
    loading,
    error,
    lastUpdated,
    searchQuery,
    sortOption,
    // Getters
    totalJobs,
    queuesByState,
    filteredQueues,
    sortedQueues,
    // Actions
    fetchQueues,
    fetchQueue,
    getQueueByName,
    clearSearch,
    reset,
    updateJobCount,
    pauseQueue,
    resumeQueue,
    cleanQueue,
    drainQueue,
    obliterateQueue,
  };
});
