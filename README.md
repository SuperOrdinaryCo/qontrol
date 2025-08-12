# BullDash - BullMQ Monitoring Dashboard

A comprehensive monitoring solution for BullMQ queues with a beautiful web interface.

## 📦 Packages

BullDash is split into modular packages that you can use independently or together:

- **`bulldash`** - Main package with everything included (convenience wrapper)
- **`@bulldash/core`** - Core BullMQ monitoring functionality and queue management
- **`@bulldash/express`** - Express.js middleware and router (supports Express v4 & v5)
- **`@bulldash/ui`** - Pre-built Vue.js dashboard UI components
- **`@bulldash/cli`** - Command-line interface tool for quick project setup

## 🚀 Quick Start

### Option 1: All-in-One Package (Recommended)

```bash
npm install bulldash
```

```javascript
const express = require('express');
const { createBullDashApp } = require('bulldash');

const app = express();

// Create BullDash instance with Redis configuration
const { router, bullDash } = createBullDashApp({
  redis: {
    host: 'localhost',
    port: 6379,
    // All ioredis options supported
  },
  queuePrefix: 'bull' // Optional: BullMQ queue prefix
});

// Add your existing queues for monitoring
bullDash.addQueue('email-queue');
bullDash.addQueue('image-processing');
bullDash.addQueue('data-export');

// Mount the dashboard at your preferred path
app.use('/admin/queues', router);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Dashboard available at http://localhost:3000/admin/queues');
});
```

### Option 2: Standalone Server

```javascript
const { createBullDashApp } = require('bulldash');

const { createServer, bullDash } = createBullDashApp({
  redis: { host: 'localhost', port: 6379 },
  queuePrefix: 'my-app'
});

// Add your queues
bullDash.addQueue('notifications');
bullDash.addQueue('background-tasks');

// Start standalone server on port 3001
createServer(3001);
```

## 🔧 Advanced Usage

### Using Individual Packages

#### Core Package Only

```bash
npm install @bulldash/core
```

```javascript
const { BullDash } = require('@bulldash/core');

const monitor = new BullDash({
  redis: {
    host: 'localhost',
    port: 6379,
    password: 'your-redis-password',
    db: 0
  },
  queuePrefix: 'bull'
});

// Add queues to monitor
monitor.addQueue('my-queue');
monitor.addQueue('another-queue');

// Get queue statistics
const queues = await monitor.getQueues();
const jobs = await monitor.getJobs('my-queue', { 
  status: 'failed', 
  page: 1, 
  pageSize: 50 
});

// Get specific job details
const jobDetail = await monitor.getJobDetail('my-queue', 'job-id-123');

// Perform job actions
await monitor.retryJob('my-queue', 'failed-job-id');
await monitor.removeJob('my-queue', 'completed-job-id');
```

#### Express Middleware

```bash
npm install @bulldash/core @bulldash/express express
```

```javascript
const express = require('express');
const { BullDash } = require('@bulldash/core');
const { createBullDashRouter } = require('@bulldash/express');

const app = express();

// Create core monitoring instance
const bullDash = new BullDash({
  redis: { host: 'localhost', port: 6379 }
});

bullDash.addQueue('email-queue');

// Create Express router with custom options
const router = createBullDashRouter(bullDash, {
  authentication: (req, res, next) => {
    // Your auth logic here
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token === 'your-secret-token') {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per window
  },
  cors: {
    origin: ['http://localhost:3000', 'https://your-domain.com'],
    credentials: true
  }
});

app.use('/dashboard', router);
```

### Configuration Options

#### Redis Connection

```javascript
const { createBullDashApp } = require('bulldash');

const { bullDash } = createBullDashApp({
  redis: {
    host: 'redis.example.com',
    port: 6379,
    password: 'your-password',
    db: 0,
    family: 4, // 4 (IPv4) or 6 (IPv6)
    keepAlive: true,
    // All ioredis connection options supported
  },
  queuePrefix: 'my-app'
});
```

