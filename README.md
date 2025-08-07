# BullMQ Dashboard

A read-only BullMQ monitoring dashboard built with Express.js + TypeScript + Vue.js + TailwindCSS.

## Features

### v1 (Current)
- **Queue Monitoring**: List all queues with job counts by state
- **Job Management**: View jobs with server-side pagination, filtering, and search
- **Real-time Updates**: Auto-refresh with configurable intervals (default 10s)
- **Detailed Job View**: Complete job metadata, data, results, and error information
- **Responsive UI**: Modern blue/white theme with state-based colors
- **Settings**: Configurable auto-refresh and timezone display
- **Health Check**: Redis connectivity monitoring

### v2 (Planned)
- Bulk job actions (retry, remove, promote, pause/resume)
- Queue management operations
- Advanced filtering and search capabilities

## Quick Start

### Prerequisites
- Node.js 18+
- Redis server running on localhost:6379 (or configure via environment variables)

### Installation & Running

```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Development mode (runs both backend and frontend)
npm run dev

# Production build
npm run build
npm start
```

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Frontend Configuration
FRONTEND_URL=http://localhost:5173

# v2 Feature Flags
ENABLE_BULK_ACTIONS=false
```

## API Endpoints

- `GET /api/queues` - List all queues with job counts
- `GET /api/queues/:queue/jobs` - Get jobs with pagination/filtering
- `GET /api/queues/:queue/jobs/:id` - Get detailed job information
- `GET /api/healthz` - Health check endpoint
- `POST /api/queues/:queue/jobs/bulk` - Bulk actions (v2 placeholder)

## Architecture

### Backend Structure
```
src/
├── server.ts              # Express app setup
├── config/
│   ├── redis.ts           # Redis connection management
│   └── logger.ts          # Winston logging configuration
├── middleware/
│   └── validation.ts      # Request validation & error handling
├── routes/
│   └── api.ts             # API route handlers
├── services/
│   ├── queueRegistry.ts   # Queue discovery & management
│   └── jobService.ts      # Job querying & filtering
└── types/
    └── api.ts             # TypeScript interfaces
```

### Frontend Structure
```
src/
├── main.ts                # Vue app entry point
├── App.vue                # Main application component
├── api/
│   └── client.ts          # API client with axios
├── stores/
│   ├── queues.ts          # Pinia store for queue data
│   ├── jobs.ts            # Pinia store for job data
│   └── settings.ts        # Pinia store for app settings
├── components/
│   ├── Dashboard.vue      # Main dashboard view
│   ├── QueueDetail.vue    # Queue-specific job listing
│   ├── JobDetailDrawer.vue # Job detail sidebar
│   ├── QueueCard.vue      # Queue summary card
│   ├── StatCard.vue       # Statistics display card
│   ├── AutoRefreshControl.vue # Auto-refresh toggle
│   ├── HealthIndicator.vue # Redis connection status
│   └── Settings.vue       # Application settings
└── utils/
    └── date.ts            # Date formatting utilities
```

## Key Features Implementation

### Efficient Job Querying
- Server-side pagination with configurable page sizes
- Multi-state filtering without full table scans
- Substring search across job names and serialized data
- Smart duration calculation from BullMQ timestamps
- Safe job data serialization with size limits

### Real-time Monitoring
- Auto-refresh with configurable intervals
- Health check monitoring with Redis latency
- Graceful error handling and loading states
- Visibility-based refresh (pauses when tab is hidden)

### User Experience
- Sticky filters and search across page navigation
- Job selection with bulk action preparation for v2
- Timezone toggle (Local/UTC) with persistent settings
- Loading skeletons and empty states
- Responsive design with TailwindCSS

### Performance & Scalability
- Structured logging with request IDs and latency tracking
- Rate limiting and security headers
- Compression and caching headers
- Graceful shutdown handling
- Memory-efficient job data handling

## Development

### Running Tests
```bash
npm test
npm run test:watch
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## Deployment

### Docker (Recommended)
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder
# ... build process

FROM node:18-alpine AS runtime
# ... runtime setup
```

### Environment Setup
- Configure Redis connection
- Set up logging directory permissions
- Configure reverse proxy (nginx/traefik)
- Set up monitoring and alerting

## v2 Migration Path

The codebase is designed for easy v2 expansion:

1. **Bulk Actions**: API endpoints are stubbed, UI selection model is ready
2. **Queue Management**: Queue registry supports operational commands
3. **Advanced Features**: Extensible filter system and job processing pipeline
4. **Feature Flags**: Environment-based feature toggles for gradual rollout
