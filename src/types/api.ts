// Core API Types
export interface QueueInfo {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
    'waiting-children': number;
  };
  isPaused: boolean;
}

export interface JobState {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  'waiting-children': number;
}

export interface JobSummary {
  id: string;
  name: string;
  state: keyof JobState;
  createdAt: Date;
  processedOn?: Date;
  finishedOn?: Date;
  duration?: number; // in milliseconds
  attempts: number;
  priority?: number;
  delay?: number;
}

export interface JobDetail extends JobSummary {
  data: any;
  result?: any;
  failedReason?: string;
  stacktrace?: string[];
  opts: {
    attempts?: number;
    backoff?: any;
    delay?: number;
    repeat?: any;
    priority?: number;
  };
  parent?: {
    id: string;
    queue: string;
  };
  children?: Array<{
    id: string;
    queue: string;
  }>;
}

// API Request/Response Types
export interface GetQueuesResponse {
  queues: QueueInfo[];
  timestamp: Date;
}

export interface GetJobsRequest {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'processedOn' | 'finishedOn' | 'duration' | 'state' | 'name';
  sortOrder?: 'asc' | 'desc';
  states?: Array<keyof JobState>;
  timeRange?: {
    field: 'createdAt' | 'processedOn' | 'finishedOn';
    start?: Date;
    end?: Date;
  };
  minDuration?: number; // milliseconds
  minAttempts?: number;
  search?: string; // substring search in name and data
}

export interface GetJobsResponse {
  jobs: JobSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: GetJobsRequest;
  timestamp: Date;
}

export interface GetJobDetailResponse {
  job: JobDetail;
  timestamp: Date;
}

// Health Check
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  redis: {
    connected: boolean;
    latency?: number;
  };
  timestamp: Date;
  version: string;
}

// Settings
export interface AppSettings {
  autoRefreshInterval: number; // seconds
  timezone: 'local' | 'utc';
}

// v2 Bulk Actions (placeholders)
export interface BulkActionRequest {
  jobIds: string[];
  action: 'retry' | 'remove' | 'promote' | 'pause' | 'resume';
}

export interface BulkActionResponse {
  success: number;
  failed: number;
  errors?: Array<{
    jobId: string;
    error: string;
  }>;
}

// Error Types
export interface ApiError {
  message: string;
  code: string;
  details?: any;
}
