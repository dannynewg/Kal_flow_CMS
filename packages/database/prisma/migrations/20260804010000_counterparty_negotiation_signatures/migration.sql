CREATE TYPE "CounterpartyType" AS ENUM ('BUSINESS', 'GOVERNMENT', 'NGO', 'INDIVIDUAL');
CREATE TYPE "CounterpartyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
CREATE TYPE "NegotiationStatus" AS ENUM ('OPEN', 'AGREED', 'CLOSED');
CREATE TYPE "NegotiationItemStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "SignaturePacketStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'VOIDED', 'EXPIRED');
CREATE TYPE "SignatureSignerStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED');

CREATE TABLE "counterparties" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "legal_name" TEXT NOT NULL,
  "trade_name" TEXT, "type" "CounterpartyType" NOT NULL DEFAULT 'BUSINESS',
  "status" "CounterpartyStatus" NOT NULL DEFAULT 'ACTIVE', "tin" TEXT,
  "registration_number" TEXT, "country" TEXT NOT NULL DEFAULT 'ET', "city" TEXT,
  "address" TEXT, "risk_note" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "counterparties_organization_id_legal_name_key" ON "counterparties"("organization_id", "legal_name");
CREATE INDEX "counterparties_organization_id_status_legal_name_idx" ON "counterparties"("organization_id", "status", "legal_name");

CREATE TABLE "counterparty_contacts" (
  "id" UUID NOT NULL, "counterparty_id" UUID NOT NULL, "name" TEXT NOT NULL, "title" TEXT,
  "email" TEXT, "phone" TEXT, "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "counterparty_contacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "counterparty_contacts_counterparty_id_is_primary_idx" ON "counterparty_contacts"("counterparty_id", "is_primary");

ALTER TABLE "contracts" ADD COLUMN "counterparty_id" UUID;
CREATE INDEX "contracts_counterparty_id_idx" ON "contracts"("counterparty_id");

CREATE TABLE "negotiations" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "contract_id" UUID NOT NULL,
  "contract_version_id" UUID NOT NULL, "counterparty_id" UUID, "title" TEXT NOT NULL,
  "status" "NegotiationStatus" NOT NULL DEFAULT 'OPEN', "agreed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "negotiations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "negotiations_organization_id_status_updated_at_idx" ON "negotiations"("organization_id", "status", "updated_at");
CREATE INDEX "negotiations_contract_id_status_idx" ON "negotiations"("contract_id", "status");

CREATE TABLE "negotiation_messages" (
  "id" UUID NOT NULL, "negotiation_id" UUID NOT NULL, "author_user_id" UUID NOT NULL,
  "clause_reference" TEXT, "message" TEXT NOT NULL, "proposed_text" TEXT,
  "status" "NegotiationItemStatus" NOT NULL DEFAULT 'OPEN', "resolved_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "negotiation_messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "negotiation_messages_negotiation_id_status_created_at_idx" ON "negotiation_messages"("negotiation_id", "status", "created_at");

CREATE TABLE "signature_packets" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "contract_id" UUID NOT NULL,
  "contract_version_id" UUID NOT NULL, "created_by_user_id" UUID NOT NULL, "title" TEXT NOT NULL,
  "status" "SignaturePacketStatus" NOT NULL DEFAULT 'DRAFT', "provider" TEXT NOT NULL DEFAULT 'INTERNAL_DEMO',
  "provider_packet_id" TEXT, "document_sha256" TEXT NOT NULL, "evidence" JSONB NOT NULL DEFAULT '{}',
  "message" TEXT, "expires_at" TIMESTAMP(3), "sent_at" TIMESTAMP(3), "completed_at" TIMESTAMP(3),
  "voided_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "signature_packets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "signature_packets_organization_id_status_updated_at_idx" ON "signature_packets"("organization_id", "status", "updated_at");
CREATE INDEX "signature_packets_contract_id_status_idx" ON "signature_packets"("contract_id", "status");

CREATE TABLE "signature_signers" (
  "id" UUID NOT NULL, "packet_id" UUID NOT NULL, "counterparty_contact_id" UUID, "sequence" INTEGER NOT NULL,
  "name" TEXT NOT NULL, "email" TEXT NOT NULL, "role" TEXT,
  "status" "SignatureSignerStatus" NOT NULL DEFAULT 'PENDING', "signed_at" TIMESTAMP(3), "declined_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "signature_signers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "signature_signers_packet_id_sequence_key" ON "signature_signers"("packet_id", "sequence");
CREATE INDEX "signature_signers_packet_id_status_idx" ON "signature_signers"("packet_id", "status");

CREATE TABLE "signature_events" (
  "id" UUID NOT NULL, "packet_id" UUID NOT NULL, "type" TEXT NOT NULL, "actor_email" TEXT,
  "external_id" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}', "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "signature_events_packet_id_created_at_idx" ON "signature_events"("packet_id", "created_at");
CREATE UNIQUE INDEX "signature_events_external_id_key" ON "signature_events"("external_id");

ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "counterparty_contacts" ADD CONSTRAINT "counterparty_contacts_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "negotiations" ADD CONSTRAINT "negotiations_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "negotiation_messages" ADD CONSTRAINT "negotiation_messages_negotiation_id_fkey" FOREIGN KEY ("negotiation_id") REFERENCES "negotiations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "negotiation_messages" ADD CONSTRAINT "negotiation_messages_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "signature_packets" ADD CONSTRAINT "signature_packets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signature_packets" ADD CONSTRAINT "signature_packets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signature_packets" ADD CONSTRAINT "signature_packets_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "signature_packets" ADD CONSTRAINT "signature_packets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "signature_signers" ADD CONSTRAINT "signature_signers_packet_id_fkey" FOREIGN KEY ("packet_id") REFERENCES "signature_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "signature_signers" ADD CONSTRAINT "signature_signers_counterparty_contact_id_fkey" FOREIGN KEY ("counterparty_contact_id") REFERENCES "counterparty_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "signature_events" ADD CONSTRAINT "signature_events_packet_id_fkey" FOREIGN KEY ("packet_id") REFERENCES "signature_packets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
