import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { applicationDeclarationItems } from "@/modules/applications/ApplicationDeclarations";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import type { ConditionGroup, ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import { readEligibilityReadinessProjection } from "@/modules/eligibility/application/ServerEligibilityReadinessService";
import { listEligibilityInputs } from "@/modules/eligibility/infrastructure/EligibilityInputRepository";
import {
  buildEligibilityFieldRegistry,
  eligibilityFieldsForExecutionMode,
  type EligibilityFieldRegistry,
} from "@/modules/eligibility/domain/EligibilityFieldRegistry";
import { readFormReadinessProjection } from "@/modules/forms/application/ServerFormReadinessService";
import { readWorkflowReadinessProjection } from "@/modules/workflows/application/definitions/ServerWorkflowReadinessService";
import type { FundingCall } from "../domain/FundingCall";
import {
  type FundingCallReadinessIssue,
  type FundingCallReadinessIssueCode,
  type FundingCallReadinessReference,
  type FundingCallReadinessResult,
  validateFundingCallDetails,
} from "../domain/FundingCallReadiness";
import {
  readFundingCallById,
} from "../infrastructure/FundingCallRepository";
import { resolveFundingCallEligibilityContext } from "../ServerFundingCallEligibilityContextIntegration";
import {
  readFundingCallIdentifierConflicts,
  readFundingCallReadinessDocuments,
} from "../infrastructure/FundingCallReadinessRepository";

type FormProjection = NonNullable<Awaited<
  ReturnType<typeof readFormReadinessProjection>
>>;
type EligibilityProjection = NonNullable<Awaited<
  ReturnType<typeof readEligibilityReadinessProjection>
>>;
type WorkflowProjection = NonNullable<Awaited<
  ReturnType<typeof readWorkflowReadinessProjection>
>>;

function owner(
  kind: FundingCallReadinessReference["kind"],
  id: string,
): FundingCallReadinessReference {
  return { id, kind };
}

function issue(
  code: FundingCallReadinessIssueCode,
  message: string,
  location: string,
  reference: FundingCallReadinessReference,
): FundingCallReadinessIssue {
  return { code, location, message, owner: reference };
}

function versionIssues(
  call: FundingCall,
  form: FormProjection | null,
  eligibility: EligibilityProjection | null,
  workflow: WorkflowProjection | null,
) {
  const issues: FundingCallReadinessIssue[] = [];
  const bindings = [
    {
      id: call.formVersionId,
      inactiveCode: "FORM_DEFINITION_INACTIVE" as const,
      location: "formVersionId",
      missingCode: "FORM_VERSION_REQUIRED" as const,
      ownerKind: "FORM_VERSION" as const,
      projection: form,
      statusCode: "FORM_VERSION_NOT_PUBLISHED" as const,
      title: "application form",
    },
    {
      id: call.eligibilityRuleSetVersionId,
      inactiveCode: "ELIGIBILITY_DEFINITION_INACTIVE" as const,
      location: "eligibilityRuleSetVersionId",
      missingCode: "ELIGIBILITY_VERSION_REQUIRED" as const,
      ownerKind: "ELIGIBILITY_VERSION" as const,
      projection: eligibility,
      statusCode: "ELIGIBILITY_VERSION_NOT_PUBLISHED" as const,
      title: "eligibility ruleset",
    },
    {
      id: call.workflowTemplateVersionId,
      inactiveCode: "WORKFLOW_DEFINITION_INACTIVE" as const,
      location: "workflowTemplateVersionId",
      missingCode: "WORKFLOW_VERSION_REQUIRED" as const,
      ownerKind: "WORKFLOW_VERSION" as const,
      projection: workflow,
      statusCode: "WORKFLOW_VERSION_NOT_PUBLISHED" as const,
      title: "workflow template",
    },
  ];
  for (const binding of bindings) {
    if (!binding.id) {
      issues.push(issue(
        binding.missingCode,
        `Select an exact published ${binding.title} version.`,
        binding.location,
        owner("FUNDING_CALL", call.id),
      ));
    } else if (!binding.projection || binding.projection.status !== "PUBLISHED") {
      issues.push(issue(
        binding.statusCode,
        `The selected ${binding.title} version is not published.`,
        binding.location,
        owner(binding.ownerKind, binding.id),
      ));
    } else if (!binding.projection.active) {
      issues.push(issue(
        binding.inactiveCode,
        `The selected ${binding.title} belongs to an inactive configuration.`,
        binding.location,
        owner(binding.ownerKind, binding.id),
      ));
    }
  }
  return issues;
}

function asGroup(node: ConditionNode, ruleId: string): ConditionGroup {
  return node.kind === "GROUP"
    ? node
    : { children: [node], combinator: "AND", id: `readiness-${ruleId}`, kind: "GROUP" };
}

function eligibilityIssues(
  call: FundingCall,
  eligibility: EligibilityProjection | null,
  registry: EligibilityFieldRegistry | null,
) {
  if (!call.eligibilityRuleSetVersionId || !eligibility || !registry) return [];
  const reference = owner("ELIGIBILITY_VERSION", call.eligibilityRuleSetVersionId);
  const issues = registry.issues.map((registryIssue, index) => issue(
    "ELIGIBILITY_FIELD_INCOMPATIBLE",
    registryIssue.message,
    `eligibilityRegistry.${index}`,
    reference,
  ));
  issues.push(...eligibility.rules.flatMap((rule, ruleIndex) =>
    validateConditionGroup(
      asGroup(rule.conditionDefinition, rule.id),
      eligibilityFieldsForExecutionMode(registry.fields, rule.executionMode),
      conditionBuilderOperators,
    ).issues.map((validationIssue) => issue(
      "ELIGIBILITY_FIELD_INCOMPATIBLE",
      validationIssue.message,
      `rules.${ruleIndex}.condition${validationIssue.path.map((part) => `.children.${part}`).join("")}`,
      reference,
    ))
  ));
  return issues;
}

async function eligibilityRegistry(call: FundingCall) {
  if (!call.eligibilityRuleSetVersionId) return null;
  const [context, inputs] = await Promise.all([
    resolveFundingCallEligibilityContext(call),
    listEligibilityInputs(call.eligibilityRuleSetVersionId),
  ]);
  return buildEligibilityFieldRegistry({ contexts: [context], inputs });
}

function workflowIssues(
  call: FundingCall,
  workflow: WorkflowProjection | null,
) {
  if (!call.workflowTemplateVersionId || !workflow) return [];
  const reference = owner("WORKFLOW_VERSION", call.workflowTemplateVersionId);
  const issues = workflow.validation.errors.map((error) => issue(
    "WORKFLOW_CONFIGURATION_INVALID",
    error.message,
    error.path,
    reference,
  ));
  workflow.graph.stages.forEach((stage, stageIndex) => {
    if (!stage.enabled) return;
    if (
      !stage.publicStatusMapping.label.trim()
      || !stage.publicStatusMapping.description.trim()
    ) issues.push(issue(
      "APPLICANT_STATUS_MAPPING_MISSING",
      "Add a safe applicant-facing status label and description.",
      `stages.${stageIndex}.publicStatusMapping`,
      reference,
    ));
  });
  if (!workflow.graph.stages.some((stage) =>
    stage.enabled && stage.tasks.some((task) => task.type === "COMMUNICATION")
  )) issues.push(issue(
    "NOTIFICATION_HOOK_MISSING",
    "Add an enabled workflow communication task for applicant notifications.",
    "stages",
    reference,
  ));
  return issues;
}

function formConfigurationIssues(call: FundingCall, form: FormProjection | null) {
  const reference = call.formVersionId
    ? owner("FORM_VERSION", call.formVersionId)
    : owner("FUNDING_CALL", call.id);
  const issues: FundingCallReadinessIssue[] = [];
  if (!Boolean(applicationDeclarationItems.length)) issues.push(issue(
    "DECLARATIONS_NOT_CONFIGURED",
    "Configure the required applicant declarations.",
    "declarations",
    reference,
  ));
  if (form && !form.fields.some((field) =>
    field.type === "DOCUMENT" && field.required
  )) issues.push(issue(
    "DOCUMENT_REQUIREMENTS_NOT_CONFIGURED",
    "Add at least one required applicant document field.",
    "fields",
    reference,
  ));
  return issues;
}

function documentIssues(
  documents: Awaited<ReturnType<typeof readFundingCallReadinessDocuments>>,
) {
  return documents.flatMap((document, index) => {
    const reference = owner("PUBLIC_DOCUMENT", document.id);
    const location = `publicDocuments.${index}`;
    const issues: FundingCallReadinessIssue[] = [];
    if (!document.finalized) issues.push(issue(
      "PUBLIC_DOCUMENT_NOT_FINALIZED", "Finalize this public document.",
      `${location}.finalized`, reference,
    ));
    if (!document.securityCleared) issues.push(issue(
      "PUBLIC_DOCUMENT_NOT_SECURITY_CLEARED",
      "Complete security clearance for this public document.",
      `${location}.securityCleared`, reference,
    ));
    if (!document.markedForPublication || !document.publishedAt) issues.push(issue(
      "PUBLIC_DOCUMENT_NOT_MARKED_FOR_PUBLICATION",
      "Mark this document for publication and set its publication time.",
      `${location}.markedForPublication`, reference,
    ));
    if (!document.url.startsWith("https://") && !document.url.startsWith("/")) {
      issues.push(issue(
        "PUBLIC_DOCUMENT_URL_UNSAFE",
        "Use an HTTPS or platform-relative public document URL.",
        `${location}.url`, reference,
      ));
    }
    return issues;
  });
}

export async function validateFundingCallReadiness(
  call: FundingCall,
  now = new Date(),
): Promise<FundingCallReadinessResult> {
  const [form, eligibility, workflow, documents, conflicts, registry] = await Promise.all([
    call.formVersionId
      ? readFormReadinessProjection(call.formVersionId)
      : Promise.resolve(null),
    call.eligibilityRuleSetVersionId
      ? readEligibilityReadinessProjection(call.eligibilityRuleSetVersionId)
      : Promise.resolve(null),
    call.workflowTemplateVersionId
      ? readWorkflowReadinessProjection(call.workflowTemplateVersionId)
      : Promise.resolve(null),
    readFundingCallReadinessDocuments(call.id),
    readFundingCallIdentifierConflicts(call),
    eligibilityRegistry(call),
  ]);
  const issues = validateFundingCallDetails(call, now);
  if (conflicts.reference) issues.push(issue(
    "REFERENCE_NOT_UNIQUE", "Use a unique stable reference.", "reference",
    owner("FUNDING_CALL", call.id),
  ));
  if (conflicts.slug) issues.push(issue(
    "SLUG_NOT_UNIQUE", "Use a unique public slug.", "slug",
    owner("FUNDING_CALL", call.id),
  ));
  issues.push(
    ...versionIssues(call, form, eligibility, workflow),
    ...eligibilityIssues(call, eligibility, registry),
    ...workflowIssues(call, workflow),
    ...formConfigurationIssues(call, form),
    ...documentIssues(documents),
  );
  return {
    checkedAt: now.toISOString(),
    fundingCallId: call.id,
    issues,
    ready: issues.length === 0,
    rowVersion: call.rowVersion,
  };
}

export async function previewFundingCallReadiness(
  user: AuthenticatedUser | null,
  fundingCallId: string,
) {
  requirePermission(user, permissionCodes.fundingCallRead);
  const call = await readFundingCallById(fundingCallId);
  if (!call) throw new ResourceNotFoundError("funding call");
  return validateFundingCallReadiness(call);
}
