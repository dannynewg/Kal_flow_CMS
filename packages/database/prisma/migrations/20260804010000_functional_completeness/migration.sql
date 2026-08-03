CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "document_pages" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "page_number" INTEGER NOT NULL,
  "title" TEXT,
  "content" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_revisions" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "summary" TEXT,
  "pages" JSONB NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_rules" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "recipient" TEXT NOT NULL,
  "alert_types" "OperationalAlertType"[],
  "minimum_severity" "OperationalAlertSeverity" NOT NULL DEFAULT 'INFO',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_deliveries" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "rule_id" UUID NOT NULL,
  "alert_id" UUID NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "provider_id" TEXT,
  "last_error" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_pages_document_id_page_number_key" ON "document_pages"("document_id", "page_number");
CREATE INDEX "document_pages_document_id_idx" ON "document_pages"("document_id");
CREATE UNIQUE INDEX "document_revisions_document_id_revision_number_key" ON "document_revisions"("document_id", "revision_number");
CREATE INDEX "document_revisions_document_id_created_at_idx" ON "document_revisions"("document_id", "created_at");
CREATE INDEX "notification_rules_organization_id_enabled_idx" ON "notification_rules"("organization_id", "enabled");
CREATE UNIQUE INDEX "notification_deliveries_rule_id_alert_id_key" ON "notification_deliveries"("rule_id", "alert_id");
CREATE INDEX "notification_deliveries_organization_id_status_created_at_idx" ON "notification_deliveries"("organization_id", "status", "created_at");

ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "contract_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "notification_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "operational_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
