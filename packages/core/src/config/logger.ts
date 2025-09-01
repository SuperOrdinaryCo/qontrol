import winston from 'winston';
import { configManager } from './env';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const loggerFactory = () => {
  const logger = winston.createLogger({
    level: configManager.config.logging.level,
    format: logFormat,
    defaultMeta: { service: 'qontrol' },
    transports: [
      new winston.transports.File({
        filename: `${configManager.config.logging.filePath}/error.log`,
        level: 'error'
      }),
      new winston.transports.File({
        filename: `${configManager.config.logging.filePath}/combined.log`
      }),
    ],
  })

  if (configManager.config.nodeEnv !== 'production') {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
      )
    }));
  }

  return logger;
};

export class Logger {
  private static instance: winston.Logger;

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = loggerFactory();
    }
    return Logger.instance;
  }
}
