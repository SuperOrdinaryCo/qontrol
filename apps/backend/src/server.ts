import dotenv from 'dotenv';
import {Qontrol} from '@qontrol/core';
import {createQontrolRouter} from '@qontrol/express';
import express from'express';
import {configFactory} from './env';
import {setupQueue, QueueInput} from './bullmq';
import {JobsOptions} from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { createQueueDashExpressMiddleware } from "@queuedash/api";
import {BullMonitorExpress} from '@bull-monitor/express';
import { BullMQAdapter as BMQ } from "@bull-monitor/root/dist/bullmq-adapter";
import { resolve } from 'node:path'
import { PinoLogger } from './pino.logger';

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const app = express();

app.use(express.json());

const config = configFactory();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues2');

// Create Qontrol monitoring
const qontrol = new Qontrol({
  config,
  logger: new PinoLogger()
});
const router = createQontrolRouter(qontrol);
const { DefaultQueue, DefaultQueueWorker, disconnect } = setupQueue(config);

createBullBoard({
  queues: [new BullMQAdapter(DefaultQueue)],
  serverAdapter: serverAdapter,
});

app.set('query parser', 'extended');

const monitor = new BullMonitorExpress({
  queues: [
    new BMQ(DefaultQueue),
  ],
  // enables graphql introspection query. false by default if NODE_ENV == production, true otherwise
  gqlIntrospection: true,
  // enable metrics collector. false by default
  // metrics are persisted into redis as a list
  // with keys in format "bull_monitor::metrics::{{queue}}"
  metrics: {
    // collect metrics every X
    // where X is any value supported by https://github.com/kibertoad/toad-scheduler
    collectInterval: { hours: 1 },
    maxMetrics: 100,
    // disable metrics for specific queues
    blacklist: ['1'],
  },
});
monitor.init().then(() => {
  app.use('/admin/queues4', monitor.router);
});

// Mount Qontrol dashboard
app.use('/admin/queues', router);
app.use('/admin/queues2', serverAdapter.getRouter());
app.use('/admin/queues3', createQueueDashExpressMiddleware({
  ctx: {
    queues: [
      {
        queue: DefaultQueue,
        displayName: 'default',
        type: "bullmq" as const,
      },
    ],
  },
}))

// Basic route
app.get('/', (req, res) => {
  res.send(`
    <h1>Qontrol Test Application</h1>
    <p>This is a test application using your Qontrol packages!</p>
    <ul>
      <li><a href="/admin/queues">View Queue Dashboard</a></li>
    </ul>
  `);
});

app.post('/add-job', async (req, res) => {
  const opts: Partial<JobsOptions> = {}

  const { failable, delayed, awaited, name = 'default', copies }: QueueInput = req.body ?? {};

  if (delayed) {
    opts.delay = delayed;
  }

  if (copies) {
    const jobs = await Promise.all(Array.from({ length: copies }).map(() => DefaultQueue.add(name, {
      failable,
      awaited,
    } as QueueInput, opts)))

    return res.send({
      jobId: jobs.map(job => job.id),
    })
  }

  const job = await DefaultQueue.add(name, {
    failable,
    awaited,
  } as QueueInput, opts)

  res.send({
    jobId: job.id
  })
})

app.listen(config.port, async () => {
  console.log(`Redis located at ${config.redis.host}:${config.redis.port}. DB: ${config.redis.db}`)
  console.log(`🚀 Qontrol test server running on http://localhost:${config.port}`);
  console.log(`📊 Dashboard available at http://localhost:${config.port}/admin/queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await qontrol.cleanup();
  await disconnect();
  process.exit(0);
});
