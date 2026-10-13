ALTER TABLE app_form_fields ADD COLUMN IF NOT EXISTS uploaded_by text;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_document_requirements ADD COLUMN IF NOT EXISTS max_pages integer;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_document_requirements ADD COLUMN IF NOT EXISTS accepted_extensions jsonb;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_form_fields_uploaded_by_check') THEN
    ALTER TABLE app_form_fields ADD CONSTRAINT app_form_fields_uploaded_by_check
      CHECK (uploaded_by IS NULL OR (type = 'DOCUMENT' AND uploaded_by IN ('APPLICANT', 'ANY', 'ASSIGNED_REVIEWER')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_stage_documents_max_pages_check') THEN
    ALTER TABLE app_workflow_stage_document_requirements ADD CONSTRAINT app_stage_documents_max_pages_check
      CHECK (max_pages IS NULL OR max_pages > 0);
  END IF;
END $$;
