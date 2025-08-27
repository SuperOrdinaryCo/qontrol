import { Job } from 'bullmq';
import { QueueRegistry } from './queueRegistry';
import { JobSummary, JobDetail, GetJobsRequest, JobState } from '../types/api';
import { Logger } from '../config/logger';
import { RedisConnection } from '../config/redis';

export class JobService {
  /**
   * Get jobs with pagination, filtering, and search
   */
  static async *getJobs(queueName: string, params: GetJobsRequest) {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const pageSize = Math.min(params.pageSize || 50, 1000); // Cap at 1000
      const page = params.page || 1;
      const getStart = (_page: number) => (_page - 1) * pageSize;
      const getEnd = (_page: number) => getStart(_page) + pageSize - 1;

      // Get jobs by states if specified, otherwise default to waiting state only
      const states = params.states || ['waiting'];
      const state = states[0];

      const totalJobs = await queue.getJobCounts(state);

      let fetchAll = true;
      let _page = page;

      while (fetchAll) {
        const start = getStart(_page);
        const end = getEnd(_page);
        const allJobs: Job[] = await queue.getJobs(state, start, end, params.sortOrder === 'asc');

        if (!params.all || allJobs.length === 0 || allJobs.length < pageSize) {
          fetchAll = false;
        }

        const total = totalJobs[state] || 0;

        // Convert to JobSummary format
        let jobSummaries = await Promise.all(allJobs.map(job => this.jobToSummary(job)));

        if (params.search && params.searchType === 'name') {
          jobSummaries = jobSummaries.filter(job => job.name === params.search)
        }

        _page++;

        yield {
          jobs: jobSummaries,
          total: total,
        };
      }
    } catch (error) {
      logger.error(`Failed to get jobs for queue ${queueName}:`, error);
      yield { jobs: [], total: 0 };
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
      logger.error(`Failed to get job ${jobId} for queue ${queueName}:`, error);
      return { jobs: [], total: 0 };
    }
  }

  /**
   * Add a new job to the queue
   */
  static async addJob(queueName: string, jobData: { name: string; data: any; options: any }): Promise<{ jobId: string; queueName: string }> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const job = await queue.add(jobData.name, jobData.data, jobData.options);

      logger.info(`Job ${job.id} added to queue ${queueName}`);

      return {
        jobId: job.id!,
        queueName
      };
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
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
   * Get job logs
   */
  static async getJobLogs(queueName: string, jobId: string, start = 0, end = -1): Promise<{
    logs: string[];
    count: number;
  }> {
    const logger = Logger.getInstance();

    try {
      const queue = QueueRegistry.getQueue(queueName);
      const { logs, count } = await queue.getJobLogs(jobId, start, end);

      return {
        logs: logs || [],
        count: count || 0,
      };
    } catch (error) {
      logger.error(`Failed to get job logs for ${jobId} in queue ${queueName}:`, error);
      // Return empty logs instead of throwing to allow the UI to still function
      return {
        logs: [],
        count: 0,
      };
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
   * Get detailed Redis statistics
   */
  static async getRedisStats(): Promise<{
    info: Record<string, any>;
    timestamp: Date;
  }> {
    const logger = Logger.getInstance();

    try {
      const redis = await RedisConnection.getInstance();
      const infoString = await redis.info();

      // Parse Redis INFO output into structured data
      const info: Record<string, any> = {};
      const sections = infoString.split('\r\n');

      for (const line of sections) {
        if (line.startsWith('#') || line.trim() === '') continue;

        const [key, value] = line.split(':');
        if (key && value !== undefined) {
          // Try to convert numeric values
          const numValue = Number(value);
          info[key] = isNaN(numValue) ? value : numValue;
        }
      }

      logger.info('Redis stats retrieved successfully');

      return {
        info,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      throw error;
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

    // Get job logs
    let logs: { entries: string[]; count: number } | undefined;
    try {
      const queue = QueueRegistry.getQueue(job.queueName);
      const { logs: logEntries, count } = await queue.getJobLogs(job.id!, 0, -1);
      logs = {
        entries: logEntries || [],
        count: count || 0,
      };
    } catch (error) {
      // If logs can't be retrieved, set to empty
      logs = {
        entries: [],
        count: 0,
      };
    }

    return {
      ...summary,
      data: this.sanitizeJobData(job.data),
      result: this.sanitizeJobData(job.returnvalue),
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      logs,
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

  // static searchJobs(queueName: string, params: GetJobsRequest): Readable {
  //   const states = params.states || ['waiting'];
  //   const state = states[0];
  //
  //   const nameTransformer = new Transform({
  //     objectMode: true,
  //     transform(chunk, encoding, callback) {
  //       try {
  //         const jobs = chunk.jobs.filter((job: JobSummary) =>
  //           job.name === params.search
  //         );
  //
  //         callback(null, {
  //           ...chunk,
  //           jobs,
  //         });
  //       } catch (error) {
  //         callback(error instanceof Error ? error : new Error(String(error)));
  //       }
  //     }
  //   });
  //
  //   const dataTransformer = new Transform({
  //     objectMode: true,
  //     transform(chunk, encoding, callback) {
  //       try {
  //         const { isKeyValue, regex, key, value } = JobService.parseDataSearchQuery(params.search || '');
  //
  //         let jobs = chunk.jobs;
  //
  //         if (isKeyValue) {
  //           jobs = jobs.filter((job: JobSummary) => {
  //             // For JobSummary, we need to get the actual job data
  //             // Since JobSummary doesn't contain the full data, we'll search in available fields
  //             const searchableData = {
  //               id: job.id,
  //               name: job.name,
  //               state: job.state,
  //               createdAt: job.createdAt?.toISOString(),
  //               processedOn: job.processedOn?.toISOString(),
  //               finishedOn: job.finishedOn?.toISOString(),
  //               attempts: job.attempts,
  //               priority: job.priority,
  //               delay: job.delay
  //             };
  //             return JobService.matchesKeyValueSearch(searchableData, key!, value!);
  //           });
  //         } else {
  //           jobs = jobs.filter((job: JobSummary) => {
  //             const searchableData = {
  //               id: job.id,
  //               name: job.name,
  //               state: job.state,
  //               createdAt: job.createdAt?.toISOString(),
  //               processedOn: job.processedOn?.toISOString(),
  //               finishedOn: job.finishedOn?.toISOString(),
  //               attempts: job.attempts,
  //               priority: job.priority,
  //               delay: job.delay
  //             };
  //             return JobService.matchesRegexSearch(searchableData, regex!);
  //           });
  //         }
  //
  //         callback(null, {
  //           ...chunk,
  //           jobs,
  //         });
  //       } catch (error) {
  //         callback(error instanceof Error ? error : new Error(String(error)));
  //       }
  //     }
  //   });
  //
  //   // JSON serializer transform to convert objects to JSON strings
  //   const jsonTransformer = new Transform({
  //     objectMode: true,
  //     transform(chunk, encoding, callback) {
  //       try {
  //         const jsonString = JSON.stringify(chunk) + '\n';
  //         callback(null, jsonString);
  //       } catch (error) {
  //         callback(error instanceof Error ? error : new Error(String(error)));
  //       }
  //     }
  //   });
  //
  //   const transformer = params.searchType === 'data' ? dataTransformer : nameTransformer;
  //
  //   return Readable.from(this.getAllJobsByStateInChunks(queueName, state, {
  //     chunkSize: 1000,
  //     includeJobData: params.searchType === 'data',
  //   }))
  //     .pipe(transformer)
  //     .pipe(jsonTransformer);
  // }

  /**
   * Get all jobs of a specific state using chunks approach as an async generator
   * This provides better memory management by streaming chunks instead of accumulating all jobs
   */
  // static async* getAllJobsByStateInChunks(
  //   queueName: string,
  //   state: JobState,
  //   options: {
  //     chunkSize?: number;
  //     includeJobData?: boolean;
  //   } = {}
  // ): AsyncGenerator<{
  //   jobs: JobSummary[];
  //   chunkIndex: number;
  //   estimatedTotal: number;
  //   processedSoFar: number;
  // }, {
  //   totalProcessed: number;
  //   chunksProcessed: number;
  // }, unknown> {
  //   const logger = Logger.getInstance();
  //   const { chunkSize = 1000, includeJobData = false } = options;
  //
  //   try {
  //     const queue = QueueRegistry.getQueue(queueName);
  //     let chunksProcessed = 0;
  //     let start = 0;
  //     let totalProcessed = 0;
  //     let estimatedTotal = 0;
  //
  //     logger.info(`Starting chunked fetch generator for ${state} jobs in queue ${queueName} with chunk size ${chunkSize}`);
  //
  //     // First, get an estimate of total jobs for this state
  //     try {
  //       const counts = await queue.getJobCounts(state);
  //       estimatedTotal = counts[state] || 0;
  //       logger.info(`Estimated ${estimatedTotal} ${state} jobs in queue ${queueName}`);
  //     } catch (error) {
  //       logger.warn(`Could not get job count estimate for ${state} jobs in queue ${queueName}:`, error);
  //     }
  //
  //     while (true) {
  //       try {
  //         // Fetch a chunk of jobs
  //         const end = start + chunkSize - 1;
  //         const chunkJobs = await queue.getJobs(state, start, end, includeJobData);
  //
  //         if (!chunkJobs || chunkJobs.length === 0) {
  //           logger.info(`No more ${state} jobs found in queue ${queueName}. Stopping at chunk ${chunksProcessed + 1}`);
  //           break;
  //         }
  //
  //         // Convert jobs to JobSummary format
  //         const jobSummaries = await Promise.all(
  //           chunkJobs.map(job => this.jobToSummary(job))
  //         );
  //
  //         totalProcessed += jobSummaries.length;
  //         chunksProcessed++;
  //
  //         logger.debug(`Processed chunk ${chunksProcessed} with ${chunkJobs.length} ${state} jobs from queue ${queueName}`);
  //
  //         // Yield the current chunk with progress information
  //         yield {
  //           jobs: jobSummaries,
  //           chunkIndex: chunksProcessed - 1,
  //           estimatedTotal: Math.max(estimatedTotal, totalProcessed),
  //           processedSoFar: totalProcessed
  //         };
  //
  //         // If we got fewer jobs than requested, we've reached the end
  //         if (chunkJobs.length < chunkSize) {
  //           logger.info(`Reached end of ${state} jobs in queue ${queueName}. Final chunk had ${chunkJobs.length} jobs`);
  //           break;
  //         }
  //
  //         // Move to next chunk
  //         start += chunkSize;
  //
  //         // Add a small delay to prevent overwhelming Redis
  //         await new Promise(resolve => setTimeout(resolve, 10));
  //
  //       } catch (chunkError) {
  //         logger.error(`Error processing chunk ${chunksProcessed + 1} for ${state} jobs in queue ${queueName}:`, chunkError);
  //
  //         // If this is the first chunk and it fails, throw the error
  //         if (chunksProcessed === 0) {
  //           throw chunkError;
  //         }
  //
  //         // For subsequent chunks, log the error but continue
  //         logger.warn(`Skipping failed chunk ${chunksProcessed + 1}, continuing with next chunk`);
  //         start += chunkSize;
  //         continue;
  //       }
  //     }
  //
  //     logger.info(`Completed chunked fetch generator for ${state} jobs in queue ${queueName}: ${totalProcessed} jobs processed in ${chunksProcessed} chunks`);
  //
  //     // Return final summary
  //     return {
  //       totalProcessed,
  //       chunksProcessed
  //     };
  //
  //   } catch (error) {
  //     logger.error(`Failed to get all ${state} jobs for queue ${queueName} using chunks generator:`, error);
  //     throw error;
  //   }
  // }

  /**
   * Parse data search query to determine if it's key-value or regex
   */
  // static parseDataSearchQuery(query: string): {
  //   isKeyValue: boolean;
  //   key?: string;
  //   value?: string;
  //   regex?: RegExp;
  // } {
  //   // Check if it's a key-value search (contains =)
  //   const equalSignIndex = query.indexOf('=');
  //
  //   if (equalSignIndex > 0) {
  //     const key = query.substring(0, equalSignIndex).trim();
  //     const value = query.substring(equalSignIndex + 1).trim();
  //
  //     return {
  //       isKeyValue: true,
  //       key,
  //       value
  //     };
  //   } else {
  //     // Treat as regex search
  //     try {
  //       const regex = new RegExp(query, 'i'); // Case insensitive
  //       return {
  //         isKeyValue: false,
  //         regex
  //       };
  //     } catch {
  //       // If regex is invalid, create a simple string search
  //       const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  //       return {
  //         isKeyValue: false,
  //         regex: new RegExp(escapedQuery, 'i')
  //       };
  //     }
  //   }
  // }
  //
  // /**
  //  * Check if job data matches key-value search
  //  */
  // static matchesKeyValueSearch(data: any, key: string, expectedValue: string): boolean {
  //   try {
  //     const keyParts = key.split('.');
  //     let current = data;
  //
  //     // Navigate through nested object
  //     for (const part of keyParts) {
  //       if (current === null || current === undefined) {
  //         return false;
  //       }
  //       current = current[part];
  //     }
  //
  //     // Convert to string and compare
  //     const actualValue = String(current);
  //     return actualValue === expectedValue;
  //   } catch {
  //     return false;
  //   }
  // }
  //
  // /**
  //  * Check if job data matches regex search
  //  */
  // static matchesRegexSearch(data: any, regex: RegExp): boolean {
  //   try {
  //     const dataString = JSON.stringify(data);
  //     return regex.test(dataString);
  //   } catch {
  //     return false;
  //   }
  // }
}
