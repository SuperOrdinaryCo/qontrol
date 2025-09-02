import {
  Qontrol,
  ILogger,
} from '../packages/core/src';
import winston from 'winston';
import * as pino from 'pino';

// Example 1: Custom console logger implementation
class CustomConsoleLogger implements ILogger {
  debug(message: string, meta?: any): void {
    console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, meta || '');
  }

  info(message: string, meta?: any): void {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, meta || '');
  }

  error(message: string | Error, meta?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, meta || '');
  }
}

// Example 2: Custom logger that sends logs to external service
class ExternalServiceLogger implements ILogger {
  private apiEndpoint: string;

  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint;
  }

  private async sendLog(level: string, message: string, meta?: any) {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          meta,
          timestamp: new Date().toISOString(),
          service: 'qontrol'
        })
      });
    } catch (error) {
      // Fallback to console if external service fails
      console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
    }
  }

  debug(message: string, meta?: any): void {
    this.sendLog('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.sendLog('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.sendLog('warn', message, meta);
  }

  error(message: string | Error, meta?: any): void {
    this.sendLog('error', message.toString(), meta);
  }
}

// Example 3: Winston logger wrapper
class WinstonLogger implements ILogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({ filename: 'qontrol-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'qontrol-combined.log' })
      ]
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string | Error, meta?: any): void {
    this.logger.error(message.toString(), meta);
  }
}

// Example 4: Pino logger wrapper
class PinoLogger implements ILogger {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(meta, message);
  }

  info(message: string, meta?: any): void {
    this.logger.info(meta, message);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(meta, message);
  }

  error(message: string | Error, meta?: any): void {
    this.logger.error(meta, message.toString());
  }
}

// Usage examples
const config = {
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0
  }
};

// Example 1: Using default Winston logger (backward compatible)
const qontrolDefault = new Qontrol({
  config,
});

// Example 2: Using custom console logger
const customLogger = new CustomConsoleLogger();
const qontrolCustom = new Qontrol({
  config,
  logger: customLogger,
});

// Example 3: Using external service logger
const externalLogger = new ExternalServiceLogger('https://my-logging-service.com/api/logs');
const qontrolExternal = new Qontrol({
  config,
  logger: externalLogger,
});

// Example 4: Using Winston logger
const winstonLogger = new WinstonLogger();
const qontrolWinston = new Qontrol({
  config,
  logger: winstonLogger,
});

// Example 5: Using Pino logger
const pinoLogger = new PinoLogger();
const qontrolPino = new Qontrol({
  config,
  logger: pinoLogger,
});

console.log('All logger examples initialized successfully!');
console.log('- Custom console logger');
console.log('- External service logger');
console.log('- Winston logger wrapper');
console.log('- Pino logger wrapper');
