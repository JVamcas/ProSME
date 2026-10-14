ALTER TABLE app_workflow_stage_document_requirements
  DROP CONSTRAINT IF EXISTS app_stage_documents_file_types_check;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_document_requirements
  ADD CONSTRAINT app_stage_documents_file_types_check CHECK (
    jsonb_typeof(accepted_file_types) = 'array'
    AND jsonb_array_length(accepted_file_types) > 0
    AND accepted_file_types <@ '["PDF", "JPG", "PNG", "DOCX", "JPEG", "XLS", "XLSX", "TXT", "CSV"]'::jsonb
  );
--> statement-breakpoint
ALTER TABLE app_workflow_stage_document_requirements
  DROP CONSTRAINT IF EXISTS app_stage_documents_uploader_check;
--> statement-breakpoint
ALTER TABLE app_workflow_stage_document_requirements
  ADD CONSTRAINT app_stage_documents_uploader_check
    CHECK (uploader IN ('ANY', 'APPLICANT', 'ASSIGNED_REVIEWER', 'STAFF'));
