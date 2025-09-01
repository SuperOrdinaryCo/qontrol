import { config as loadConfig } from 'dotenv';
import express from'express';
import { Qontrol } from '@qontrol/core';
import { createQontrolRouter } from '@qontrol/express';
import { configFactory } from './env';
import { resolve } from 'node:path';

loadConfig({ path: resolve(__dirname, '../../../.env') })

const app = express();

app.use(express.json());

const config = configFactory();

// Create Qontrol monitoring
const qontrol = new Qontrol(config);
const router = createQontrolRouter(qontrol);

// Express v5
app.set('query parser', 'extended');

// Mount Qontrol dashboard
app.use('/admin/queues', router);

app.listen(config.port, async () => {
  console.log(`Redis located at ${config.redis.host}:${config.redis.port}. DB: ${config.redis.db}`)
  console.log(`🚀 Qontrol test server running on http://localhost:${config.port}`);
  console.log(`📊 Dashboard available at http://localhost:${config.port}/admin/queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await qontrol.cleanup();
  process.exit(0);
});
