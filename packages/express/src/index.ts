import express from 'express';
import path from 'path';
import {
  BulkActionResponse,
  BullDash,
  GetJobDetailResponse,
  GetJobsResponse,
  GetQueuesResponse,
  HealthCheckResponse
} from '@bulldash/core';
import {validateGetJobs} from './validation';

export interface BullDashExpressOptions {}

export function createBullDashRouter(bullDash: BullDash, options: BullDashExpressOptions = {}) {
  const router = express.Router();

  // Serve UI assets from @bulldash/ui package
  try {
    const uiPackagePath = path.dirname(require.resolve('@bulldash/ui/package.json'));
    const uiDistPath = path.join(uiPackagePath, 'dist');

    // Serve static assets (JS, CSS, images) from /assets route
    router.use('/assets', express.static(path.join(uiDistPath, 'assets')));

    // Serve the main dashboard HTML at root with corrected asset paths
    router.get('/', (req, res) => {
      const indexPath = path.join(uiDistPath, 'index.html');

      // Read and modify the HTML to use absolute paths for assets
      const fs = require('fs');
      let html = fs.readFileSync(indexPath, 'utf8');

      // Get the base path from the request URL
      const basePath = req.baseUrl || '';

      // Replace relative asset paths with absolute paths relative to the router mount point
      html = html.replace(/src="\.\/assets\//g, `src="${basePath}/assets/`);
      html = html.replace(/href="\.\/assets\//g, `href="${basePath}/assets/`);

      res.send(html);
    });

    console.log(`✅ Serving BullDash UI from: ${uiDistPath}`);
  } catch (error: any) {
    console.error('❌ Could not locate @bulldash/ui package:', error.message);

    // Fallback: serve a simple error page
    router.get('/', (req, res) => {
      res.status(500).send(`
        <h1>BullDash UI Error</h1>
        <p>Could not load the dashboard UI. Please ensure @bulldash/ui is installed:</p>
        <pre>npm install @bulldash/ui</pre>
        <p>Error: ${error.message}</p>
      `);
    });
  }

  /**
   * GET /api/queues
   * Get all queues with their job counts
   */
  router.get('/api/queues', async (req, res) => {
    try {
      const queues = await bullDash.getQueues();

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
   * GET /api/queues/:queue
   * Get a specific queue with its job counts
   */
  router.get('/api/queues/:queue', async (req, res) => {
    try {
      const queueName = req.params.queue;
      const queues = await bullDash.getQueues();
      const queue = queues.find(q => q.name === queueName);

      if (!queue) {
        return res.status(404).json({
          message: 'Queue not found',
          code: 'QUEUE_NOT_FOUND',
        });
      }

      res.json({
        queue,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch queue',
        code: 'QUEUE_FETCH_ERROR',
      });
    }
  });

  /**
   * GET /api/queues/:queue/jobs
   * Get jobs for a specific queue with pagination, filtering, and search
   */
  router.get('/api/queues/:queue/jobs', validateGetJobs, async (req, res) => {
    try {
      const queueName = req.params.queue;
      const params = req.validatedQuery!;

      const { jobs, total } = await bullDash.getJobs(queueName, params);

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
  router.get('/api/queues/:queue/job-by-id/:id', async (req, res) => {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const { jobs, total } = await bullDash.getJobById(queueName, jobId);

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
  router.get('/api/queues/:queue/jobs/:id', async (req, res) => {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const job = await bullDash.getJobDetail(queueName, jobId);

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
  router.delete('/api/queues/:queue/jobs/:id', async (req, res) => {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await bullDash.removeJob(queueName, jobId);

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
  router.post('/api/queues/:queue/jobs/:id/retry', async (req, res) => {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await bullDash.retryJob(queueName, jobId);

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
  router.post('/api/queues/:queue/jobs/:id/discard', async (req, res) => {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await bullDash.discardJob(queueName, jobId);

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
  router.post('/api/queues/:queue/jobs/:id/promote', async (req, res) => {
    try {
      const { queue: queueName, id: jobId } = req.params;

      const success = await bullDash.promoteJob(queueName, jobId);

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
  router.post('/api/queues/:queue/jobs/bulk-remove', async (req, res) => {
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

      const result = await bullDash.bulkRemoveJobs(queueName, jobIds);

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
  router.get('/api/healthz', async (req, res) => {
    const redis = await bullDash.getHealth();

    const response: HealthCheckResponse = {
      status: redis.status,
      redis: {
        connected: redis.details.redis === 'connected',
        latency: redis.details.latency,
      },
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };

    const statusCode = redis.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);
  });

// v2 Bulk Actions (placeholders - feature flagged)
  /**
   * POST /api/queues/:queue/jobs/bulk
   * Bulk actions on jobs (v2 placeholder)
   */
  router.post('/api/queues/:queue/jobs/bulk', async (req, res) => {
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

  // SPA fallback: serve index.html for all non-API routes (must be after API routes)
  try {
    const uiPackagePath = path.dirname(require.resolve('@bulldash/ui/package.json'));
    const uiDistPath = path.join(uiPackagePath, 'dist');

    router.get('*', (req, res) => {
      // Only serve index.html for non-API routes and non-asset routes
      if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
        const indexPath = path.join(uiDistPath, 'index.html');

        // Read and modify the HTML to use absolute paths for assets
        const fs = require('fs');
        let html = fs.readFileSync(indexPath, 'utf8');

        // Get the base path from the request URL
        const basePath = req.baseUrl || '';

        // Replace relative asset paths with absolute paths relative to the router mount point
        html = html.replace(/src="\.\/assets\//g, `src="${basePath}/assets/`);
        html = html.replace(/href="\.\/assets\//g, `href="${basePath}/assets/`);

        res.send(html);
      } else {
        res.status(404).json({ error: 'Resource not found' });
      }
    });
  } catch (error) {
    // If UI package is not available, serve error for all routes
    router.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.status(500).send(`
          <h1>BullDash UI Error</h1>
          <p>Could not load the dashboard UI. Please ensure @bulldash/ui is built and available.</p>
        `);
      } else {
        res.status(404).json({ error: 'API endpoint not found' });
      }
    });
  }

  return router;
}
