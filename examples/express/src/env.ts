export const configFactory = () => ({
  // Server Configuration
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Frontend Configuration
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  },

  // Queue Configuration
  queuePrefix: process.env.QUEUE_PREFIX || 'so-node',

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  },

  // Security Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
  },
});
