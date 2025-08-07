import 'dotenv/config';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

async function diagnosePrefixIssue() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || undefined,
    db: parseInt(process.env.REDIS_DB || '0'),
  });

  try {
    console.log('🔍 Diagnosing Queue Prefix Issues');
    console.log('=================================');

    const configuredPrefix = process.env.QUEUE_PREFIX || 'bull';
    console.log(`Configured prefix: "${configuredPrefix}"`);

    // Test creating a queue and see what keys it generates
    console.log('\n📝 Testing Queue Creation...');

    const testQueue = new Queue('test-diagnosis', {
      connection: redis,
      prefix: configuredPrefix,
    });

    // Add a test job to see what keys are created
    await testQueue.add('test-job', { data: 'test' });

    // Check what keys were actually created
    const testKeys = await redis.keys('*test-diagnosis*');
    console.log('Keys created for test queue:', testKeys);

    // Clean up test
    await testQueue.obliterate({ force: true });
    await testQueue.close();

    // Analyze existing corrupted keys
    console.log('\n🔍 Analyzing Existing Corrupted Keys...');

    const allMetaKeys = await redis.keys('*:meta');
    const corruptedKeys = allMetaKeys.filter(key => key.includes('::'));
    const validKeys = allMetaKeys.filter(key => !key.includes('::'));

    console.log(`Total meta keys: ${allMetaKeys.length}`);
    console.log(`Corrupted keys: ${corruptedKeys.length}`);
    console.log(`Valid keys: ${validKeys.length}`);

    if (corruptedKeys.length > 0) {
      console.log('\nSample corrupted keys:');
      corruptedKeys.slice(0, 5).forEach(key => {
        const colonCount = (key.match(/:/g) || []).length;
        console.log(`  ${key} (${colonCount} colons)`);
      });
    }

    if (validKeys.length > 0) {
      console.log('\nSample valid keys:');
      validKeys.slice(0, 5).forEach(key => {
        console.log(`  ${key}`);
      });
    }

    // Check for patterns in corruption
    console.log('\n📊 Corruption Pattern Analysis...');
    const corruptionPatterns = new Map();

    corruptedKeys.forEach(key => {
      const colonCount = (key.match(/:/g) || []).length;
      corruptionPatterns.set(colonCount, (corruptionPatterns.get(colonCount) || 0) + 1);
    });

    console.log('Colon count distribution:');
    for (const [count, frequency] of corruptionPatterns.entries()) {
      console.log(`  ${count} colons: ${frequency} keys`);
    }

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
  } finally {
    await redis.quit();
  }
}

diagnosePrefixIssue();
