CREATE TYPE "ContractRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'TRIAGED', 'CONVERTED', 'CANCELLED');
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'ACTIVE', 'CANCELLED');
CREATE TYPE "ContractRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "ReviewStepStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'SKIPPED');

CREATE TABLE "contract_requests" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "department_id" UUID NOT NULL,
  "requester_user_id" UUID NOT NULL,
  "assigned_to_user_id" UUID,
  "request_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "counterparty_name" TEXT NOT NULL,
  "estimated_value_minor" BIGINT,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "desired_effective_date" DATE,
  "risk_level" "ContractRiskLevel" NOT NULL DEFAULT 'MEDIUM',
  "status" "ContractRequestStatus" NOT NULL DEFAULT 'DRAFT',
  "submitted_at" TIMESTAMP(3),
  "triaged_at" TIMESTAMP(3),
  "converted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contracts" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "request_id" UUID,
  "department_id" UUID NOT NULL,
  "owner_membership_id" UUID NOT NULL,
  "contract_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "counterparty_name" TEXT NOT NULL,
  "value_minor" BIGINT,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "risk_level" "ContractRiskLevel" NOT NULL DEFAULT 'MEDIUM',
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "effective_date" DATE,
  "expiration_date" DATE,
  "approved_at" TIMESTAMP(3),
  "activated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_versions" (
  "id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "content" TEXT NOT NULL,
  "change_note" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_review_steps" (
  "id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "round" INTEGER NOT NULL DEFAULT 1,
  "name" TEXT NOT NULL,
  "required_role" "OrganizationRole" NOT NULL,
  "assigned_user_id" UUID,
  "status" "ReviewStepStatus" NOT NULL DEFAULT 'PENDING',
  "comment" TEXT,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_review_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contract_requests_organization_id_request_number_key" ON "contract_requests"("organization_id", "request_number");
CREATE INDEX "contract_requests_organization_id_status_created_at_idx" ON "contract_requests"("organization_id", "status", "created_at");
CREATE INDEX "contract_requests_requester_user_id_status_idx" ON "contract_requests"("requester_user_id", "status");
CREATE UNIQUE INDEX "contracts_request_id_key" ON "contracts"("request_id");
CREATE UNIQUE INDEX "contracts_organization_id_contract_number_key" ON "contracts"("organization_id", "contract_number");
CREATE INDEX "contracts_organization_id_status_updated_at_idx" ON "contracts"("organization_id", "status", "updated_at");
CREATE INDEX "contracts_department_id_status_idx" ON "contracts"("department_id", "status");
CREATE UNIQUE INDEX "contract_versions_contract_id_version_number_key" ON "contract_versions"("contract_id", "version_number");
CREATE INDEX "contract_versions_contract_id_created_at_idx" ON "contract_versions"("contract_id", "created_at");
CREATE UNIQUE INDEX "contract_review_steps_contract_id_round_sequence_key" ON "contract_review_steps"("contract_id", "round", "sequence");
CREATE INDEX "contract_review_steps_assigned_user_id_status_idx" ON "contract_review_steps"("assigned_user_id", "status");

ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_requester_user_id_fkey" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "contract_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_owner_membership_id_fkey" FOREIGN KEY ("owner_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_review_steps" ADD CONSTRAINT "contract_review_steps_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_review_steps" ADD CONSTRAINT "contract_review_steps_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contract_requests" ADD CONSTRAINT "contract_requests_value_nonnegative" CHECK ("estimated_value_minor" IS NULL OR "estimated_value_minor" >= 0);
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_value_nonnegative" CHECK ("value_minor" IS NULL OR "value_minor" >= 0);
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_date_order" CHECK ("expiration_date" IS NULL OR "effective_date" IS NULL OR "expiration_date" >= "effective_date");
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_positive_number" CHECK ("version_number" > 0);
ALTER TABLE "contract_review_steps" ADD CONSTRAINT "contract_review_steps_positive_sequence" CHECK ("sequence" > 0);
ALTER TABLE "contract_review_steps" ADD CONSTRAINT "contract_review_steps_positive_round" CHECK ("round" > 0);
