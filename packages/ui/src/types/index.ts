// Re-export backend types for frontend use
export interface QueueInfo {
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
    prioritized: number;
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
  prioritized: number;
  'waiting-children': number;
}

export interface JobSummary {
  id: string;
  name: string;
  state: keyof JobState;
  createdAt: Date;
  processedOn?: Date;
  finishedOn?: Date;
  duration?: number;
  attempts: number;
  priority?: number;
  delay?: number;
  data?: any;
}

export interface JobDetail extends JobSummary {
  data: any;
  result?: any;
  failedReason?: string;
  stacktrace?: string[];
  logs?: {
    entries: string[];
    count: number;
  };
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

export interface GetJobsRequest {
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'processedOn' | 'finishedOn' | 'duration' | 'state' | 'name';
  sortOrder?: 'asc' | 'desc';
  states?: Array<keyof JobState>;
  all?: boolean;
  timeRange?: {
    field: 'createdAt' | 'processedOn' | 'finishedOn';
    start?: Date;
    end?: Date;
  };
  minDuration?: number;
  minAttempts?: number;
  search?: string;
  searchType?: string;
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

export interface GetQueuesResponse {
  queues: QueueInfo[];
  timestamp: Date;
}

export interface GetJobDetailResponse {
  job: JobDetail;
  timestamp: Date;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  redis: {
    connected: boolean;
    latency?: number;
  };
  timestamp: Date;
  version: string;
}

export interface AppSettings {
  autoRefreshInterval: number;
  timezone: 'local' | 'utc';
  theme: 'light' | 'dark' | 'system';
  autoRefreshEnabled: boolean;
  tooltipDelay: number;
  showDangerActions: boolean;
}

// UI-specific types
export interface JobSelection {
  selectedIds: Set<string>;
  isAllSelected: boolean;
}

export interface LoadingState {
  queues: boolean;
  jobs: boolean;
  jobDetail: boolean;
}
