import {ILogger} from '@qontrol/core';
import pino from 'pino';

export class PinoLogger implements ILogger {
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