import axios from 'axios';
import type {
  QueueInfo,
  JobDetail,
  GetJobsRequest,
  GetQueuesResponse,
  GetJobsResponse,
  GetJobDetailResponse,
  HealthCheckResponse,
  JobSummary,
} from '@/types';
import {getBaseUrl} from '@/utils/base-url.ts';

// Get basePath from injected configuration or use relative paths
const getApiBaseURL = () => {
  const baseUrl = getBaseUrl();

  // Use relative path 'api' instead of absolute paths
  // This will work regardless of where the router is mounted
  return `${baseUrl}/api`;
};

const api = axios.create({
  baseURL: getApiBaseURL(),
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

  async getQueue(queueName: string): Promise<QueueInfo> {
    const response = await api.get<{ queue: QueueInfo; timestamp: Date }>(`/queues/${queueName}`);
    return response.data.queue;
  },

  // Job operations
  async *getJobs(queueName: string, params: GetJobsRequest = {}): AsyncGenerator<{ jobs: JobSummary[]; total: number }> {
    const response = await api.get(`/queues/${queueName}/jobs`, {
      responseType: 'stream',
      adapter: 'fetch',
      params,
    });

    const stream = response.data; // The response data will be a ReadableStream
    const reader = stream.pipeThrough(new TextDecoderStream()).getReader();

    let buffer = '';

    while (true) {
      const {
        value,
        done
      } = await reader.read();
      if (done) break;
      buffer += value;
    }

    for (const line of buffer.split('\n')) {
      const _line = line.trim();

      if (!_line) continue;

      try {
        yield JSON.parse(_line);
      } catch (e) {
        console.error(e);
      }
    }
  },

  async addJob(queueName: string, jobData: { name: string; data: any; options: any }): Promise<{ jobId: string; queueName: string; timestamp: Date }> {
    const response = await api.post(`/queues/${queueName}/jobs`, jobData);
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

  async bulkRetryJobs(queueName: string, jobIds: string[]): Promise<{ success: number; failed: number; errors?: Array<{ jobId: string; error: string }> }> {
    const response = await api.post(`/queues/${queueName}/jobs/bulk-retry`, { jobIds });
    return response.data;
  },

  async pauseQueue(queueName: string): Promise<void> {
    await api.post(`/queues/${queueName}/pause`);
  },

  async resumeQueue(queueName: string): Promise<void> {
    await api.post(`/queues/${queueName}/resume`);
  },

  // Queue cleaning operations
  async cleanQueue(queueName: string, options: { grace?: number; limit?: number; type?: 'completed' | 'failed' | 'active' | 'delayed' | 'waiting' | 'paused' | 'prioritized' } = {}): Promise<{ cleaned: number; queueName: string; type: string; timestamp: Date }> {
    const response = await api.post(`/queues/${queueName}/clean`, options);
    return response.data;
  },

  async drainQueue(queueName: string): Promise<{ drained: boolean; queueName: string; timestamp: Date }> {
    const response = await api.post(`/queues/${queueName}/drain`);
    return response.data;
  },

  async obliterateQueue(queueName: string): Promise<{ obliterated: boolean; queueName: string; timestamp: Date }> {
    const response = await api.delete(`/queues/${queueName}/obliterate`);
    return response.data;
  },

  // Health check
  async getHealth(): Promise<HealthCheckResponse> {
    const response = await api.get<HealthCheckResponse>('/healthz');
    return response.data;
  },

  // Redis stats
  async getRedisStats(): Promise<{
    info: Record<string, any>;
    timestamp: Date;
  }> {
    const response = await api.get('/redis/stats');
    return response.data;
  },
};