#### Express Router Options

```javascript
const { createBullDashRouter } = require('@bulldash/express');

const router = createBullDashRouter(bullDash, {
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  authentication: (req, res, next) => {
    // Custom authentication middleware
    // Return 401 for unauthorized requests
    next();
  }
});
```

## 🎨 UI Components (Vue.js)

The UI package provides pre-built Vue.js components for custom integrations:

```bash
npm install @bulldash/ui
```

```vue
<template>
  <div>
    <BullDashboard :api-url="apiUrl" />
  </div>
</template>

<script>
import { BullDashboard } from '@bulldash/ui';

export default {
  components: {
    BullDashboard
  },
  data() {
    return {
      apiUrl: 'http://localhost:3000/api'
    };
  }
};
</script>
```

## 🛠️ CLI Tool

Quick project scaffolding and development server:

```bash
npm install -g @bulldash/cli

# Create a new BullDash project
bulldash init my-monitoring-app
cd my-monitoring-app

# Install dependencies and start
npm install
npm start
```

## 📊 Features

- ✅ Real-time queue monitoring with auto-refresh
- ✅ Comprehensive job details and execution logs
- ✅ Queue statistics, metrics, and health monitoring
- ✅ Failed job management with retry functionality
- ✅ Job lifecycle management (retry, remove, promote, discard)
- ✅ Multiple queue support with centralized dashboard
- ✅ Built-in authentication and authorization support
- ✅ Rate limiting and security headers
- ✅ Responsive web interface optimized for desktop and mobile
- ✅ Full TypeScript support with comprehensive type definitions
- ✅ Express v4 and v5 compatibility
- ✅ Redis connection pooling and error handling

## 🔒 Security

BullDash includes comprehensive security features out of the box:

- **Rate Limiting**: Configurable request rate limiting per IP
- **CORS Configuration**: Flexible cross-origin resource sharing setup
- **Security Headers**: Helmet.js integration with CSP and security headers
- **Authentication Middleware**: Custom authentication hook support
- **Input Validation**: Joi-based request validation and sanitization
- **Error Handling**: Secure error responses without sensitive data leakage

## 📝 API Reference

### BullDash Core Class

```typescript
class BullDash {
  constructor(config: Config)
  
  // Queue Management
  addQueue(queueName: string, queueOptions?: QueueOptions): Queue
  getQueues(): Promise<QueueInfo[]>
  getHealth(): Promise<HealthStatus>
  
  // Job Operations
  getJobs(queueName: string, options?: GetJobsOptions): Promise<{ jobs: JobInfo[], total: number }>
  getJobDetail(queueName: string, jobId: string): Promise<JobDetailInfo | null>
  getJobById(queueName: string, jobId: string): Promise<{ jobs: JobInfo[], total: number }>
  
  // Job Actions
  retryJob(queueName: string, jobId: string): Promise<boolean>
  removeJob(queueName: string, jobId: string): Promise<boolean>
  discardJob(queueName: string, jobId: string): Promise<boolean>
  promoteJob(queueName: string, jobId: string): Promise<boolean>
  bulkRemoveJobs(queueName: string, jobIds: string[]): Promise<BulkActionResult>
  
  // Cleanup
  cleanup(): Promise<void>
}
```

### Express Router Options

```typescript
interface BullDashExpressOptions {
  cors?: boolean | CorsOptions;
  rateLimit?: boolean | RateLimitOptions;
  authentication?: (req: Request, res: Response, next: NextFunction) => void;
}
```

### Configuration Types

```typescript
interface Config {
  redis: RedisOptions;
  queuePrefix?: string;
}

interface GetJobsOptions {
  status?: JobStatus;
  page?: number;
  pageSize?: number;
  search?: string;
}
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on:

- Setting up the development environment
- Running tests and linting
- Submitting pull requests
- Reporting issues

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.
