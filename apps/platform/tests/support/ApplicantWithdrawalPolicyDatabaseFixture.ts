import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import { randomUUID } from "node:crypto";

export type WithdrawalPolicyQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export async function seedWithdrawalPolicyScenario(
  query: WithdrawalPolicyQuery,
  options: {
    allowedStages?: [boolean, boolean];
    secondStageStatus?: "ACTIVE" | "BLOCKED" | "COMPLETED" | "NOT_STARTED";
    allowResubmission?: boolean;
    duplicatePolicy?: "none" | "one_per_applicant" | "one_per_business";
  } = {},
) {
  const ownerId = randomUUID();
  const businessId = randomUUID();
  const callId = randomUUID();
  const workflowId = randomUUID();
  const applicationId = randomUUID();
  const definitionId = randomUUID();
  const versionId = randomUUID();
  const formId = randomUUID();
  const formVersionId = randomUUID();
  const rulesId = randomUUID();
  const rulesVersionId = randomUUID();
  const stageIds = [randomUUID(), randomUUID()];
  const stageDefinitionIds = [randomUUID(), randomUUID()];
  const taskDefinitionIds = [randomUUID(), randomUUID()];
  const allowResubmission = options.allowResubmission ?? false;
  const duplicatePolicy = options.duplicatePolicy ?? "one_per_applicant";
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $2, 'Withdrawal applicant', 'applicant', 'active')`,
    [ownerId, `${ownerId}@example.test`],
  );
  await query(
    `INSERT INTO app_business_profiles
      (id, user_id, legal_name, business_type, sector, region, physical_address)
     VALUES ($1, $2, 'Withdrawal business', 'cc', 'services', 'Khomas', 'Test')`,
    [businessId, ownerId],
  );
  await seedPublishedBindings(query, {
    formId,
    formVersionId,
    rulesId,
    rulesVersionId,
    ownerId,
  });
  await query(
    `INSERT INTO app_workflow_definitions (id, code, name)
     VALUES ($1, $2, 'Withdrawal workflow')`,
    [definitionId, `WITHDRAWAL_${definitionId.replaceAll("-", "")}`],
  );
  await query(
    `INSERT INTO app_workflow_definition_versions
      (id, definition_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [versionId, definitionId, ownerId],
  );
  for (let index = 0; index < 2; index += 1) {
    const withdrawalColumn = options.allowedStages
      ? ", allow_applicant_withdrawal"
      : "";
    const withdrawalValue = options.allowedStages ? ", $6" : "";
    const values: unknown[] = [
      stageDefinitionIds[index],
      versionId,
      `BRANCH_${index}`,
      index + 1,
      index === 0,
    ];
    if (options.allowedStages) values.push(options.allowedStages[index]);
    await query(
      `INSERT INTO app_workflow_stage_definitions
        (id, version_id, code, name, sequence, initial, applicant_status,
         applicant_label, applicant_description${withdrawalColumn})
       VALUES ($1, $2, $3, $3, $4, $5, 'UNDER_REVIEW',
         'Under review', 'Your application is being reviewed.'${withdrawalValue})`,
      values,
    );
    await query(
      `INSERT INTO app_stage_task_definitions
        (id, stage_id, code, name, sequence, task_type, permissions)
       VALUES ($1, $2, $3, 'Review', 1, 'CONTRIBUTING', $4::jsonb)`,
      [
        taskDefinitionIds[index],
        stageDefinitionIds[index],
        `REVIEW_${index}`,
        JSON.stringify(defaultWorkflowElementPermissions),
      ],
    );
  }
  await query(
    `UPDATE app_workflow_definition_versions SET status = 'PUBLISHED',
      row_version = 2, published_by = $2, published_at = now() WHERE id = $1`,
    [versionId, ownerId],
  );
  await query(
    `INSERT INTO app_funding_calls
      (id, reference, slug, title, description, form_version_id,
       eligibility_rule_set_version_id, workflow_template_version_id,
       application_duplicate_policy, allow_resubmission_after_withdrawal,
       total_budget_envelope, minimum_grant_amount, maximum_grant_amount,
       opens_at, closes_at, status, created_by, updated_by)
     VALUES ($1, ($1::uuid)::text, ($1::uuid)::text, 'Withdrawal call', 'Test', $2, $3, $4,
       $5, $6, 1000000, 1000, 100000, now() - interval '1 day',
       now() + interval '30 days', 'LIVE', $7, $7)`,
    [
      callId,
      formVersionId,
      rulesVersionId,
      versionId,
      duplicatePolicy,
      allowResubmission,
      ownerId,
    ],
  );
  const lifecycleId = randomUUID();
  await query(
    `INSERT INTO app_funding_call_lifecycle_history
      (id, funding_call_id, command, source_status, target_status, actor_id,
       command_time, effective_time, row_version, correlation_id, idempotency_key)
     VALUES ($1, $2, 'PUBLISH', 'APPROVED', 'LIVE', $3, now(), now(), 2, $4, $5)`,
    [lifecycleId, callId, ownerId, randomUUID(), randomUUID()],
  );
  await query(
    `INSERT INTO app_funding_call_publication_revisions
      (funding_call_id, revision_number, source_row_version, published_status,
       snapshot, lifecycle_history_id, published_by, published_at, correlation_id)
     VALUES ($1, 1, 1, 'LIVE', $2::jsonb, $3, $4, now(), $5)`,
    [
      callId,
      JSON.stringify({
        allowResubmissionAfterWithdrawal: allowResubmission,
        applicationDuplicatePolicy: duplicatePolicy,
        eligibilityRuleSetVersionId: rulesVersionId,
        formVersionId,
        title: "Withdrawal call",
        workflowTemplateVersionId: versionId,
      }),
      lifecycleId,
      ownerId,
      randomUUID(),
    ],
  );
  await query(
    `INSERT INTO app_applications
      (id, owner_user_id, business_id, funding_opportunity_id, funding_opportunity_title,
       duplicate_policy, allow_resubmission_after_withdrawal, status, reference,
       submitted_at, form_version_id, eligibility_rule_set_version_id)
     VALUES ($1, $2, $3, $4, 'Withdrawal call', $5, $6, 'submitted', ($1::uuid)::text,
       now(), $7, $8)`,
    [
      applicationId,
      ownerId,
      businessId,
      callId,
      duplicatePolicy,
      allowResubmission,
      formVersionId,
      rulesVersionId,
    ],
  );
  await query(
    `INSERT INTO app_workflow_instances (id, application_id, workflow_template_version_id)
     VALUES ($1, $2, $3)`,
    [workflowId, applicationId, versionId],
  );
  for (let index = 0; index < 2; index += 1) {
    await query(
      `INSERT INTO app_workflow_stage_instances
        (id, workflow_instance_id, workflow_stage_definition_id, status)
       VALUES ($1, $2, $3, $4)`,
      [
        stageIds[index],
        workflowId,
        stageDefinitionIds[index],
        index === 0 ? "ACTIVE" : (options.secondStageStatus ?? "ACTIVE"),
      ],
    );
    await query(
      `INSERT INTO app_workflow_tasks
        (stage_instance_id, workflow_task_definition_id, status)
       VALUES ($1, $2, 'PENDING')`,
      [stageIds[index], taskDefinitionIds[index]],
    );
  }
  return {
    ownerId,
    businessId,
    callId,
    workflowId,
    applicationId,
    definitionId,
    versionId,
    stageIds,
  };
}

