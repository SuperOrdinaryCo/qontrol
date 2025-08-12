import 'dotenv/config';
import express from'express';
import {createBullDashApp} from 'bulldash';
import {config} from './env';

const app = express();

// Create BullDash monitoring
const { router, bullDash } = createBullDashApp(config);

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

app.listen(config.port, () => {
  console.log(`🚀 BullDash test server running on http://localhost:${config.port}`);
  console.log(`📊 Dashboard available at http://localhost:${config.port}/admin/queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await bullDash.cleanup();
  process.exit(0);
});
