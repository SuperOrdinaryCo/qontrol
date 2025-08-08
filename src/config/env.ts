/**
 * Configuration module that loads and validates environment variables
 */
export interface Config {
  // Server Configuration
  port: number;
  nodeEnv: string;

  // Frontend Configuration
  frontendUrl: string;

  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    username?: string;
    db: number;
  };

  // Queue Configuration
  queuePrefix: string;

  // Logging Configuration
  logging: {
    level: string;
    filePath: string;
  };

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };

  // Security Configuration
  cors: {
    origin: string;
  };
}

function validateConfig(): Config {
  const config: Config = {
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
  };

  // Validate required configuration
  if (isNaN(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid PORT: must be a number between 1 and 65535');
  }

  if (isNaN(config.redis.port) || config.redis.port < 1 || config.redis.port > 65535) {
    throw new Error('Invalid REDIS_PORT: must be a number between 1 and 65535');
  }

  if (isNaN(config.redis.db) || config.redis.db < 0) {
    throw new Error('Invalid REDIS_DB: must be a non-negative number');
  }

  if (isNaN(config.rateLimit.windowMs) || config.rateLimit.windowMs < 1000) {
    throw new Error('Invalid RATE_LIMIT_WINDOW_MS: must be at least 1000ms');
  }

  if (isNaN(config.rateLimit.maxRequests) || config.rateLimit.maxRequests < 1) {
    throw new Error('Invalid RATE_LIMIT_MAX_REQUESTS: must be at least 1');
  }

  return config;
}

export const config = validateConfig();

