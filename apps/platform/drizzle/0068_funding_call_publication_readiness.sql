ALTER TABLE "app_funding_call_public_documents"
  ADD COLUMN "finalized" boolean DEFAULT false NOT NULL,
  ADD COLUMN "security_cleared" boolean DEFAULT false NOT NULL,
  ADD COLUMN "marked_for_publication" boolean DEFAULT false NOT NULL;
