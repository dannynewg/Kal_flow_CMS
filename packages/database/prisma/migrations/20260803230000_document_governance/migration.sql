CREATE TYPE "DocumentCategory" AS ENUM ('CONTRACT', 'AMENDMENT', 'SUPPORTING', 'EVIDENCE', 'CORRESPONDENCE', 'OTHER');
CREATE TYPE "DocumentConfidentiality" AS ENUM ('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');
ALTER TYPE "DocumentStatus" ADD VALUE 'ARCHIVED';

ALTER TABLE "contract_documents"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category" "DocumentCategory" NOT NULL DEFAULT 'CONTRACT',
  ADD COLUMN "confidentiality" "DocumentConfidentiality" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "retention_until" DATE;

CREATE INDEX "contract_documents_organization_id_status_category_created_at_idx"
  ON "contract_documents"("organization_id", "status", "category", "created_at");
