# Qontrol

Modern BullMQ monitoring dashboard with a sleek Vue.js interface and powerful Express.js API.

**Qontrol** is a comprehensive monitoring solution for BullMQ queues, providing real-time insights, job management, and queue operations through an intuitive web interface.

## 📦 Packages

This monorepo contains the following packages:

- **`@qontrol/core`** - Core BullMQ monitoring functionality and queue management
- **`@qontrol/express`** - Express.js middleware and router (supports Express v4 & v5)
- **`@qontrol/ui`** - Pre-built Vue.js dashboard UI components

## ✨ Features

- ✅ Real-time monitoring with auto-refresh: live queue status, job counts, and processing metrics
- ✅ Comprehensive job details and execution logs
- ✅ Job lifecycle management: view, retry, remove, promote, discard (including failed jobs)
- ✅ Queue operations: pause, resume, clean, and manage multiple queues with a centralized dashboard
- ✅ Advanced search and filtering by job state, name, data, or ID; bulk actions on multiple jobs
- ✅ Queue and Redis statistics, metrics, and health monitoring; connection pooling and error handling
- ✅ Responsive UI built with Vue 3 and Tailwind CSS, optimized for desktop and mobile
- ✅ Full TypeScript support with comprehensive type definitions
- ✅ Express integration with v4 and v5 compatibility

## 🚀 Quick Start

### Option 1: Express Integration

For a complete web dashboard with Express.js:

```bash
npm install @qontrol/core @qontrol/express express bullmq
```

```javascript
const express = require('express');
const { Qontrol } = require('@qontrol/core');
const { createQontrolRouter } = require('@qontrol/express');

const app = express();

const qontrol = new Qontrol({
    config: {
        redis: {
            host: 'localhost',
            port: 6379,
            // All ioredis options supported
        },
        queuePrefix: 'bull' // Optional: BullMQ queue prefix
    },
    autoDiscovery: true // Optional: Automatically discover BullMQ queues. False by default. Use qontrol.addQueue() to manually add queues.
});

// Create the dashboard router
const dashboardRouter = createQontrolRouter(qontrol);

// Mount the dashboard at /admin/queues
app.use('/admin/queues', dashboardRouter);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Dashboard available at http://localhost:3000/admin/queues');
});
```

Visit `http://localhost:3000/admin/queues` to access your dashboard.

### Option 2: Core Package Only

If you just need the core monitoring functionality:

```bash
npm install @qontrol/core bullmq
```

```javascript
const { Qontrol } = require('@qontrol/core');

const qontrol = new Qontrol({
  config: {
      redis: {
          host: 'localhost',
          port: 6379,
      }
  }
});

// Start monitoring
console.log('Qontrol monitoring started!');
```

## 🔧 Advanced Usage

#### Express Middleware

```bash
npm install @qontrol/core @qontrol/express express bullmq
```

```javascript
const express = require('express');
const { Qontrol } = require('@qontrol/core');
const { createQontrolRouter } = require('@qontrol/express');

const app = express();

// Create core monitoring instance
const qontrol = new Qontrol({
  config: {
      redis: { host: 'localhost', port: 6379 }
  }
});

// Create Express router with custom options
const router = createQontrolRouter(qontrol);
const authMiddleware = (req, res, next) => {
    // Your auth logic here
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token === 'your-secret-token') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.use('/dashboard', authMiddleware, router);
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on:

- Setting up the development environment
- Running tests and linting
- Submitting pull requests
- Reporting issues

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.
