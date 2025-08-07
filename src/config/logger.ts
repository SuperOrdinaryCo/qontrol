import winston from 'winston';
import { config } from './env';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'bulldash' },
  transports: [
    new winston.transports.File({
      filename: `${config.logging.filePath}/error.log`,
      level: 'error'
    }),
    new winston.transports.File({
      filename: `${config.logging.filePath}/combined.log`
    }),
  ],
});

if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request ID middleware for tracing
export const createRequestLogger = () => {
  return winston.createLogger({
    ...logger.options,
    defaultMeta: {
      service: 'bulldash',
      requestId: Math.random().toString(36).substring(7)
    }
  });
};
