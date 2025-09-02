import express from 'express';
import path from 'path';
import { Qontrol, Logger } from '@qontrol/core';
import { validateGetJobs } from './validation';
import { HealthController } from './health.controller';
import { RedisController } from './redis.controller';
import { QueueController } from './queue.controller';
import { JobsController } from './jobs.controller';

export interface ExpressOptions {}

export function createQontrolRouter(qontrol: Qontrol, options: ExpressOptions = {}) {
  const router = express.Router();

  // Initialize controllers
  const healthController = new HealthController(qontrol);
  const redisController = new RedisController(qontrol);
  const queueController = new QueueController(qontrol);
  const jobsController = new JobsController(qontrol);

  // Serve UI assets from @qontrol/ui package
  try {
    const uiPackagePath = path.dirname(require.resolve('@qontrol/ui/package.json'));
    const uiDistPath = path.join(uiPackagePath, 'dist');

    // Serve static assets (JS, CSS, images) from /assets route
    router.use('/assets', express.static(path.join(uiDistPath, 'assets')));

    // Serve the main dashboard HTML at root with corrected asset paths
    router.get(['/', '/queue/:name', '/settings'], (req, res) => {
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

    Logger.getInstance().info(`✅ Serving qontrol UI from: ${uiDistPath}`);
  } catch (error: any) {
    Logger.getInstance().error('❌ Could not locate @qontrol/ui package:', error.message);

    // Fallback: serve a simple error page
    const fallbackHtml = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>Dashboard Not Available</h1>
        <p>Could not load the dashboard UI. Please ensure @qontrol/ui is installed:</p>
        <pre>npm install @qontrol/ui</pre>
        <p>Error: ${error.message}</p>
      </div>
    `;
    router.get('/', (req, res) => {
      res.status(500).send(fallbackHtml);
    });
  }

  // Health check routes
  router.get('/api/healthz', (req, res) => healthController.heathCheck(req, res));

  // Redis routes
  router.get('/api/redis/stats', (req, res) => redisController.getStats(req, res));

  // Queue routes
  router.get('/api/queues', (req, res) => queueController.getQueues(req, res));
  router.get('/api/queues/:queue', (req, res) => queueController.getQueue(req, res));
  router.post('/api/queues/:queue/pause', (req, res) => queueController.pauseQueue(req, res));
  router.post('/api/queues/:queue/resume', (req, res) => queueController.resumeQueue(req, res));
  router.post('/api/queues/:queue/clean', (req, res) => queueController.cleanQueue(req, res));
  router.delete('/api/queues/:queue/obliterate', (req, res) => queueController.removeQueue(req, res));

  // Job routes
  router.get('/api/queues/:queue/jobs', validateGetJobs, (req, res) => jobsController.getJobs(req, res));
  router.get('/api/queues/:queue/job-by-id/:id', (req, res) => jobsController.getJobById(req, res));
  router.get('/api/queues/:queue/jobs/:id', (req, res) => jobsController.getJobDetail(req, res));
  router.get('/api/queues/:queue/jobs/:id/logs', (req, res) => jobsController.getJobLogs(req, res));
  router.post('/api/queues/:queue/jobs', (req, res) => jobsController.addJob(req, res));
  router.delete('/api/queues/:queue/jobs/:id', (req, res) => jobsController.removeJob(req, res));
  router.post('/api/queues/:queue/jobs/:id/retry', (req, res) => jobsController.retryJob(req, res));
  router.post('/api/queues/:queue/jobs/:id/discard', (req, res) => jobsController.discardJob(req, res));
  router.post('/api/queues/:queue/jobs/:id/promote', (req, res) => jobsController.promoteJob(req, res));
  router.post('/api/queues/:queue/jobs/bulk-remove', (req, res) => jobsController.bulkRemoveJobs(req, res));
  router.post('/api/queues/:queue/jobs/bulk-retry', (req, res) => jobsController.bulkRetryJobs(req, res));

  return router;
}
