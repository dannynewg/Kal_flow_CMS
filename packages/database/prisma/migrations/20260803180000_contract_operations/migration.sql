CREATE TYPE "ObligationKind" AS ENUM ('OBLIGATION', 'MILESTONE');
CREATE TYPE "ObligationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'WAIVED');
CREATE TYPE "ObligationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "RenewalType" AS ENUM ('AUTO_RENEW', 'MANUAL_RENEW', 'NON_RENEWING');
CREATE TYPE "RenewalDecision" AS ENUM ('PENDING', 'RENEW', 'RENEGOTIATE', 'TERMINATE');
CREATE TYPE "OperationalAlertType" AS ENUM ('OBLIGATION_DUE', 'OBLIGATION_OVERDUE', 'NOTICE_DEADLINE', 'CONTRACT_EXPIRY');
CREATE TYPE "OperationalAlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "OperationalAlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

CREATE TABLE "contract_obligations" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "contract_id" UUID NOT NULL,
  "owner_membership_id" UUID NOT NULL, "kind" "ObligationKind" NOT NULL DEFAULT 'OBLIGATION',
  "title" TEXT NOT NULL, "description" TEXT, "due_date" DATE NOT NULL,
  "priority" "ObligationPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "ObligationStatus" NOT NULL DEFAULT 'OPEN', "reminder_days" INTEGER[] DEFAULT ARRAY[30,14,7]::INTEGER[],
  "completion_note" TEXT, "completed_at" TIMESTAMP(3), "completed_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_obligations_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "contract_renewals" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "contract_id" UUID NOT NULL,
  "renewal_type" "RenewalType" NOT NULL, "renewal_date" DATE NOT NULL, "notice_deadline" DATE,
  "notice_period_days" INTEGER, "decision" "RenewalDecision" NOT NULL DEFAULT 'PENDING',
  "decision_note" TEXT, "decision_at" TIMESTAMP(3), "decided_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_renewals_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "operational_alerts" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "contract_id" UUID NOT NULL,
  "obligation_id" UUID, "renewal_id" UUID, "dedupe_key" TEXT NOT NULL,
  "type" "OperationalAlertType" NOT NULL, "severity" "OperationalAlertSeverity" NOT NULL,
  "title" TEXT NOT NULL, "due_at" TIMESTAMP(3) NOT NULL, "status" "OperationalAlertStatus" NOT NULL DEFAULT 'OPEN',
  "acknowledged_at" TIMESTAMP(3), "acknowledged_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "operational_alerts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_renewals_contract_id_key" ON "contract_renewals"("contract_id");
CREATE UNIQUE INDEX "operational_alerts_dedupe_key_key" ON "operational_alerts"("dedupe_key");
CREATE INDEX "contract_obligations_organization_id_status_due_date_idx" ON "contract_obligations"("organization_id", "status", "due_date");
CREATE INDEX "contract_obligations_contract_id_due_date_idx" ON "contract_obligations"("contract_id", "due_date");
CREATE INDEX "contract_obligations_owner_membership_id_status_due_date_idx" ON "contract_obligations"("owner_membership_id", "status", "due_date");
CREATE INDEX "contract_renewals_organization_id_decision_renewal_date_idx" ON "contract_renewals"("organization_id", "decision", "renewal_date");
CREATE INDEX "contract_renewals_organization_id_notice_deadline_idx" ON "contract_renewals"("organization_id", "notice_deadline");
CREATE INDEX "operational_alerts_organization_id_status_severity_due_at_idx" ON "operational_alerts"("organization_id", "status", "severity", "due_at");
CREATE INDEX "operational_alerts_contract_id_status_idx" ON "operational_alerts"("contract_id", "status");
ALTER TABLE "contract_obligations" ADD CONSTRAINT "contract_obligations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_obligations" ADD CONSTRAINT "contract_obligations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_obligations" ADD CONSTRAINT "contract_obligations_owner_membership_id_fkey" FOREIGN KEY ("owner_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_obligations" ADD CONSTRAINT "contract_obligations_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_renewals" ADD CONSTRAINT "contract_renewals_decided_by_user_id_fkey" FOREIGN KEY ("decided_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "contract_obligations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_renewal_id_fkey" FOREIGN KEY ("renewal_id") REFERENCES "contract_renewals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operational_alerts" ADD CONSTRAINT "operational_alerts_acknowledged_by_user_id_fkey" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
