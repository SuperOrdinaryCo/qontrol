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
