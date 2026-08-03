import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createPrismaClient } from '@kal-flow/database';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });
const prisma = createPrismaClient();
const day = 86_400_000;
const sweepIntervalMs = Number(process.env.OPERATIONS_SWEEP_INTERVAL_MS ?? 15 * 60 * 1_000);
const severityRank = { INFO: 0, WARNING: 1, CRITICAL: 2 } as const;
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
    const [rules, openAlerts] = await Promise.all([
      prisma.notificationRule.findMany({ where: { organizationId: organization.id, enabled: true } }),
      prisma.operationalAlert.findMany({ where: { organizationId: organization.id, status: { not: 'RESOLVED' } }, include: { contract: { select: { contractNumber: true, title: true } } } }),
    ]);
    for (const rule of rules) for (const alert of openAlerts) {
      if (!rule.alertTypes.includes(alert.type) || severityRank[alert.severity] < severityRank[rule.minimumSeverity]) continue;
      await prisma.notificationDelivery.upsert({
        where: { ruleId_alertId: { ruleId: rule.id, alertId: alert.id } },
        create: { organizationId: organization.id, ruleId: rule.id, alertId: alert.id, channel: rule.channel, recipient: rule.recipient, subject: `[Kal_flow] ${alert.severity}: ${alert.title}`, body: `${alert.contract.contractNumber} — ${alert.contract.title}\n${alert.type.replaceAll('_', ' ')} is due ${alert.dueAt.toISOString().slice(0, 10)}.` },
        update: {},
      });
    }
  }
  await dispatchNotifications();
  console.log(`Operational alert sweep completed for ${organizations.length} organizations.`);
}

async function dispatchNotifications() {
  const deliveries = await prisma.notificationDelivery.findMany({ where: { OR: [{ status: 'PENDING' }, { status: 'FAILED', attemptCount: { lt: 5 } }] }, take: 100, orderBy: { createdAt: 'asc' } });
  for (const delivery of deliveries) {
    const webhook = delivery.channel === 'EMAIL' ? process.env.NOTIFICATION_EMAIL_WEBHOOK_URL : process.env.NOTIFICATION_SMS_WEBHOOK_URL;
    if (!webhook) {
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'SKIPPED', attemptCount: { increment: 1 }, lastError: `${delivery.channel} provider is not configured` } });
      continue;
    }
    try {
      const response = await fetch(webhook, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env.NOTIFICATION_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_TOKEN}` } : {}) }, body: JSON.stringify({ channel: delivery.channel, to: delivery.recipient, subject: delivery.subject, text: delivery.body, idempotencyKey: delivery.id }) });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      const result = await response.json().catch(() => ({})) as { id?: string };
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', attemptCount: { increment: 1 }, providerId: result.id, lastError: null, sentAt: new Date() } });
    } catch (error) {
      await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', attemptCount: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 500) : 'Unknown provider error' } });
    }
  }
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
