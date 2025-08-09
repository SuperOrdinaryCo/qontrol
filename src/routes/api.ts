import { Router } from 'express';
import { QueueRegistry } from '../services/queueRegistry';
import { JobService } from '../services/jobService';
import { RedisConnection } from '../config/redis';
import { validateGetJobs } from '../middleware/validation';
import { GetQueuesResponse, GetJobsResponse, GetJobDetailResponse, HealthCheckResponse, BulkActionResponse } from '../types/api';

const router = Router();

/**
 * GET /api/queues
 * Get all queues with their job counts
 */
router.get('/queues', async (req, res) => {
  try {
    const queues = await QueueRegistry.getAllQueuesInfo();

    const response: GetQueuesResponse = {
      queues,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch queues',
      code: 'QUEUE_FETCH_ERROR',
    });
  }
});

/**
 * GET /api/queues/:queue/jobs
 * Get jobs for a specific queue with pagination, filtering, and search
 */
router.get('/queues/:queue/jobs', validateGetJobs, async (req, res) => {
  try {
    const queueName = req.params.queue;
    const params = req.validatedQuery!;

    const { jobs, total } = await JobService.getJobs(queueName, params);

    const response: GetJobsResponse = {
      jobs,
      pagination: {
        page: params.page || 1,
        pageSize: params.pageSize || 500,
        total,
        totalPages: Math.ceil(total / (params.pageSize || 500)),
      },
      filters: params,
      timestamp: new Date(),
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch jobs',
      code: 'JOBS_FETCH_ERROR',
    });
  }
});

/**
 * GET /api/queues/:queue/job-by-id/:id
 * Fast lookup for a specific job by ID
 */
router.get('/queues/:queue/job-by-id/:id', async (req, res) => {
  try {
    const { queue: queueName, id: jobId } = req.params;

    const { jobs, total } = await JobService.getJobById(queueName, jobId);

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
});

/**
 * GET /api/queues/:queue/jobs/:id
 * Get detailed information for a specific job
 */
router.get('/queues/:queue/jobs/:id', async (req, res) => {
  try {
    const { queue: queueName, id: jobId } = req.params;

    const job = await JobService.getJobDetail(queueName, jobId);

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
});

/**
 * DELETE /api/queues/:queue/jobs/:id
 * Remove a specific job by ID with removeChildren flag
 */
router.delete('/queues/:queue/jobs/:id', async (req, res) => {
  try {
    const { queue: queueName, id: jobId } = req.params;

    const success = await JobService.removeJob(queueName, jobId);

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
});

/**
 * POST /api/queues/:queue/jobs/:id/retry
 * Retry a failed job
 */
router.post('/queues/:queue/jobs/:id/retry', async (req, res) => {
  try {
    const { queue: queueName, id: jobId } = req.params;

    const success = await JobService.retryJob(queueName, jobId);

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
});

/**
 * POST /api/queues/:queue/jobs/:id/discard
 * Discard an active job
 */
router.post('/queues/:queue/jobs/:id/discard', async (req, res) => {
  try {
    const { queue: queueName, id: jobId } = req.params;

    const success = await JobService.discardJob(queueName, jobId);

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
});

/**
 * POST /api/queues/:queue/jobs/:id/promote
 * Promote a delayed job
 */
router.post('/queues/:queue/jobs/:id/promote', async (req, res) => {
  try {
    const { queue: queueName, id: jobId } = req.params;

    const success = await JobService.promoteJob(queueName, jobId);

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
});

/**
 * POST /api/queues/:queue/jobs/bulk-remove
 * Bulk remove jobs by their IDs
 */
router.post('/queues/:queue/jobs/bulk-remove', async (req, res) => {
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

    const result = await JobService.bulkRemoveJobs(queueName, jobIds);

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
});

/**
 * GET /api/healthz
 * Health check endpoint
 */
router.get('/healthz', async (req, res) => {
  try {
    const redis = await RedisConnection.getHealthCheck();

    const response: HealthCheckResponse = {
      status: redis.connected ? 'healthy' : 'unhealthy',
      redis,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };

    const statusCode = redis.connected ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      redis: { connected: false },
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    });
  }
});

// v2 Bulk Actions (placeholders - feature flagged)
/**
 * POST /api/queues/:queue/jobs/bulk
 * Bulk actions on jobs (v2 placeholder)
 */
router.post('/queues/:queue/jobs/bulk', async (req, res) => {
  // Feature flag check
  if (!process.env.ENABLE_BULK_ACTIONS) {
    return res.status(501).json({
      message: 'Bulk actions not implemented in v1',
      code: 'FEATURE_NOT_IMPLEMENTED',
    });
  }

  // v2 implementation placeholder
  const response: BulkActionResponse = {
    success: 0,
    failed: 0,
    errors: [{
      jobId: 'placeholder',
      error: 'Bulk actions will be implemented in v2',
    }],
  };

  res.status(501).json(response);
});

export default router;
