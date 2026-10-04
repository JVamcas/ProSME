CREATE TABLE IF NOT EXISTS app_workflow_task_document_evidence (
  task_id uuid NOT NULL REFERENCES app_workflow_tasks(id) ON DELETE RESTRICT,
  document_version_id uuid NOT NULL REFERENCES app_workflow_document_evidence_versions(id) ON DELETE RESTRICT,
  PRIMARY KEY (task_id, document_version_id)
);
--> statement-breakpoint
-- Preserve historical uploads on their original run, never on every new run.
INSERT INTO app_workflow_task_document_evidence (task_id, document_version_id)
SELECT task.id, evidence.id
FROM app_workflow_document_evidence_versions evidence
JOIN app_workflow_stage_document_requirements requirement
  ON requirement.id = evidence.requirement_id
JOIN LATERAL (
  SELECT stage.id
  FROM app_workflow_stage_instances stage
  JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
  WHERE workflow.application_id = evidence.application_id
    AND stage.workflow_stage_definition_id = requirement.stage_id
    AND stage.activated_at <= evidence.uploaded_at
  ORDER BY stage.activated_at DESC, stage.iteration_number DESC
  LIMIT 1
) original_stage ON TRUE
JOIN app_workflow_tasks task
  ON task.stage_instance_id = original_stage.id
  AND task.workflow_task_definition_id = requirement.task_definition_id
  AND task.created_at <= evidence.uploaded_at
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Reconstruct explicit Retain returns only; forward progression starts fresh.
WITH RECURSIVE retained(task_id, document_version_id) AS (
  SELECT task_id, document_version_id FROM app_workflow_task_document_evidence
  UNION
  SELECT fresh.id, retained.document_version_id
  FROM retained
  JOIN app_workflow_tasks fresh ON fresh.supersedes_task_id = retained.task_id
  JOIN app_workflow_stage_instances stage ON stage.id = fresh.stage_instance_id
  WHERE EXISTS (
    SELECT 1 FROM app_workflow_reworks rework
    WHERE rework.target_stage_instance_id = stage.id
      AND rework.workflow_instance_id = stage.workflow_instance_id
      AND rework.data_handling = 'RETAIN'
  )
)
INSERT INTO app_workflow_task_document_evidence (task_id, document_version_id)
SELECT task_id, document_version_id FROM retained
ON CONFLICT DO NOTHING;