async function seedPublishedBindings(
  query: WithdrawalPolicyQuery,
  { formId, formVersionId, rulesId, rulesVersionId, ownerId }: {
    formId: string;
    formVersionId: string;
    rulesId: string;
    rulesVersionId: string;
    ownerId: string;
  },
) {
  await query(
    `INSERT INTO app_form_definitions (id, code, name, created_by)
     VALUES ($1, $2, 'Withdrawal form', $3)`,
    [formId, `WITHDRAWAL_${formId.replaceAll("-", "")}`, ownerId],
  );
  await query(
    `INSERT INTO app_form_versions
      (id, form_definition_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [formVersionId, formId, ownerId],
  );
  await query(
    `UPDATE app_form_versions SET status = 'PUBLISHED', row_version = 2,
      published_by = $2, published_at = now() WHERE id = $1`,
    [formVersionId, ownerId],
  );
  await query(
    `INSERT INTO app_eligibility_rule_sets (id, code, name, created_by)
     VALUES ($1, $2, 'Withdrawal rules', $3)`,
    [rulesId, `WITHDRAWAL_${rulesId.replaceAll("-", "")}`, ownerId],
  );
  await query(
    `INSERT INTO app_eligibility_rule_set_versions
      (id, rule_set_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [rulesVersionId, rulesId, ownerId],
  );
  await query(
    `UPDATE app_eligibility_rule_set_versions SET status = 'PUBLISHED',
      row_version = 2, published_by = $2, published_at = now() WHERE id = $1`,
    [rulesVersionId, ownerId],
  );
}
