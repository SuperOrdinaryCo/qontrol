import { configManager, Config } from './config/env';
import { QueueRegistry } from './services/queueRegistry';
import { JobService } from './services/jobService';

export * from './services/jobService';
export * from './services/queueRegistry';
export * from './config/redis';
export * from './config/logger';
export * from './types/api';
export { Config } from './config/env';

// Main BullDash class for easy setup
export class BullDash {
  constructor(config: Config) {
    configManager.config = config;
  }

  // Get a specific queue instance
  getQueue(queueName: string) {
    return QueueRegistry.getQueue(queueName);
  }

  // Get monitoring data for all queues
  async getQueues() {
    return QueueRegistry.getAllQueuesInfo();
  }

  // Get jobs for a specific queue
  async getJobs(queueName: string, options?: any) {
    return JobService.getJobs(queueName, options);
  }

  // Get job by ID
  async getJobById(queueName: string, jobId: string) {
    return JobService.getJobById(queueName, jobId);
  }

  // Get job detail
  async getJobDetail(queueName: string, jobId: string) {
    return JobService.getJobDetail(queueName, jobId);
  }

  // Remove job
  async removeJob(queueName: string, jobId: string) {
    return JobService.removeJob(queueName, jobId);
  }

  // Retry job
  async retryJob(queueName: string, jobId: string) {
    return JobService.retryJob(queueName, jobId);
  }

  // Discard job
  async discardJob(queueName: string, jobId: string) {
    return JobService.discardJob(queueName, jobId);
  }

  // Promote job
  async promoteJob(queueName: string, jobId: string) {
    return JobService.promoteJob(queueName, jobId);
  }

  // Bulk remove jobs
  async bulkRemoveJobs(queueName: string, jobIds: string[]) {
    return JobService.bulkRemoveJobs(queueName, jobIds);
  }

  // Health check
  async getHealth() {
    return JobService.getHealth();
  }

  // Get info for a specific queue
  async getQueueInfo(queueName: string) {
    return QueueRegistry.getQueueInfo(queueName);
  }

  // Discover queues automatically
  async discoverQueues() {
    return QueueRegistry.discoverQueues();
  }

  // Cleanup resources
  async cleanup() {
    return QueueRegistry.cleanup();
  }
}
