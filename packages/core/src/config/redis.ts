import Redis from 'ioredis';
import { Queue, QueueEvents } from 'bullmq';
import { Logger } from './logger';
import { configManager } from './env';

export class RedisConnection {
  private static instance: Redis;
  private static queueEvents: Map<string, QueueEvents> = new Map();

  static getInstance(): Redis {
    const logger = Logger.getInstance();

    if (!this.instance) {
      const config = configManager.config;

      this.instance = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        username: config.redis.username,
        db: config.redis.db,
        // Fixed: removed deprecated option
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
      });

      this.instance.on('connect', () => {
        logger.info('Redis connected');
      });

      this.instance.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });

      this.instance.on('close', () => {
        logger.warn('Redis connection closed');
      });
    }
    return this.instance;
  }

  static getPrefix(): string {
    return configManager.config.queuePrefix || '';
  }

  static async getHealthCheck(): Promise<{ connected: boolean; latency?: number }> {
    try {
      const start = Date.now();
      await this.getInstance().ping();
      const latency = Date.now() - start;
      return { connected: true, latency };
    } catch (error) {
      const logger = Logger.getInstance();
      logger.error('Redis health check failed:', error);
      return { connected: false };
    }
  }

  static getQueueEvents(queueName: string): QueueEvents {
    if (!this.queueEvents.has(queueName)) {
      const queueEvents = new QueueEvents(queueName, {
        connection: this.getInstance(),
        prefix: this.getPrefix(),
      });
      this.queueEvents.set(queueName, queueEvents);
    }
    return this.queueEvents.get(queueName)!;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
    }

    for (const [, queueEvents] of this.queueEvents) {
      await queueEvents.close();
    }
    this.queueEvents.clear();
  }
}
