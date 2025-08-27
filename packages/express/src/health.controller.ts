import {Request, Response} from 'express';
import {BullDash, HealthCheckResponse} from '@bulldash/core';

export class HealthController {
  constructor(protected bullDash: BullDash) {}

  async heathCheck(req: Request, res: Response) {
    const redis = await this.bullDash.getHealth();

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
    return res.status(statusCode).json(response);
  }
}
