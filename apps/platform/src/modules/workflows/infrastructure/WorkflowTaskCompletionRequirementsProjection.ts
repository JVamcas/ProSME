import "server-only";

import { sql } from "drizzle-orm";
import { workflowTaskDocumentRequirements } from "./WorkflowDocumentEvidenceReadiness";

export const workflowTaskCompletionRequirementsProjection = sql`
  ${workflowTaskDocumentRequirements(sql`task.id`, sql`definition.id`)} AS "documentRequirements",
  (
    SELECT jsonb_build_object(
      'aggregation', scoring.aggregation,
      'criteria', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'stableKey', criterion.stable_key,
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
