import { Request, Response } from 'express';
import { Qontrol, Logger } from '@qontrol/core';

export class RedisController {
  constructor(private qontrol: Qontrol) {}

  /**
   * GET /api/redis/stats
   * Get detailed Redis statistics
   */
  async getStats(req: Request, res: Response) {
    try {
      const stats = await this.qontrol.getRedisStats();

      res.json({
        info: stats.info,
        timestamp: stats.timestamp,
      });
    } catch (error) {
      Logger.getInstance().error('Redis stats error:', error);
      res.status(500).json({
        message: 'Failed to retrieve Redis statistics',
        code: 'REDIS_STATS_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
