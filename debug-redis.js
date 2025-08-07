import 'dotenv/config';
import Redis from 'ioredis';

async function debugRedisKeys() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  try {
    console.log('🔍 Redis Connection Debug');
    console.log('========================');
    console.log('Config from .env:');
    console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || 'localhost'}`);
    console.log(`  REDIS_PORT: ${process.env.REDIS_PORT || '6379'}`);
    console.log(`  REDIS_DB: ${process.env.REDIS_DB || '0'}`);
    console.log(`  QUEUE_PREFIX: ${process.env.QUEUE_PREFIX || 'bull'}`);
    console.log('');

    // Test connection
    const pong = await redis.ping();
    console.log('✅ Redis connection:', pong);

    // Check the configured prefix and common prefixes
    const configuredPrefix = process.env.QUEUE_PREFIX || 'bull';
    const prefixes = [configuredPrefix, 'bull:', 'so-node:', 'bullmq:', ''];

    for (const prefix of prefixes) {
      console.log(`\n🔍 Checking prefix: "${prefix}"`);

      // Look for meta keys
      const metaKeys = await redis.keys(`${prefix}*:meta`);
      console.log(`   Meta keys (${prefix}*:meta):`, metaKeys.length ? metaKeys : 'None found');

      // Look for any keys starting with this prefix
      const allKeys = await redis.keys(`${prefix}*`);
      console.log(`   All keys (${prefix}*):`, allKeys.length > 0 ? `${allKeys.length} keys found` : 'None found');

      // Show first few keys as examples
      if (allKeys.length > 0) {
        console.log(`   Sample keys:`, allKeys.slice(0, 5));
      }
    }

    // Look for BullMQ specific patterns
    console.log('\n🔍 Checking BullMQ patterns:');

    // Common BullMQ key patterns
    const patterns = [
      '*:meta',
      '*:waiting',
      '*:active',
      '*:completed',
      '*:failed',
      '*:delayed',
      '*:paused'
    ];

    for (const pattern of patterns) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        console.log(`   Pattern ${pattern}:`, keys.slice(0, 3));
      }
    }

    // Check for job counts if we find queues
    console.log('\n🔍 Checking job counts:');
    const allMetaKeys = await redis.keys('*:meta');

    for (const metaKey of allMetaKeys.slice(0, 3)) { // Check first 3 queues
      const queueName = metaKey.replace(':meta', '').split(':').pop();
      console.log(`\n   Queue: ${queueName}`);

      // Check different state keys for this queue
      const baseKey = metaKey.replace(':meta', '');
      const states = ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'];

      for (const state of states) {
        const stateKey = `${baseKey}:${state}`;
        const count = await redis.llen(stateKey);
        if (count > 0) {
          console.log(`     ${state}: ${count} jobs`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Redis debug error:', error);
  } finally {
    await redis.quit();
  }
}

debugRedisKeys();
