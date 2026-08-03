CREATE TYPE "LibraryItemStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "clause_library_items" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title_en" TEXT NOT NULL,
  "title_am" TEXT NOT NULL,
  "body_en" TEXT NOT NULL,
  "body_am" TEXT NOT NULL,
  "guidance" TEXT,
  "risk_level" "ContractRiskLevel" NOT NULL DEFAULT 'MEDIUM',
  "status" "LibraryItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clause_library_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_templates" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "contract_type" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "name_am" TEXT NOT NULL,
  "description_en" TEXT,
  "description_am" TEXT,
  "status" "LibraryItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_template_clauses" (
  "template_id" UUID NOT NULL,
  "clause_id" UUID NOT NULL,
  "sequence" INTEGER NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "contract_template_clauses_pkey" PRIMARY KEY ("template_id", "clause_id")
);

ALTER TABLE "contract_versions" ADD COLUMN "source_template_id" UUID;

CREATE UNIQUE INDEX "clause_library_items_organization_id_code_key" ON "clause_library_items"("organization_id", "code");
CREATE INDEX "clause_library_items_organization_id_status_category_idx" ON "clause_library_items"("organization_id", "status", "category");
CREATE UNIQUE INDEX "contract_templates_organization_id_code_key" ON "contract_templates"("organization_id", "code");
CREATE INDEX "contract_templates_organization_id_status_contract_type_idx" ON "contract_templates"("organization_id", "status", "contract_type");
CREATE UNIQUE INDEX "contract_template_clauses_template_id_sequence_key" ON "contract_template_clauses"("template_id", "sequence");
CREATE INDEX "contract_template_clauses_clause_id_idx" ON "contract_template_clauses"("clause_id");
CREATE INDEX "contract_versions_source_template_id_idx" ON "contract_versions"("source_template_id");

ALTER TABLE "clause_library_items" ADD CONSTRAINT "clause_library_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_template_clauses" ADD CONSTRAINT "contract_template_clauses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "contract_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_template_clauses" ADD CONSTRAINT "contract_template_clauses_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clause_library_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contract_versions" ADD CONSTRAINT "contract_versions_source_template_id_fkey" FOREIGN KEY ("source_template_id") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
