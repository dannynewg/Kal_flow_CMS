import { Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const worker = new Worker(
  'kal-flow-system',
  async (job) => ({ jobId: job.id, processedAt: new Date().toISOString() }),
  { connection: redis },
);

worker.on('ready', () => console.log('Kal_flow worker is ready.'));
worker.on('failed', (job, error) => console.error(`Job ${job?.id ?? 'unknown'} failed.`, error));

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; closing worker.`);
  await worker.close();
  await redis.quit();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
