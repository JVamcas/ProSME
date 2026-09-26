import "server-only";

import { sql } from "drizzle-orm";

export const workflowTaskCompletionRequirementsProjection = sql`
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'mandatory', document.mandatory,
      'name', document.name,
      'evidenceUploaded', EXISTS (
        SELECT 1
        FROM app_workflow_document_evidence_versions evidence
        WHERE evidence.application_id = workflow.application_id
          AND evidence.requirement_id = document.id
      )
    ))
    FROM app_workflow_stage_document_requirements document
    WHERE document.task_definition_id = definition.id
  ), '[]'::jsonb) AS "documentRequirements",
  (
    SELECT jsonb_build_object(
      'aggregation', scoring.aggregation,
      'criteria', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'criterion', criterion.criterion,
          'description', criterion.description,
          'mandatoryComment', criterion.mandatory_comment,
          'scaleMaximum', criterion.scale_maximum,
          'scaleMinimum', criterion.scale_minimum,
          'weight', criterion.weight
        ))
        FROM app_workflow_stage_scoring_criteria criterion
        WHERE criterion.stage_id = scoring.stage_id
      ), '[]'::jsonb)
    )
    FROM app_workflow_stage_scoring_configurations scoring
    WHERE scoring.task_definition_id = definition.id
  ) AS scoring
`;
