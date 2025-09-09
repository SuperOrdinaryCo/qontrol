import { http, HttpResponse } from 'msw'
import {
  mockQueues,
  generateMockJobs,
  generateMockJobDetail,
  mockRedisStats
} from './data'
import type {
  GetQueuesResponse,
  GetJobsResponse,
  GetJobDetailResponse,
  HealthCheckResponse,
  JobState
} from '../types/index'

// In-memory state for dynamic behavior
let queuesState = [...mockQueues]
const jobsCache = new Map<string, any[]>()

const baseUrl = import.meta.env.VITE_BASE_URL || ''
const basePath = `${baseUrl}/api`.replace('//', '/')

// Helper to get jobs for a queue
function getJobsForQueue(queueName: string, count: number = 50) {
  if (!jobsCache.has(queueName)) {
    jobsCache.set(queueName, generateMockJobs(queueName, count))
  }
  return jobsCache.get(queueName)!
}

export const handlers = [
  // Health check endpoint
  http.get(`${basePath}/health`, () => {
    const response: HealthCheckResponse = {
      status: 'healthy',
      redis: {
        connected: true,
        latency: Math.floor(Math.random() * 10) + 1, // 1-10ms
      },
      timestamp: new Date(),
      version: '1.0.0',
    }
    return HttpResponse.json(response)
  }),

  // Alternative health check endpoint (common in Kubernetes environments)
  http.get(`${basePath}/healthz`, () => {
    const response: HealthCheckResponse = {
      status: 'healthy',
      redis: {
        connected: true,
        latency: Math.floor(Math.random() * 10) + 1, // 1-10ms
      },
      timestamp: new Date(),
      version: '1.0.0',
    }
    return HttpResponse.json(response)
  }),

  // Get all queues
  http.get(`${basePath}/queues`, () => {
    const response: GetQueuesResponse = {
      queues: queuesState,
      timestamp: new Date(),
    }
    return HttpResponse.json(response)
  }),

  // Get specific queue
  http.get(`${basePath}/queues/:queue`, ({ params }) => {
    const queueName = params.queue as string
    const queue = queuesState.find(q => q.name === queueName)

    if (!queue) {
      return HttpResponse.json(
        { message: 'Queue not found', code: 'QUEUE_NOT_FOUND' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      queue,
      timestamp: new Date(),
    })
  }),

  // Pause queue
  http.post(`${basePath}/queues/:queue/pause`, ({ params }) => {
    const queueName = params.queue as string
    const queueIndex = queuesState.findIndex(q => q.name === queueName)

    if (queueIndex === -1) {
      return HttpResponse.json(
        { message: 'Queue not found', code: 'QUEUE_NOT_FOUND' },
        { status: 404 }
      )
    }

    queuesState[queueIndex].isPaused = true

    return HttpResponse.json({
      message: 'Queue paused successfully',
      queueName,
      timestamp: new Date(),
    })
  }),

  // Resume queue
  http.post(`${basePath}/queues/:queue/resume`, ({ params }) => {
    const queueName = params.queue as string
    const queueIndex = queuesState.findIndex(q => q.name === queueName)

    if (queueIndex === -1) {
      return HttpResponse.json(
        { message: 'Queue not found', code: 'QUEUE_NOT_FOUND' },
        { status: 404 }
      )
    }

    queuesState[queueIndex].isPaused = false

    return HttpResponse.json({
      message: 'Queue resumed successfully',
      queueName,
      timestamp: new Date(),
    })
  }),

  // Clean queue
  http.post(`${basePath}/queues/:queue/clean`, async ({ params, request }) => {
    const queueName = params.queue as string
    const body = await request.json() as {
      limit?: number;
      type?: JobState
    }

    const queue = queuesState.find(q => q.name === queueName)
    if (!queue) {
      return HttpResponse.json(
        { message: 'Queue not found', code: 'QUEUE_NOT_FOUND' },
        { status: 404 }
      )
    }

    const { limit = 0, type = 'completed' } = body

    // Simulate cleaning jobs by reducing the count
    const cleanedCount = Math.min(
      queue.counts[type as keyof typeof queue.counts] || 0,
      limit || Math.floor(Math.random() * 20) + 5
    )

    // Update the queue counts
    const queueIndex = queuesState.findIndex(q => q.name === queueName)
    if (queueIndex !== -1) {
      const currentCount = queuesState[queueIndex].counts[type as keyof typeof queue.counts] || 0
      const updatedCounts = { ...queuesState[queueIndex].counts }
      if (type in updatedCounts) {
        updatedCounts[type as keyof typeof updatedCounts] = Math.max(0, currentCount - cleanedCount)
        queuesState[queueIndex].counts = updatedCounts
      }
    }

    return HttpResponse.json({
      cleaned: cleanedCount,
      queueName,
      type,
      timestamp: new Date(),
    })
  }),

  // Remove/obliterate queue
  http.delete(`${basePath}/queues/:queue`, ({ params }) => {
    const queueName = params.queue as string
    const queueIndex = queuesState.findIndex(q => q.name === queueName)

    if (queueIndex === -1) {
      return HttpResponse.json(
        { message: 'Queue not found', code: 'QUEUE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Remove from state
    queuesState.splice(queueIndex, 1)
    jobsCache.delete(queueName)

    return HttpResponse.json({
      queueName,
      timestamp: new Date(),
    })
  }),

  // Get jobs for a queue
  http.get(`${basePath}/queues/:queue/jobs`, ({ params, request }) => {
    const queueName = params.queue as string
    const url = new URL(request.url)

    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    const sortOrder = url.searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc'
    const statesParam = url.searchParams.get('states[]')
    const states = statesParam ? statesParam.split(',') as JobState[] : undefined
    const search = url.searchParams.get('search') || undefined
    const all = url.searchParams.get('all') === 'true'

    const queue = queuesState.find(q => q.name === queueName)
    if (!queue) {
      return HttpResponse.json(
        { message: 'Queue not found', code: 'QUEUE_NOT_FOUND' },
        { status: 404 }
      )
    }

    let jobs = getJobsForQueue(queueName, 100)

    // Apply filters
    if (states && states.length > 0) {
      jobs = jobs.filter(job => states.includes(job.state))
    }

    if (search) {
      jobs = jobs.filter(job =>
        job.name.toLowerCase().includes(search.toLowerCase()) ||
        job.id.toLowerCase().includes(search.toLowerCase())
      )
    }

    // Sort
    jobs.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

    // Pagination
    const total = jobs.length
    const totalPages = Math.ceil(total / pageSize)

    if (!all) {
      const start = (page - 1) * pageSize
      const end = start + pageSize
      jobs = jobs.slice(start, end)
    }

    const response: GetJobsResponse = {
      jobs,
      pagination: {
        page: all ? 1 : page,
        pageSize: all ? total : pageSize,
        total,
        totalPages: all ? 1 : totalPages,
      },
      filters: {
        page: all ? undefined : page,
        pageSize: all ? undefined : pageSize,
        sortOrder,
        states,
        search,
        all,
      },
      timestamp: new Date(),
    }

    return HttpResponse.json(response)
  }),

  // Get job by ID
  http.get(`${basePath}/queues/:queue/job-by-id/:id`, ({ params }) => {
    const queueName = params.queue as string
    const jobId = params.id as string

    const jobs = getJobsForQueue(queueName, 100)
    const job = jobs.find(j => j.id === jobId)

    if (!job) {
      return HttpResponse.json(
        { message: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      )
    }

    const response: GetJobsResponse = {
      jobs: [job],
      pagination: {
        page: 1,
        pageSize: 1,
        total: 1,
        totalPages: 1,
      },
      filters: {},
      timestamp: new Date(),
    }

    return HttpResponse.json(response)
  }),

  // Get job detail
  http.get(`${basePath}/queues/:queue/jobs/:id`, ({ params }) => {
    const queueName = params.queue as string
    const jobId = params.id as string

    const jobs = getJobsForQueue(queueName, 100)
    const jobSummary = jobs.find(j => j.id === jobId)

    if (!jobSummary) {
      return HttpResponse.json(
        { message: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 404 }
      )
    }

    const jobDetail = generateMockJobDetail(jobSummary)

    const response: GetJobDetailResponse = {
      job: jobDetail,
      timestamp: new Date(),
    }

    return HttpResponse.json(response)
  }),

  // Redis stats
  http.get(`${basePath}/redis/stats`, () => {
    return HttpResponse.json({
      info: mockRedisStats.info,
      timestamp: new Date(),
    })
  }),

  // Bulk actions (if needed)
  http.post(`${basePath}/queues/:queue/jobs/bulk/:action`, async ({ params, request }) => {
    const queueName = params.queue as string
    const action = params.action as string
    const body = await request.json() as { jobIds: string[] }

    const { jobIds } = body

    // Simulate bulk action
    return HttpResponse.json({
      affected: jobIds.length,
      action,
      queueName,
      timestamp: new Date(),
    })
  }),
]
