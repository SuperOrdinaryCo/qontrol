import { Request, Response } from 'express';
import { BullDash, GetJobsResponse, GetJobDetailResponse, BulkActionResponse } from '@bulldash/core';
import { Readable, Transform } from 'node:stream';

export class JobsController {
  constructor(private bullDash: BullDash) {}

  /**
   * GET /api/queues/:queue/jobs
   * Get jobs for a specific queue with pagination or all streamed
   */
  async getJobs(req: Request, res: Response) {
    const queueName = req.params.queue;
    const params = req.validatedQuery!;

    try {
      // Get the async generator from BullDash
      const jobsGenerator = this.bullDash.getJobs(queueName, params);

      const toJsonTransform = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          if (chunk.jobs.length > 0) {
            const json = JSON.stringify(chunk) + '\n';
            callback(null, json);
          } else {
            callback();
          }
        },
        flush(callback) {
          callback();
        }
      });

      // Set proper headers for streaming JSON
      res.setHeader('Content-Type', 'application/x-ndjson'); // Newline-delimited JSON
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = Readable.from(jobsGenerator);

      // Handle stream errors before starting
      stream.on('error', (error) => {
        console.error('Error streaming jobs:', error);
        if (!res.headersSent) {
          res.status(500).json({
            message: 'Failed to stream jobs',
            code: 'JOBS_STREAM_ERROR',
          });
        } else {
          // If headers already sent, just end the response
          res.end();
        }
      });

      toJsonTransform.on('error', (error) => {
        console.error('Error in transform stream:', error);
        if (!res.headersSent) {
          res.status(500).json({
            message: 'Failed to transform jobs',
            code: 'JOBS_TRANSFORM_ERROR',
          });
        } else {
          res.end();
        }
      });

      // Start streaming
      stream
        .pipe(toJsonTransform)
        .pipe(res);

    } catch (error) {
      console.error('Error setting up jobs stream:', error);
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Failed to setup jobs stream',
          code: 'JOBS_SETUP_ERROR',
        });
      }
    }
  }

  /**
   * GET /api/queues/:queue/job-by-id/:id
   * Fast lookup for a specific job by ID
   */
  async getJobById(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const { jobs, total } = await this.bullDash.getJobById(queueName, jobId);

      const response: GetJobsResponse = {
        jobs,
        pagination: {
          page: 1,
          pageSize: 1,
          total,
          totalPages: 1,
        },
        filters: {},
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch job by ID',
        code: 'JOB_ID_FETCH_ERROR',
      });
    }
  }

  /**
   * GET /api/queues/:queue/jobs/:id
   * Get detailed information for a specific job
   */
  async getJobDetail(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const job = await this.bullDash.getJobDetail(queueName, jobId);

      if (!job) {
        return res.status(404).json({
          message: 'Job not found',
          code: 'JOB_NOT_FOUND',
        });
      }

      const response: GetJobDetailResponse = {
        job,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch job details',
        code: 'JOB_DETAIL_FETCH_ERROR',
      });
    }
  }

  /**
   * GET /api/queues/:queue/jobs/:id/logs
   * Get logs for a specific job
   */
  async getJobLogs(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;
      const start = parseInt(req.query.start as string) || 0;
      const end = parseInt(req.query.end as string) || -1;

      const logsData = await this.bullDash.getJobLogs(queueName, jobId, start, end);

      res.json({
        logs: logsData.logs,
        count: logsData.count,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch job logs',
        code: 'JOB_LOGS_FETCH_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/jobs
   * Add a new job to the queue
   */
  async addJob(req: Request, res: Response) {
    try {
      const { queue: queueName } = req.params;
      const { name, data, options } = req.body;

      // Validate required fields
      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          message: 'Job name is required and must be a string',
          code: 'INVALID_JOB_NAME',
        });
      }

      // Validate data - if provided as string, try to parse as JSON
      let parsedData = {};
      if (data !== undefined) {
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            return res.status(400).json({
              message: 'Job data must be valid JSON',
              code: 'INVALID_JOB_DATA_JSON',
              details: 'Unable to parse data as JSON'
            });
          }
        } else if (typeof data === 'object' && data !== null) {
          parsedData = data;
        } else {
          return res.status(400).json({
            message: 'Job data must be a valid JSON object or string',
            code: 'INVALID_JOB_DATA',
          });
        }
      }

      // Validate options - if provided as string, try to parse as JSON
      let parsedOptions = {};
      if (options !== undefined) {
        if (typeof options === 'string') {
          try {
            parsedOptions = JSON.parse(options);
          } catch (e) {
            return res.status(400).json({
              message: 'Job options must be valid JSON',
              code: 'INVALID_JOB_OPTIONS_JSON',
              details: 'Unable to parse options as JSON'
            });
          }
        } else if (typeof options === 'object' && options !== null) {
          parsedOptions = options;
        } else {
          return res.status(400).json({
            message: 'Job options must be a valid JSON object or string',
            code: 'INVALID_JOB_OPTIONS',
          });
        }
      }

      const result = await this.bullDash.addJob(queueName, {
        name: name.trim(),
        data: parsedData,
        options: parsedOptions
      });

      res.status(201).json({
        message: 'Job added successfully',
        jobId: result.jobId,
        queueName: result.queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Add job error:', error);
      res.status(500).json({
        message: 'Failed to add job',
        code: 'JOB_ADD_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * DELETE /api/queues/:queue/jobs/:id
   * Remove a specific job by ID with removeChildren flag
   */
  async removeJob(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await this.bullDash.removeJob(queueName, jobId);

      if (!success) {
        return res.status(404).json({
          message: 'Job not found or could not be removed',
          code: 'JOB_REMOVE_FAILED',
        });
      }

      res.json({
        message: 'Job removed successfully',
        jobId,
        queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to remove job',
        code: 'JOB_REMOVE_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/jobs/:id/retry
   * Retry a failed job
   */
  async retryJob(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await this.bullDash.retryJob(queueName, jobId);

      if (!success) {
        return res.status(404).json({
          message: 'Job not found or cannot be retried',
          code: 'JOB_RETRY_FAILED',
        });
      }

      res.json({
        message: 'Job retry initiated successfully',
        jobId,
        queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to retry job',
        code: 'JOB_RETRY_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/jobs/:id/discard
   * Discard an active job
   */
  async discardJob(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await this.bullDash.discardJob(queueName, jobId);

      if (!success) {
        return res.status(404).json({
          message: 'Job not found or cannot be discarded',
          code: 'JOB_DISCARD_FAILED',
        });
      }

      res.json({
        message: 'Job discarded successfully',
        jobId,
        queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to discard job',
        code: 'JOB_DISCARD_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/jobs/:id/promote
   * Promote a delayed job
   */
  async promoteJob(req: Request, res: Response) {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await this.bullDash.promoteJob(queueName, jobId);

      if (!success) {
        return res.status(404).json({
          message: 'Job not found or cannot be promoted',
          code: 'JOB_PROMOTE_FAILED',
        });
      }

      res.json({
        message: 'Job promoted successfully',
        jobId,
        queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to promote job',
        code: 'JOB_PROMOTE_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/jobs/bulk-remove
   * Bulk remove jobs by their IDs
   */
  async bulkRemoveJobs(req: Request, res: Response) {
    try {
      const { queue: queueName } = req.params;
      const { jobIds } = req.body;

      // Validate input
      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({
          message: 'jobIds must be a non-empty array',
          code: 'INVALID_JOB_IDS',
        });
      }

      // Limit bulk operations to prevent overload
      if (jobIds.length > 100) {
        return res.status(400).json({
          message: 'Cannot remove more than 100 jobs at once',
          code: 'TOO_MANY_JOBS',
        });
      }

      const result = await this.bullDash.bulkRemoveJobs(queueName, jobIds);

      const response: BulkActionResponse = {
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to bulk remove jobs',
        code: 'BULK_REMOVE_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/jobs/bulk-retry
   * Bulk retry jobs by their IDs
   */
  async bulkRetryJobs(req: Request, res: Response) {
    try {
      const { queue: queueName } = req.params;
      const { jobIds } = req.body;

      // Validate input
      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        return res.status(400).json({
          message: 'jobIds must be a non-empty array',
          code: 'INVALID_JOB_IDS',
        });
      }

      // Limit bulk operations to prevent overload
      if (jobIds.length > 100) {
        return res.status(400).json({
          message: 'Cannot retry more than 100 jobs at once',
          code: 'TOO_MANY_JOBS',
        });
      }

      const result = await this.bullDash.bulkRetryJobs(queueName, jobIds);

      const response: BulkActionResponse = {
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        message: 'Failed to bulk retry jobs',
        code: 'BULK_RETRY_ERROR',
      });
    }
  }
}
