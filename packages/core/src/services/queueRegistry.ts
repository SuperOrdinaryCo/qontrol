import { Queue } from 'bullmq';
import { RedisConnection } from '../config/redis';
import { QueueInfo } from '../types/api';
import { Logger } from '../config/logger';

export class QueueRegistry {
  private static queues: Map<string, Queue> = new Map();
  private static discoveredQueues: Set<string> = new Set();

  /**
   * Discover queues safely by filtering out corrupted keys
   */
  static async discoverQueues(): Promise<string[]> {
    const logger = Logger.getInstance();

    try {
      const redis = RedisConnection.getInstance();
      const prefix = RedisConnection.getPrefix();

      // Search for queue meta keys with the custom prefix
      const keys = await redis.keys(`${prefix}:*:meta`);
      console.log(`Found ${keys.length} potential queue keys`);

      const queueNames = keys
        .map(key => {
          // Remove the prefix and :meta suffix to get queue name
          let queueName = key;

          // Remove prefix from the beginning
          if (queueName.startsWith(prefix)) {
            queueName = queueName.substring(prefix.length + 1);
          }

          // Remove :meta from the end
          if (queueName.endsWith(':meta')) {
            queueName = queueName.substring(0, queueName.length - 5);
          }

          return queueName;
        })
        .filter(name => {
          // Filter out corrupted queue names
          if (!name || name.length === 0) return false;

          // Filter out names with excessive colons (corruption indicator)
          if (name.includes('::') || name.includes(':')) {
            logger.warn(`Filtering out corrupted queue name: "${name}"`);
            return false;
          }

          // Filter out names that are too long (likely corrupted)
          if (name.length > 50) {
            logger.warn(`Filtering out overly long queue name: "${name}"`);
            return false;
          }

          // Only allow alphanumeric, underscores, hyphens, and single colons
          if (!/^[a-zA-Z0-9_:-]+$/.test(name)) {
            logger.warn(`Filtering out invalid queue name: "${name}"`);
            return false;
          }

          return true;
        })
        // Remove duplicates
        .filter((name, index, array) => array.indexOf(name) === index);

      logger.info(`Discovered ${queueNames.length} valid queues with prefix "${prefix}":`, queueNames);

      // Log filtered out count for debugging
      const filteredCount = keys.length - queueNames.length;
      if (filteredCount > 0) {
        logger.warn(`Filtered out ${filteredCount} corrupted/invalid queue keys`);
      }

      return queueNames;
    } catch (error) {
      logger.error('Failed to discover queues:', error);
      return [];
    }
  }

  /**
   * Get or create a Queue instance
   */
  static getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: RedisConnection.getInstance(),
        prefix: RedisConnection.getPrefix(),
      });
      this.queues.set(queueName, queue);
    }
    return this.queues.get(queueName)!;
  }

  /**
   * Get queue information with job counts
   */
  static async getQueueInfo(queueName: string): Promise<QueueInfo> {
    const logger = Logger.getInstance();

    try {
      const queue = this.getQueue(queueName);
      const counts = await queue.getJobCounts();
      const isPaused = await queue.isPaused();

      return {
        name: queueName,
        counts: {
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
          paused: counts.paused || 0,
          'waiting-children': counts['waiting-children'] || 0,
        },
        isPaused,
      };
    } catch (error) {
      logger.error(`Failed to get queue info for ${queueName}:`, error);
      return {
        name: queueName,
        counts: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0,
          'waiting-children': 0,
        },
        isPaused: false,
      };
    }
  }

  /**
   * Get all queues with their information
   */
  static async getAllQueuesInfo(): Promise<QueueInfo[]> {
    const queueNames = await this.discoverQueues();

    // Clear any stale queue instances that are no longer discovered
    const discoveredSet = new Set(queueNames);
    for (const [name, queue] of this.queues.entries()) {
      if (!discoveredSet.has(name)) {
        await queue.close();
        this.queues.delete(name);
      }
    }

    const queueInfoPromises = queueNames.map(name => this.getQueueInfo(name));
    return Promise.all(queueInfoPromises);
  }

  /**
   * Clean up all queue connections
   */
  static async cleanup(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map(queue => queue.close());
    await Promise.all(closePromises);
    this.queues.clear();
  }
}
