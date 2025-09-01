import { Request, Response } from 'express';
import { Qontrol, GetQueuesResponse } from '@qontrol/core';

export class QueueController {
  constructor(private qontrol: Qontrol) {}

  /**
   * GET /api/queues
   * Get all queues with their job counts
   */
  async getQueues(req: Request, res: Response) {
    try {
      const queues = await this.qontrol.getQueues();

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
  }

  /**
   * GET /api/queues/:queue
   * Get a specific queue with its job counts
   */
  async getQueue(req: Request, res: Response) {
    try {
      const queueName = req.params.queue;
      const queues = await this.qontrol.getQueues();
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
  }

  /**
   * POST /api/queues/:queue/pause
   * Pause a queue
   */
  async pauseQueue(req: Request, res: Response) {
    try {
      const { queue: queueName } = req.params;

      const success = await this.qontrol.pauseQueue(queueName);

      if (!success) {
        return res.status(500).json({
          message: 'Failed to pause queue',
          code: 'QUEUE_PAUSE_FAILED',
        });
      }

      res.json({
        message: 'Queue paused successfully',
        queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to pause queue',
        code: 'QUEUE_PAUSE_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/resume
   * Resume a queue
   */
  async resumeQueue(req: Request, res: Response) {
    try {
      const { queue: queueName } = req.params;

      const success = await this.qontrol.resumeQueue(queueName);

      if (!success) {
        return res.status(500).json({
          message: 'Failed to resume queue',
          code: 'QUEUE_RESUME_FAILED',
        });
      }

      res.json({
        message: 'Queue resumed successfully',
        queueName,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        message: 'Failed to resume queue',
        code: 'QUEUE_RESUME_ERROR',
      });
    }
  }

  /**
   * POST /api/queues/:queue/clean
   * Clean jobs from a specific queue
   */
  async cleanQueue(req: Request, res: Response) {
    try {
      const queueName = req.params.queue;
      const { grace = 0, limit = 0, type = 'completed' } = req.body;

      const cleaned = await this.qontrol.cleanQueue(queueName, grace, limit, type);

      const response = {
        cleaned,
        queueName,
        type,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        message: `Failed to clean queue ${req.params.queue}`,
        code: 'QUEUE_CLEAN_ERROR',
        details: error.message,
      });
    }
  }

  /**
   * DELETE /api/queues/:queue
   * Remove a specific queue
   */
  async removeQueue(req: Request, res: Response) {
    try {
      const queueName = req.params.queue;

      await this.qontrol.obliterateQueue(queueName);

      const response = {
        queueName,
        timestamp: new Date(),
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        message: `Failed to remove queue ${req.params.queue}`,
        code: 'QUEUE_REMOVE_ERROR',
        details: error.message,
      });
    }
  }
}
