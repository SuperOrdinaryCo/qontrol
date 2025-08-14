import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { apiClient } from '@/api/client';
import type { JobSummary, JobDetail, GetJobsRequest, GetJobsResponse, JobSelection, LoadingState } from '@/types';

export const useJobsStore = defineStore('jobs', () => {
  // State
  const jobs = ref<JobSummary[]>([]);
  const jobDetail = ref<JobDetail | null>(null);
  const loading = ref<LoadingState['jobs']>(false);
  const loadingDetail = ref<LoadingState['jobDetail']>(false);
  const error = ref<string | null>(null);
  const currentQueue = ref<string>('');
  
  // Pagination and filters
  const pagination = reactive({
    page: 1,
    pageSize: 500,
    total: 0,
    totalPages: 0,
  });

  const filters = reactive<GetJobsRequest>({
    page: 1,
    pageSize: 500,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    states: undefined,
    timeRange: undefined,
    minDuration: undefined,
    minAttempts: undefined,
    search: '',
  });

  // Selection state
  const selection = reactive<JobSelection>({
    selectedIds: new Set(),
    isAllSelected: false,
  });

  // Getters
  const hasSelection = computed(() => selection.selectedIds.size > 0);
  
  const selectedJobs = computed(() => 
    jobs.value.filter(job => selection.selectedIds.has(job.id))
  );

  const jobsByState = computed(() => {
    return jobs.value.reduce((acc, job) => {
      acc[job.state] = (acc[job.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  });

  // Actions
  async function fetchJobs(queueName: string, requestFilters?: Partial<GetJobsRequest>, preserveSelection = false, silentRefresh = false) {
    try {
      // Only show loading state for non-silent refreshes
      if (!silentRefresh) {
        loading.value = true;
      }
      error.value = null;
      currentQueue.value = queueName;

      // Store current selection before fetching new jobs
      const previousSelection = new Set(selection.selectedIds);

      // Merge with current filters
      const mergedFilters = { ...filters, ...requestFilters };
      
      const response: GetJobsResponse = await apiClient.getJobs(queueName, mergedFilters);
      
      jobs.value = response.jobs.map(job => ({
        ...job,
        createdAt: new Date(job.createdAt),
        processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      }));

      // Update pagination
      Object.assign(pagination, response.pagination);
      
      // Update filters with response filters
      Object.assign(filters, response.filters);

      // Handle selection based on preserveSelection flag
      if (preserveSelection && previousSelection.size > 0) {
        // Preserve selection for jobs that still exist in the new data
        const newJobIds = new Set(jobs.value.map(job => job.id));
        const preservedSelection = new Set(
          Array.from(previousSelection).filter(id => newJobIds.has(id))
        );

        selection.selectedIds = preservedSelection;
        selection.isAllSelected = preservedSelection.size === jobs.value.length && jobs.value.length > 0;
      } else {
        // Clear selection when loading new page/filters (original behavior)
        clearSelection();
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch jobs';
      console.error('Failed to fetch jobs:', err);
    } finally {
      // Always clear loading state
      loading.value = false;
    }
  }

  async function fetchJobDetail(queueName: string, jobId: string) {
    try {
      loadingDetail.value = true;
      const job = await apiClient.getJobDetail(queueName, jobId);
      
      jobDetail.value = {
        ...job,
        createdAt: new Date(job.createdAt),
        processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch job detail';
      console.error('Failed to fetch job detail:', err);
    } finally {
      loadingDetail.value = false;
    }
  }

  async function fetchJobById(queueName: string, jobId: string, silentRefresh = false) {
    try {
      // Only show loading state for non-silent refreshes
      if (!silentRefresh) {
        loading.value = true;
      }
      error.value = null;
      currentQueue.value = queueName;

      const response: GetJobsResponse = await apiClient.getJobById(queueName, jobId);

      jobs.value = response.jobs.map(job => ({
        ...job,
        createdAt: new Date(job.createdAt),
        processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
        finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      }));

      // Update pagination for single job result
      Object.assign(pagination, response.pagination);

      // Clear selection for job ID search results
      clearSelection();

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch job by ID';
      console.error('Failed to fetch job by ID:', err);
      // Clear jobs on error
      jobs.value = [];
      Object.assign(pagination, { page: 1, pageSize: 1, total: 0, totalPages: 0 });
    } finally {
      // Always clear loading state
      loading.value = false;
    }
  }

  async function removeJob(queueName: string, jobId: string) {
    try {
      // Find the job to get its state before removal
      const jobToRemove = jobs.value.find(job => job.id === jobId);
      if (!jobToRemove) {
        throw new Error('Job not found in local state');
      }

      await apiClient.removeJob(queueName, jobId);
      
      // Remove the job from the local jobs array
      jobs.value = jobs.value.filter(job => job.id !== jobId);
      
      // Update pagination total
      pagination.total = Math.max(0, pagination.total - 1);
      pagination.totalPages = Math.ceil(pagination.total / pagination.pageSize);
      
      // Clear selection if the removed job was selected
      if (selection.selectedIds.has(jobId)) {
        selection.selectedIds.delete(jobId);
        selection.isAllSelected = selection.selectedIds.size === jobs.value.length && jobs.value.length > 0;
      }

      // Update queue counts in the queues store
      const { useQueuesStore } = await import('@/stores/queues');
      const queuesStore = useQueuesStore();
      queuesStore.updateJobCount(queueName, jobToRemove.state, -1);
      
      console.log(`Successfully removed job ${jobId} from queue ${queueName}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to remove job';
      console.error('Failed to remove job:', err);
      throw err; // Re-throw so UI can handle the error
    }
  }

  async function retryJob(queueName: string, jobId: string) {
    try {
      await apiClient.retryJob(queueName, jobId);

      // Find the job in local state and update it
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        const job = jobs.value[jobIndex];
        // Update job state to waiting after retry
        jobs.value[jobIndex] = { ...job, state: 'waiting' };

        // Update queue counts
        const { useQueuesStore } = await import('@/stores/queues');
        const queuesStore = useQueuesStore();
        queuesStore.updateJobCount(queueName, 'failed', -1);
        queuesStore.updateJobCount(queueName, 'waiting', 1);
      }

      console.log(`Successfully retried job ${jobId} in queue ${queueName}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to retry job';
      console.error('Failed to retry job:', err);
      throw err;
    }
  }

  async function discardJob(queueName: string, jobId: string) {
    try {
      await apiClient.discardJob(queueName, jobId);

      // Find the job in local state and update it
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        const job = jobs.value[jobIndex];
        // According to BullMQ docs, discard moves job back to waiting state, not failed
        jobs.value[jobIndex] = { ...job, state: 'waiting' };

        // Update queue counts
        const { useQueuesStore } = await import('@/stores/queues');
        const queuesStore = useQueuesStore();
        queuesStore.updateJobCount(queueName, 'active', -1);
        queuesStore.updateJobCount(queueName, 'waiting', 1);
      }

      console.log(`Successfully discarded job ${jobId} in queue ${queueName}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to discard job';
      console.error('Failed to discard job:', err);
      throw err;
    }
  }

  async function promoteJob(queueName: string, jobId: string) {
    try {
      await apiClient.promoteJob(queueName, jobId);

      // Find the job in local state and update it
      const jobIndex = jobs.value.findIndex(job => job.id === jobId);
      if (jobIndex !== -1) {
        const job = jobs.value[jobIndex];
        // Update job state to waiting after promotion
        jobs.value[jobIndex] = { ...job, state: 'waiting' };

        // Update queue counts
        const { useQueuesStore } = await import('@/stores/queues');
        const queuesStore = useQueuesStore();
        queuesStore.updateJobCount(queueName, 'delayed', -1);
        queuesStore.updateJobCount(queueName, 'waiting', 1);
      }

      console.log(`Successfully promoted job ${jobId} in queue ${queueName}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to promote job';
      console.error('Failed to promote job:', err);
      throw err;
    }
  }

  async function bulkRemoveJobs(queueName: string, jobIds: string[]) {
    try {
      const result = await apiClient.bulkRemoveJobs(queueName, jobIds);

      // Remove successfully deleted jobs from local state
      if (result.success > 0) {
        jobs.value = jobs.value.filter(job => !jobIds.includes(job.id));

        // Update pagination total
        pagination.total = Math.max(0, pagination.total - result.success);
        pagination.totalPages = Math.ceil(pagination.total / pagination.pageSize);

        // Clear selection since we removed the jobs
        clearSelection();

        // Update queue counts - we'll need to refetch since we don't know the states of removed jobs
        const { useQueuesStore } = await import('@/stores/queues');
        const queuesStore = useQueuesStore();
        queuesStore.fetchQueues(); // Refresh queue counts
      }

      console.log(`Bulk remove completed: ${result.success} success, ${result.failed} failed`);

      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to bulk remove jobs';
      console.error('Failed to bulk remove jobs:', err);
      throw err;
    }
  }

  function updateFilters(newFilters: Partial<GetJobsRequest>) {
    Object.assign(filters, newFilters);
    filters.page = 1; // Reset to first page when filters change
  }

  function updatePage(page: number) {
    filters.page = page;
  }

  function toggleJobSelection(jobId: string) {
    if (selection.selectedIds.has(jobId)) {
      selection.selectedIds.delete(jobId);
    } else {
      selection.selectedIds.add(jobId);
    }
    
    // Update select all state
    selection.isAllSelected = selection.selectedIds.size === jobs.value.length;
  }

  function toggleSelectAll() {
    if (selection.isAllSelected) {
      clearSelection();
    } else {
      jobs.value.forEach(job => selection.selectedIds.add(job.id));
      selection.isAllSelected = true;
    }
  }

  function clearSelection() {
    selection.selectedIds.clear();
    selection.isAllSelected = false;
  }

  function reset() {
    jobs.value = [];
    jobDetail.value = null;
    loading.value = false;
    loadingDetail.value = false;
    error.value = null;
    currentQueue.value = '';
    
    // Reset pagination
    Object.assign(pagination, {
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 0,
    });

    // Reset filters
    Object.assign(filters, {
      page: 1,
      pageSize: 500,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      states: undefined,
      timeRange: undefined,
      minDuration: undefined,
      minAttempts: undefined,
      search: '',
    });

    clearSelection();
  }

  return {
    // State
    jobs,
    jobDetail,
    loading,
    loadingDetail,
    error,
    currentQueue,
    pagination,
    filters,
    selection,
    
    // Getters
    hasSelection,
    selectedJobs,
    jobsByState,
    
    // Actions
    fetchJobs,
    fetchJobDetail,
    fetchJobById,
    removeJob,
    retryJob,
    discardJob,
    promoteJob,
    bulkRemoveJobs,
    updateFilters,
    updatePage,
    toggleJobSelection,
    toggleSelectAll,
    clearSelection,
    reset,
  };
});
