import { config as loadConfig } from 'dotenv';
import express from'express';
import {createBullDashApp} from 'bulldash';
import {configFactory} from './env';
import { resolve } from 'node:path';
import {setupQueue, QueueInput} from './bullmq';
import {JobsOptions} from 'bullmq';

loadConfig({ path: resolve(__dirname, '../../../.env') })

const app = express();

app.use(express.json());

const config = configFactory();

// Create BullDash monitoring
const { router, bullDash } = createBullDashApp(config);
const { DefaultQueue, DefaultQueueWorker, disconnect } = setupQueue(config);

app.set('query parser', 'extended');

// Mount BullDash dashboard
app.use('/admin/queues', router);

// Basic route
app.get('/', (req, res) => {
  res.send(`
    <h1>BullDash Test Application</h1>
    <p>This is a test application using your BullDash packages!</p>
    <ul>
      <li><a href="/admin/queues">View Queue Dashboard</a></li>
    </ul>
  `);
});

app.post('/add-job', async (req, res) => {
  const opts: Partial<JobsOptions> = {}

  const { failable, delayed, awaited, name = 'default' }: QueueInput = req.body ?? {};

  if (delayed) {
    opts.delay = delayed;
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
  console.log(`🚀 BullDash test server running on http://localhost:${config.port}`);
  console.log(`📊 Dashboard available at http://localhost:${config.port}/admin/queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await bullDash.cleanup();
  await disconnect();
  process.exit(0);
});
