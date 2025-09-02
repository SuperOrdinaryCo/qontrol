// Abstract logger interface that any logger implementation can follow
export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string | Error, meta?: any): void;
}

// No-op logger for when logging is disabled or no logger is provided
export class NoOpLogger implements ILogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

// Logger registry that manages the logger instance
export class Logger {
  private static instance: ILogger | null = null;

  static setLogger(logger: ILogger): void {
    Logger.instance = logger;
  }

  static getInstance(): ILogger {
    if (!Logger.instance) {
      // Default to no-op logger if none is set
      Logger.instance = new NoOpLogger();
    }
    return Logger.instance;
  }

  static clearLogger(): void {
    Logger.instance = null;
  }

  // Convenience method to disable logging
  static disableLogging(): void {
    Logger.instance = new NoOpLogger();
  }

  // Check if a logger has been set
  static hasLogger(): boolean {
    return Logger.instance !== null && !(Logger.instance instanceof NoOpLogger);
  }
}

// Factory function for creating a no-op logger
export const createNoOpLogger = (): ILogger => new NoOpLogger();
