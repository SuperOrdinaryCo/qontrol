import { Job } from 'bullmq';
import { QueueRegistry } from './queueRegistry';
import { JobSummary, JobDetail, GetJobsRequest, JobState } from '../types/api';
import { Logger } from '../config/logger';
import { RedisConnection } from '../config/redis';

export class JobService {
  /**
   * Get jobs with pagination, filtering, and search
   */
  static async getJobs(queueName: string, params: GetJobsRequest): Promise<{
    jobs: JobSummary[];
    total: number;
  }> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const page = params.page || 1;
      const pageSize = Math.min(params.pageSize || 50, 1000); // Cap at 1000
      const start = (page - 1) * pageSize;

      // Get jobs by states if specified, otherwise default to waiting state only
      const states = params.states || ['waiting'];

      let allJobs: Job[] = [];

      // Fetch jobs from each requested state
      for (const state of states) {
        try {
          // Use correct BullMQ method to get jobs for each state
          const stateJobs = await queue.getJobs(state, 0, -1, true);
          allJobs.push(...stateJobs);
        } catch (error) {
          logger.warn(`Failed to get ${state} jobs for queue ${queueName}:`, error);
        }
      }

      // Apply time range filters
      if (params.timeRange) {
        allJobs = this.filterByTimeRange(allJobs, params.timeRange);
      }

      // Apply duration filter
      if (params.minDuration !== undefined) {
        allJobs = allJobs.filter(job => {
          const duration = this.calculateDuration(job);
          return duration !== undefined && duration >= params.minDuration!;
        });
      }

      // Apply attempts filter
      if (params.minAttempts !== undefined) {
        allJobs = allJobs.filter(job => job.attemptsMade >= params.minAttempts!);
      }

      // Apply data/name search filter (heavy search)
      if (params.search) {
        allJobs = this.filterByDataAndName(allJobs, params.search);
      }

      // Sort jobs
      if (params.sortBy) {
        allJobs = this.sortJobs(allJobs, params.sortBy, params.sortOrder || 'desc');
      }

      // Apply pagination after filtering
      const total = allJobs.length;
      const paginatedJobs = allJobs.slice(start, start + pageSize);

      // Convert to JobSummary format
      const jobSummaries = await Promise.all(paginatedJobs.map(job => this.jobToSummary(job)));

