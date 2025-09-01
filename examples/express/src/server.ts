import { config as loadConfig } from 'dotenv';
import express from'express';
import {createBullDashApp} from 'bulldash';
import {configFactory} from './env';
import { resolve } from 'node:path';

loadConfig({ path: resolve(__dirname, '../../../.env') })

const app = express();

app.use(express.json());

const config = configFactory();

// Create BullDash monitoring
const { router, bullDash } = createBullDashApp(config);

app.set('query parser', 'extended');

// Mount BullDash dashboard
app.use('/admin/queues', router);

app.listen(config.port, async () => {
  console.log(`Redis located at ${config.redis.host}:${config.redis.port}. DB: ${config.redis.db}`)
  console.log(`🚀 BullDash test server running on http://localhost:${config.port}`);
  console.log(`📊 Dashboard available at http://localhost:${config.port}/admin/queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await bullDash.cleanup();
  process.exit(0);
});
