import axios from 'axios';
import type {
  QueueInfo,
  JobSummary,
  JobDetail,
  GetJobsRequest,
  GetQueuesResponse,
  GetJobsResponse,
  GetJobDetailResponse,
  HealthCheckResponse,
  AppSettings,
} from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
    params: config.params,
    data: config.data,
  });
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Queue operations
  async getQueues(): Promise<QueueInfo[]> {
    const response = await api.get<GetQueuesResponse>('/queues');
    return response.data.queues;
  },

  // Job operations
  async getJobs(queueName: string, params: GetJobsRequest = {}): Promise<GetJobsResponse> {
    const response = await api.get<GetJobsResponse>(`/queues/${queueName}/jobs`, {
      params: {
        ...params,
        // Flatten timeRange for query params
        ...(params.timeRange && {
          'timeRange.field': params.timeRange.field,
          'timeRange.start': params.timeRange.start?.toISOString(),
          'timeRange.end': params.timeRange.end?.toISOString(),
        }),
      },
    });
    return response.data;
  },

  async getJobById(queueName: string, jobId: string): Promise<GetJobsResponse> {
    const response = await api.get<GetJobsResponse>(`/queues/${queueName}/job-by-id/${jobId}`);
    return response.data;
  },

  async getJobDetail(queueName: string, jobId: string): Promise<JobDetail> {
    const response = await api.get<GetJobDetailResponse>(`/queues/${queueName}/jobs/${jobId}`);
    return response.data.job;
  },

  async removeJob(queueName: string, jobId: string): Promise<void> {
    await api.delete(`/queues/${queueName}/jobs/${jobId}`);
  },

  async retryJob(queueName: string, jobId: string): Promise<void> {
    await api.post(`/queues/${queueName}/jobs/${jobId}/retry`);
  },

  async discardJob(queueName: string, jobId: string): Promise<void> {
    await api.post(`/queues/${queueName}/jobs/${jobId}/discard`);
  },

  async promoteJob(queueName: string, jobId: string): Promise<void> {
    await api.post(`/queues/${queueName}/jobs/${jobId}/promote`);
  },

  async bulkRemoveJobs(queueName: string, jobIds: string[]): Promise<{ success: number; failed: number; errors?: Array<{ jobId: string; error: string }> }> {
    const response = await api.post(`/queues/${queueName}/jobs/bulk-remove`, { jobIds });
    return response.data;
  },

  // Health check
  async getHealth(): Promise<HealthCheckResponse> {
    const response = await api.get<HealthCheckResponse>('/healthz');
    return response.data;
  },
};
