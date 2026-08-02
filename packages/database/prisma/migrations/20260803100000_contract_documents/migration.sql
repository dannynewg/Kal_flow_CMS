CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'AVAILABLE', 'QUARANTINED');

CREATE TABLE "contract_documents" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "contract_id" UUID NOT NULL,
  "contract_version_id" UUID,
  "uploaded_by_user_id" UUID NOT NULL,
  "object_key" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "sha256" TEXT NOT NULL,
  "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contract_documents_object_key_key" ON "contract_documents"("object_key");
CREATE INDEX "contract_documents_organization_id_contract_id_created_at_idx" ON "contract_documents"("organization_id", "contract_id", "created_at");
CREATE INDEX "contract_documents_contract_version_id_idx" ON "contract_documents"("contract_version_id");
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_contract_version_id_fkey" FOREIGN KEY ("contract_version_id") REFERENCES "contract_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_documents" ADD CONSTRAINT "contract_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
