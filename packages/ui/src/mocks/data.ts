// Mock data for the queue management system
import type { QueueInfo, JobSummary, JobDetail, JobState } from '../types/index'

// Sample queue data
export const mockQueues: QueueInfo[] = [
  {
    name: 'email-queue',
    counts: {
      waiting: 15,
      active: 3,
      completed: 245,
      failed: 8,
      delayed: 2,
      paused: 0,
      prioritized: 5,
      'waiting-children': 1,
    },
    isPaused: false,
  },
  {
    name: 'image-processing',
    counts: {
      waiting: 0,
      active: 1,
      completed: 89,
      failed: 3,
      delayed: 0,
      paused: 0,
      prioritized: 0,
      'waiting-children': 0,
    },
    isPaused: false,
  },
  {
    name: 'notification-queue',
    counts: {
      waiting: 8,
      active: 0,
      completed: 156,
      failed: 12,
      delayed: 1,
      paused: 0,
      prioritized: 2,
      'waiting-children': 0,
    },
    isPaused: true,
  },
  {
    name: 'data-export',
    counts: {
      waiting: 2,
      active: 0,
      completed: 34,
      failed: 1,
      delayed: 0,
      paused: 0,
      prioritized: 0,
      'waiting-children': 0,
    },
    isPaused: false,
  },
]

// Sample job data generator
export function generateMockJobs(queueName: string, count: number = 50): JobSummary[] {
  const jobTypes = ['send-email', 'process-image', 'send-notification', 'export-data']
  const states: JobState[] = ['waiting', 'active', 'completed', 'failed', 'delayed']

  return Array.from({ length: count }, (_, i) => {
    const state = states[Math.floor(Math.random() * states.length)]
    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Last week
    const processedOn = state !== 'waiting' && state !== 'delayed'
      ? new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000)
      : undefined
    const finishedOn = (state === 'completed' || state === 'failed') && processedOn
      ? new Date(processedOn.getTime() + Math.random() * 30 * 60 * 1000)
      : undefined

    return {
      id: `job-${queueName}-${i + 1}`,
      name: jobTypes[Math.floor(Math.random() * jobTypes.length)],
      state,
      createdAt,
      processedOn,
      finishedOn,
      duration: finishedOn && processedOn ? finishedOn.getTime() - processedOn.getTime() : undefined,
      attempts: Math.floor(Math.random() * 3) + 1,
      priority: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : undefined,
      delay: state === 'delayed' ? Math.floor(Math.random() * 60000) : undefined,
      data: {
        userId: Math.floor(Math.random() * 1000),
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        type: jobTypes[Math.floor(Math.random() * jobTypes.length)],
      },
    }
  })
}

export function generateMockJobDetail(jobSummary: JobSummary): JobDetail {
  return {
    ...jobSummary,
    data: {
      ...jobSummary.data,
      payload: 'Extended job data here',
      metadata: {
        source: 'api',
        version: '1.0.0',
      },
    },
    result: jobSummary.state === 'completed' ? { success: true, message: 'Job completed successfully' } : undefined,
    failedReason: jobSummary.state === 'failed' ? 'Network timeout' : undefined,
    stacktrace: jobSummary.state === 'failed' ? [
      'Error: Network timeout',
      '    at processJob (/app/worker.js:123:45)',
      '    at Worker.process (/app/worker.js:89:12)',
    ] : undefined,
    logs: {
      entries: [
        `[${new Date().toISOString()}] Job started`,
        `[${new Date().toISOString()}] Processing ${jobSummary.name}`,
        jobSummary.state === 'completed' ? `[${new Date().toISOString()}] Job completed successfully` :
        jobSummary.state === 'failed' ? `[${new Date().toISOString()}] Job failed with error` :
        `[${new Date().toISOString()}] Job in progress`,
      ],
      count: 3,
    },
    opts: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      delay: jobSummary.delay,
      priority: jobSummary.priority,
    },
    parent: Math.random() > 0.8 ? { id: 'parent-job-123', queue: 'parent-queue' } : undefined,
    children: Math.random() > 0.9 ? [
      { id: 'child-job-456', queue: 'child-queue' },
      { id: 'child-job-789', queue: 'child-queue' },
    ] : undefined,
  }
}

export const mockRedisStats = {
  info: {
    server: {
      redis_version: '7.0.0',
      redis_mode: 'standalone',
      os: 'Linux 5.4.0-91-generic x86_64',
      uptime_in_seconds: 86400,
      uptime_in_days: 1,
    },
    clients: {
      connected_clients: 5,
      client_recent_max_input_buffer: 8,
      client_recent_max_output_buffer: 0,
    },
    memory: {
      used_memory: 1048576,
      used_memory_human: '1.00M',
      used_memory_rss: 2097152,
      used_memory_rss_human: '2.00M',
      used_memory_peak: 1572864,
      used_memory_peak_human: '1.50M',
      maxmemory: 0,
      maxmemory_human: '0B',
    },
    persistence: {
      loading: 0,
      rdb_changes_since_last_save: 0,
      rdb_bgsave_in_progress: 0,
      rdb_last_save_time: Math.floor(Date.now() / 1000),
      rdb_last_bgsave_status: 'ok',
    },
    stats: {
      total_connections_received: 10,
      total_commands_processed: 1000,
      instantaneous_ops_per_sec: 5,
      total_net_input_bytes: 1024000,
      total_net_output_bytes: 2048000,
      instantaneous_input_kbps: 0.5,
      instantaneous_output_kbps: 1.0,
      rejected_connections: 0,
      sync_full: 0,
      sync_partial_ok: 0,
      sync_partial_err: 0,
      expired_keys: 5,
      evicted_keys: 0,
      keyspace_hits: 500,
      keyspace_misses: 50,
      pubsub_channels: 0,
      pubsub_patterns: 0,
    },
    replication: {
      role: 'master',
      connected_slaves: 0,
    },
    cpu: {
      used_cpu_sys: 10.5,
      used_cpu_user: 5.2,
      used_cpu_sys_children: 0.1,
      used_cpu_user_children: 0.05,
    },
    keyspace: {
      db0: 'keys=100,expires=10,avg_ttl=3600000',
    },
  },
  timestamp: new Date(),
}
