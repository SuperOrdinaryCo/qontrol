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
  async function fetchJobs(queueName: string, requestFilters?: Partial<GetJobsRequest>) {
    try {
      loading.value = true;
      error.value = null;
      currentQueue.value = queueName;

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

      // Clear selection when loading new page/filters
      clearSelection();
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch jobs';
      console.error('Failed to fetch jobs:', err);
    } finally {
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
    updateFilters,
    updatePage,
    toggleJobSelection,
    toggleSelectAll,
    clearSelection,
    reset,
  };
});
