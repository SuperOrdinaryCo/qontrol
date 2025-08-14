import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {Config} from '@bulldash/core';

export type QueueInput = {
  name: string;
  failable?: boolean;
  delayed?: number;
  awaited?: number;
}

export const setupQueue = (config: Config) => {
  const connection = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    username: config.redis.username,
    db: config.redis.db,
    maxRetriesPerRequest: null
  });

  const queueName = 'default';

  const DefaultQueue = new Queue(queueName, {
    connection: connection,
    prefix: config.queuePrefix,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
      attempts: 3
    },
  });

  const DefaultQueueWorker = new Worker(
      queueName,
      async job => {
        // Will print { foo: 'bar'} for the first job
        // and { qux: 'baz' } for the second.
        console.log(job.data);

        const input: QueueInput = job.data;

        if (input.awaited) {
          await new Promise(resolve => setTimeout(resolve, input.awaited));
        }

        if (input.failable) {
          throw new Error('Job failed');
        }
      },
      { connection, prefix: config.queuePrefix },
  );

  DefaultQueueWorker.client.then(client => {
    console.log('worker connected to', client.options.host, client.options.port, client.options.db);
  })

  DefaultQueueWorker.on('closing', () => {
    console.log('Worker closing');
  });

  DefaultQueueWorker.on('paused', () => {
    console.log('Worker paused');
  });

  DefaultQueueWorker.on('resumed', () => {
    console.log('Worker resumed');
  });

  DefaultQueueWorker.on('failed', (job, error) => {
    console.log(`${job.id} has failed with ${error.message}`);
  });

  return {
    DefaultQueue,
    DefaultQueueWorker,
    queueName,
    disconnect: async () => {
      await DefaultQueue.close();
      await DefaultQueueWorker.close();
      await connection.quit();
    }
  }
}