      return {
        jobs: jobSummaries,
        total: total,
      };
    } catch (error) {
      logger.error(`Failed to get jobs for queue ${queueName}:`, error);
      return { jobs: [], total: 0 };
    }
  }

  /**
   * Get a single job by ID
   */
  static async getJobById(queueName: string, jobId: string): Promise<{
    jobs: JobSummary[];
    total: number;
  }> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        return { jobs: [], total: 0 };
      }

      const jobSummary = await this.jobToSummary(job);
      return { jobs: [jobSummary], total: 1 };
    } catch (error) {
      logger.error(`Failed to get job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed information about a job
   */
  static async getJobDetail(queueName: string, jobId: string): Promise<JobDetail> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found in queue ${queueName}`);
      }

      return this.jobToDetail(job);
    } catch (error) {
      logger.error(`Failed to get job detail for ${jobId} in queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Remove a single job
   */
  static async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        logger.warn(`Job ${jobId} not found in queue ${queueName} for removal`);
        return false;
      }

      await job.remove({ removeChildren: true });
      logger.info(`Successfully removed job ${jobId} from queue ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Health check for the job service
   */
  static async getHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    details: {
      redis: 'connected' | 'disconnected';
      latency: number;
    };
  }> {
    const logger = Logger.getInstance();

    try {
      const redis = await RedisConnection.getHealthCheck();

      if (!redis.connected) {
        throw new Error('Redis is not connected');
      }

      // Basic health check - if we can get queue info, Redis is likely working
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: {
          redis: 'connected',
          latency: redis.latency ?? 0,
        },
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        details: {
          redis: 'disconnected',
          latency: 0,
        },
      };
    }
  }

  /**
   * Retry a failed job
   */
  static async retryJob(queueName: string, jobId: string): Promise<boolean> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        logger.warn(`Job ${jobId} not found in queue ${queueName} for retry`);
        return false;
      }

      // Check if job is in a retryable state (failed)
      if (job.failedReason) {
        await job.retry();
        logger.info(`Successfully retried job ${jobId} in queue ${queueName}`);
        return true;
      } else {
        logger.warn(`Job ${jobId} in queue ${queueName} is not in a failed state and cannot be retried`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to retry job ${jobId} in queue ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Discard an active job
   */
  static async discardJob(queueName: string, jobId: string): Promise<boolean> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        logger.warn(`Job ${jobId} not found in queue ${queueName} for discard`);
        return false;
      }

      const state = await this.getJobState(job);

      // Check if job is in an active state
      if (['active', 'waiting', 'waiting-children'].includes(state)) {
        job.discard();
        logger.info(`Successfully discarded job ${jobId} in queue ${queueName}`);
        return true;
      } else {
        logger.warn(`Job ${jobId} in queue ${queueName} is not in an active state and cannot be discarded`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to discard job ${jobId} in queue ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Promote a delayed job
   */
  static async promoteJob(queueName: string, jobId: string): Promise<boolean> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        logger.warn(`Job ${jobId} not found in queue ${queueName} for promotion`);
        return false;
      }

      // Check if job is delayed
      if (await job.isDelayed()) {
        await job.promote();
        logger.info(`Successfully promoted job ${jobId} in queue ${queueName}`);
        return true;
      } else {
        logger.warn(`Job ${jobId} in queue ${queueName} is not delayed and cannot be promoted`);
        return false;
      }
    } catch (error) {
      logger.error(`Failed to promote job ${jobId} in queue ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Bulk remove jobs by their IDs
   */
  static async bulkRemoveJobs(queueName: string, jobIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ jobId: string; error: string }>;
  }> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ jobId: string; error: string }>,
      };

      // Process jobs in parallel with a concurrency limit
      const concurrencyLimit = 10;
      const chunks = [];
      for (let i = 0; i < jobIds.length; i += concurrencyLimit) {
        chunks.push(jobIds.slice(i, i + concurrencyLimit));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (jobId) => {
          try {
            const job = await queue.getJob(jobId);
            if (!job) {
              results.failed++;
              results.errors.push({ jobId, error: 'Job not found' });
              return;
            }

            await job.remove({ removeChildren: true });
            results.success++;
            logger.info(`Bulk removed job ${jobId} from queue ${queueName}`);
          } catch (error) {
            results.failed++;
            results.errors.push({
              jobId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error(`Failed to bulk remove job ${jobId} from queue ${queueName}:`, error);
          }
        });

        await Promise.all(promises);
      }

      logger.info(`Bulk remove completed for queue ${queueName}: ${results.success} success, ${results.failed} failed`);
      return results;
    } catch (error) {
      logger.error(`Failed to bulk remove jobs from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Bulk retry jobs by their IDs
   */
  static async bulkRetryJobs(queueName: string, jobIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ jobId: string; error: string }>;
  }> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ jobId: string; error: string }>,
      };

      // Process jobs in parallel with a concurrency limit
      const concurrencyLimit = 10;
      const chunks = [];
      for (let i = 0; i < jobIds.length; i += concurrencyLimit) {
        chunks.push(jobIds.slice(i, i + concurrencyLimit));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (jobId) => {
          try {
            const job = await queue.getJob(jobId);
            if (!job) {
              results.failed++;
              results.errors.push({ jobId, error: 'Job not found' });
              return;
            }

            // Only retry jobs that are in failed state
            if (job.finishedOn && job.failedReason) {
              await job.retry();
              results.success++;
              logger.info(`Bulk retried job ${jobId} from queue ${queueName}`);
            } else {
              results.failed++;
              results.errors.push({ jobId, error: 'Job is not in failed state' });
            }
          } catch (error) {
            results.failed++;
            results.errors.push({
              jobId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            logger.error(`Failed to bulk retry job ${jobId} from queue ${queueName}:`, error);
          }
        });

        await Promise.all(promises);
      }

      logger.info(`Bulk retry completed for queue ${queueName}: ${results.success} success, ${results.failed} failed`);
      return results;
    } catch (error) {
      logger.error(`Failed to bulk retry jobs from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Pause a queue
   */
  static async pauseQueue(queueName: string): Promise<boolean> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      await queue.pause();
      logger.info(`Successfully paused queue ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Resume a queue
   */
  static async resumeQueue(queueName: string): Promise<boolean> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      await queue.resume();
      logger.info(`Successfully resumed queue ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Convert Job to JobSummary
   */
  private static async jobToSummary(job: Job): Promise<JobSummary> {
    return {
      id: job.id!,
      name: job.name,
      state: await this.getJobState(job),
      createdAt: new Date(job.timestamp),
      processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      duration: this.calculateDuration(job),
      attempts: job.attemptsStarted,
      priority: job.opts.priority,
      delay: job.opts.delay,
    };
  }

  /**
   * Convert Job to JobDetail
   */
  private static async jobToDetail(job: Job): Promise<JobDetail> {
    const summary = await this.jobToSummary(job);

    return {
      ...summary,
      data: this.sanitizeJobData(job.data),
      result: this.sanitizeJobData(job.returnvalue),
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      opts: {
        attempts: job.opts.attempts,
        backoff: job.opts.backoff,
        delay: job.opts.delay,
        repeat: job.opts.repeat,
        priority: job.opts.priority,
      },
      parent: job.parent ? {
        id: job.parent.id,
        queue: job.parent.queueKey,
      } : undefined,
      // TODO: Implement children
      children: undefined,
    };
  }

  /**
   * Get job state from job object using BullMQ's async getState method
   */
  private static async getJobState(job: Job): Promise<JobState> {
    try {
      let state = await job.getState();

      if (await QueueRegistry.getQueue(job.queueName).isPaused()) {
        return 'paused'
      }

      // Map BullMQ states to our JobState interface
      switch (state) {
        case 'completed':
          return 'completed';
        case 'failed':
          return 'failed';
        case 'active':
          return 'active';
        case 'delayed':
          return 'delayed';
        case 'waiting':
          return 'waiting';
        case 'waiting-children':
          return 'waiting-children';
        default:
          // Fallback for any unknown state
          return 'waiting';
      }
    } catch (error) {
      // If getState fails, fallback to waiting
      return 'waiting';
    }
  }

  /**
   * Calculate job duration in milliseconds
   */
  private static calculateDuration(job: Job): number | undefined {
    if (job.processedOn && job.finishedOn) {
      return job.finishedOn - job.processedOn;
    }
    if (job.processedOn && !job.finishedOn) {
      // Job is still active
      return Date.now() - job.processedOn;
    }
    return undefined;
  }

  /**
   * Filter jobs by time range
   */
  private static filterByTimeRange(jobs: Job[], timeRange: NonNullable<GetJobsRequest['timeRange']>): Job[] {
    return jobs.filter(job => {
      let timestamp: number | undefined;

      switch (timeRange.field) {
        case 'createdAt':
          timestamp = job.timestamp;
          break;
        case 'processedOn':
          timestamp = job.processedOn;
          break;
        case 'finishedOn':
          timestamp = job.finishedOn;
          break;
      }

      if (!timestamp) return false;

      if (timeRange.start && timestamp < timeRange.start.getTime()) return false;
      if (timeRange.end && timestamp > timeRange.end.getTime()) return false;

      return true;
    });
  }

  /**
   * Filter jobs by search string (name and data)
   */
  private static filterByDataAndName(jobs: Job[], search: string): Job[] {
    const searchLower = search.toLowerCase();

    return jobs.filter(job => {
      // Search in job name
      if (job.name.toLowerCase().includes(searchLower)) {
        return true;
      }

      // Search in job data (serialize and search)
      try {
        const dataString = JSON.stringify(job.data).toLowerCase();
        return dataString.includes(searchLower);
      } catch {
        return false;
      }
    });
  }

  /**
   * Sort jobs by specified field
   */
  private static sortJobs(jobs: Job[], sortBy: GetJobsRequest['sortBy'], sortOrder: 'asc' | 'desc'): Job[] {
    return jobs.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'createdAt':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'processedOn':
          aValue = a.processedOn || 0;
          bValue = b.processedOn || 0;
          break;
        case 'finishedOn':
          aValue = a.finishedOn || 0;
          bValue = b.finishedOn || 0;
          break;
        case 'duration':
          aValue = this.calculateDuration(a) || 0;
          bValue = this.calculateDuration(b) || 0;
          break;
        case 'state':
          aValue = this.getJobState(a);
          bValue = this.getJobState(b);
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Sanitize job data to prevent large payloads and sensitive data exposure
   */
  private static sanitizeJobData(data: any): any {
    if (!data) return data;

    try {
      const serialized = JSON.stringify(data);

      // Limit payload size to 100KB
      if (serialized.length > 100000) {
        return {
          __truncated: true,
          __originalSize: serialized.length,
          __preview: serialized.substring(0, 1000) + '...',
        };
      }

      return data;
    } catch (error) {
      return {
        __error: 'Failed to serialize job data',
        __type: typeof data,
      };
    }
  }
}
