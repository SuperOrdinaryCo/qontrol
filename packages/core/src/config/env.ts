/**
 * Configuration module that loads and validates environment variables
 */
export interface Config {
  // Redis Configuration
  redis: {
    host: string;
    port: number;
    password?: string;
    username?: string;
    db: number;
  };

  // Queue Configuration
  queuePrefix?: string;
}

export class ConfigManager {
  // @ts-ignore
  protected _config: Config;

  set config(newConfig: Config) {
    this._config = this.validate(newConfig);
  }

  get config(): Config {
    return this._config;
  }

  protected validate(config: Config) {
    if (isNaN(config.redis.port) || config.redis.port < 1 || config.redis.port > 65535) {
      throw new Error('Invalid REDIS_PORT: must be a number between 1 and 65535');
    }

    if (isNaN(config.redis.db) || config.redis.db < 0) {
      throw new Error('Invalid REDIS_DB: must be a non-negative number');
    }

    return config;
  }
}

export const configManager = new ConfigManager();
