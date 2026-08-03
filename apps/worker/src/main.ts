import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createPrismaClient } from '@kal-flow/database';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = createPrismaClient();
const day = 86_400_000;
const sweepIntervalMs = Number(process.env.OPERATIONS_SWEEP_INTERVAL_MS ?? 15 * 60 * 1_000);
const worker = new Worker(
  'kal-flow-system',
  async (job) => ({ jobId: job.id, processedAt: new Date().toISOString() }),
  { connection: redis },
);

worker.on('ready', () => console.log('Kal_flow worker is ready.'));
worker.on('failed', (job, error) => console.error(`Job ${job?.id ?? 'unknown'} failed.`, error));

async function reconcileOperationalAlerts() {
  const now = new Date(); const horizon = new Date(now.getTime() + 90 * day);
  const organizations = await prisma.organization.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
  for (const organization of organizations) {
    const [obligations, renewals, contracts] = await Promise.all([
      prisma.contractObligation.findMany({ where: { organizationId: organization.id, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lte: horizon } } }),
      prisma.contractRenewal.findMany({ where: { organizationId: organization.id, decision: 'PENDING', noticeDeadline: { lte: horizon } } }),
      prisma.contract.findMany({ where: { organizationId: organization.id, status: 'ACTIVE', expirationDate: { lte: horizon } }, select: { id: true, contractNumber: true, title: true, expirationDate: true } }),
    ]);
    const severity = (date: Date) => { const days = Math.ceil((date.getTime() - now.getTime()) / day); return days < 0 ? 'CRITICAL' as const : days <= 7 ? 'WARNING' as const : 'INFO' as const; };
    const alerts = [
      ...obligations.filter((item) => Math.ceil((item.dueDate.getTime() - now.getTime()) / day) <= Math.max(...item.reminderDays, 0)).map((item) => ({ organizationId: organization.id, contractId: item.contractId, obligationId: item.id, dedupeKey: `obligation:${item.id}:schedule`, type: item.dueDate < now ? 'OBLIGATION_OVERDUE' as const : 'OBLIGATION_DUE' as const, severity: severity(item.dueDate), title: item.title, dueAt: item.dueDate })),
      ...renewals.filter((item) => item.noticeDeadline).map((item) => ({ organizationId: organization.id, contractId: item.contractId, renewalId: item.id, dedupeKey: `renewal:${item.id}:notice`, type: 'NOTICE_DEADLINE' as const, severity: severity(item.noticeDeadline!), title: 'Renewal notice decision required', dueAt: item.noticeDeadline! })),
      ...contracts.filter((item) => item.expirationDate).map((item) => ({ organizationId: organization.id, contractId: item.id, dedupeKey: `contract:${item.id}:expiry`, type: 'CONTRACT_EXPIRY' as const, severity: severity(item.expirationDate!), title: `${item.contractNumber} · ${item.title}`, dueAt: item.expirationDate! })),
    ];
    await Promise.all(alerts.map((alert) => prisma.operationalAlert.upsert({ where: { dedupeKey: alert.dedupeKey }, create: alert, update: { type: alert.type, severity: alert.severity, title: alert.title, dueAt: alert.dueAt } })));
  }
  console.log(`Operational alert sweep completed for ${organizations.length} organizations.`);
}

void reconcileOperationalAlerts().catch((error) => console.error('Operational alert sweep failed.', error));
const alertSweep = setInterval(() => void reconcileOperationalAlerts().catch((error) => console.error('Operational alert sweep failed.', error)), sweepIntervalMs);
alertSweep.unref();

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; closing worker.`);
  clearInterval(alertSweep);
  await worker.close();
  await redis.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
