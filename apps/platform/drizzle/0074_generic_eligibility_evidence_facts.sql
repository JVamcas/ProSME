CREATE TABLE "app_workflow_document_evidence_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "version_number" integer NOT NULL,
  "object_key" text NOT NULL,
  "original_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" bigint NOT NULL,
  "valid_until" timestamp with time zone,
  "uploaded_by" uuid NOT NULL,
  "uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_document_evidence_version_check"
    CHECK ("version_number" > 0),
  CONSTRAINT "app_workflow_document_evidence_size_check"
    CHECK ("size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "app_workflow_document_evidence_versions"
  ADD CONSTRAINT "app_workflow_document_evidence_application_fk"
  FOREIGN KEY ("application_id") REFERENCES "app_applications"("id")
  ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app_workflow_document_evidence_versions"
  ADD CONSTRAINT "app_workflow_document_evidence_requirement_fk"
  FOREIGN KEY ("requirement_id")
  REFERENCES "app_workflow_stage_document_requirements"("id")
  ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app_workflow_document_evidence_versions"
  ADD CONSTRAINT "app_workflow_document_evidence_uploader_fk"
  FOREIGN KEY ("uploaded_by") REFERENCES "app_users"("id")
  ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_document_evidence_version_unique"
  ON "app_workflow_document_evidence_versions"
  ("application_id", "requirement_id", "version_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_document_evidence_object_unique"
  ON "app_workflow_document_evidence_versions" ("object_key");
--> statement-breakpoint
CREATE INDEX "app_workflow_document_evidence_lookup_idx"
  ON "app_workflow_document_evidence_versions"
  ("application_id", "requirement_id", "version_number");
--> statement-breakpoint
CREATE TABLE "app_workflow_document_evidence_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_version_id" uuid NOT NULL,
  "status" text NOT NULL,
  "reviewed_by" uuid NOT NULL,
  "comment" text DEFAULT '' NOT NULL,
  "reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "app_workflow_document_evidence_verification_status_check"
    CHECK ("status" IN ('VERIFIED', 'REJECTED'))
);
--> statement-breakpoint
ALTER TABLE "app_workflow_document_evidence_verifications"
  ADD CONSTRAINT "app_workflow_document_evidence_verification_version_fk"
  FOREIGN KEY ("document_version_id")
  REFERENCES "app_workflow_document_evidence_versions"("id")
  ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "app_workflow_document_evidence_verifications"
  ADD CONSTRAINT "app_workflow_document_evidence_verification_reviewer_fk"
  FOREIGN KEY ("reviewed_by") REFERENCES "app_users"("id")
  ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "app_workflow_document_evidence_verification_unique"
  ON "app_workflow_document_evidence_verifications" ("document_version_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION reject_evidence_fact_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'document evidence and verification records are append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "app_workflow_document_evidence_append_only"
BEFORE UPDATE OR DELETE ON "app_workflow_document_evidence_versions"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_fact_mutation();
--> statement-breakpoint
CREATE TRIGGER "app_workflow_document_verification_append_only"
BEFORE UPDATE OR DELETE ON "app_workflow_document_evidence_verifications"
FOR EACH ROW EXECUTE FUNCTION reject_evidence_fact_mutation();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION eligibility_source_fact_exists(
  source_kind text,
  source_definition_id uuid,
  source_version_id uuid,
  source_key text
)
RETURNS boolean AS $$
BEGIN
  IF source_kind = 'SCREENING_CHECKLIST_ITEM' THEN
    RETURN source_key IN ('response', 'completed') AND EXISTS (
      SELECT 1
      FROM app_workflow_stage_checklist_definitions checklist
      JOIN app_workflow_stage_definitions stage ON stage.id = checklist.stage_id
      WHERE checklist.id = source_definition_id
        AND stage.version_id = source_version_id
    );
  END IF;
  IF source_kind = 'DOCUMENT_REQUIREMENT_FACT' THEN
    RETURN source_key IN (
      'present', 'verified', 'verificationStatus', 'validUntil',
      'expiredAtEvaluation', 'latestAcceptedVersionId'
    ) AND EXISTS (
      SELECT 1
      FROM app_workflow_stage_document_requirements requirement
      JOIN app_workflow_stage_definitions stage
        ON stage.id = requirement.stage_id
      WHERE requirement.id = source_definition_id
        AND stage.version_id = source_version_id
    );
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION validate_eligibility_inputs_for_publication(
  target_version_id uuid
)
RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app_eligibility_input_definitions input
    LEFT JOIN app_eligibility_self_check_questions question
      ON question.input_definition_id = input.id
    LEFT JOIN app_eligibility_screening_source_bindings source
      ON source.input_definition_id = input.id
    WHERE input.version_id = target_version_id
      AND (
        ('SELF_CHECK' = ANY(input.available_in))
          <> (question.input_definition_id IS NOT NULL)
        OR ('SCREENING' = ANY(input.available_in))
          <> (source.input_definition_id IS NOT NULL)
        OR (
          source.input_definition_id IS NOT NULL
          AND NOT CASE source.source_kind
            WHEN 'APPLICATION_FORM_FIELD' THEN EXISTS (
              SELECT 1 FROM app_form_fields field
              WHERE field.id = source.source_definition_id
                AND field.form_version_id = source.source_version_id
            )
            WHEN 'FUNDING_CALL_FIELD' THEN EXISTS (
              SELECT 1 FROM app_funding_calls funding_call
              WHERE funding_call.id = source.source_definition_id
                AND funding_call.eligibility_rule_set_version_id = target_version_id
            )
            WHEN 'WORKFLOW_FORM_FIELD' THEN EXISTS (
              SELECT 1 FROM app_form_fields field
              WHERE field.id = source.source_definition_id
                AND field.form_version_id = source.source_version_id
            )
            WHEN 'SCREENING_CHECKLIST_ITEM' THEN
              eligibility_source_fact_exists(
                source.source_kind, source.source_definition_id,
                source.source_version_id, source.source_key
              )
            WHEN 'DOCUMENT_REQUIREMENT_FACT' THEN
              eligibility_source_fact_exists(
                source.source_kind, source.source_definition_id,
                source.source_version_id, source.source_key
              )
            WHEN 'MANUAL_ASSESSMENT' THEN EXISTS (
              SELECT 1
              FROM app_stage_task_definitions task
              JOIN app_workflow_stage_definitions stage ON stage.id = task.stage_id
              WHERE task.id = source.source_definition_id
                AND stage.version_id = source.source_version_id
            )
            WHEN 'INTEGRATION_OUTPUT' THEN FALSE
            ELSE FALSE
          END
        )
      )
  ) THEN
    RAISE EXCEPTION 'eligibility inputs contain missing or unresolved bindings';
  END IF;
END;
$$ LANGUAGE plpgsql;
