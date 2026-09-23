import "server-only";

import {
  attachedBusinessFieldDefinitions,
  attachedBusinessSourceDefinitionId,
} from "@/modules/applications/domain/AttachedApplicationForm";
import type { EligibilityFieldRegistryContext } from "@/modules/eligibility/domain/EligibilityFieldRegistry";
import { fundingCallEligibilitySourceDefinitions } from "./domain/FundingCallEligibilitySources";
import { readEligibilityFormSources } from "@/modules/forms/infrastructure/EligibilityFormSourceRepository";
import { readWorkflowEligibilitySources } from "@/modules/workflows/infrastructure/WorkflowEligibilitySourceRepository";
import { readEligibilityRuleSetContexts } from "./infrastructure/FundingCallEligibilityContextRepository";
import { readFundingCallById } from "./infrastructure/FundingCallRepository";
import { readEligibilityIntegrationSources } from "@/modules/eligibility/infrastructure/EligibilityIntegrationRepository";
import { integrationOutputSourceDescriptors } from "@/modules/eligibility/domain/EligibilityIntegrationFieldSources";

type EligibilityContextBinding = {
  formVersionId: string | null;
  id: string;
  title: string;
  workflowTemplateVersionId: string | null;
};

async function resolveContexts(calls: readonly EligibilityContextBinding[]) {
  const formVersionIds = [...new Set(calls.flatMap((call) =>
    call.formVersionId ? [call.formVersionId] : []
  ))];
  const workflowVersionIds = [...new Set(calls.flatMap((call) =>
    call.workflowTemplateVersionId ? [call.workflowTemplateVersionId] : []
  ))];
  const [formSources, workflowSources, integrationSources] = await Promise.all([
    readEligibilityFormSources(formVersionIds),
    readWorkflowEligibilitySources(workflowVersionIds),
    readEligibilityIntegrationSources(calls.map((call) => call.id)),
  ]);
  return calls.map((call): EligibilityFieldRegistryContext => ({
    fundingCallId: call.id,
    fundingCallTitle: call.title,
    sources: [
      ...fundingCallEligibilitySourceDefinitions.map((source) => ({
        availableBeforeEligibility: true,
        fundingCallId: call.id,
        label: source.label,
        sourceDefinitionId: call.id,
        sourceKey: source.key,
        sourceKind: "FUNDING_CALL_FIELD" as const,
        sourceVersionId: null,
        supportedTypes: [source.type],
      })),
      ...(call.formVersionId
        ? attachedBusinessFieldDefinitions(call.id).map((field) => ({
            availableBeforeEligibility: true,
            fundingCallId: call.id,
            label: field.label,
            sourceDefinitionId: attachedBusinessSourceDefinitionId,
            sourceKey: field.key,
            sourceKind: "APPLICATION_FORM_FIELD" as const,
            sourceVersionId: null,
            supportedTypes: [field.type === "NUMBER" ? "NUMBER" as const : "TEXT" as const],
          }))
        : []),
      ...formSources
        .filter((source) => source.versionId === call.formVersionId)
        .map((source) => ({
          availableBeforeEligibility: true,
          fundingCallId: call.id,
          label: source.label,
          sourceDefinitionId: source.id,
          sourceKey: source.key,
          sourceKind: "APPLICATION_FORM_FIELD" as const,
          sourceVersionId: source.versionId,
          supportedTypes: [source.type],
        })),
      ...workflowSources
        .filter((source) =>
          source.workflowVersionId === call.workflowTemplateVersionId
        )
        .map((source) => ({ ...source, fundingCallId: call.id })),
      ...integrationOutputSourceDescriptors(call.id, integrationSources),
    ],
  }));
}

export async function resolveEligibilityRuleSetContexts(versionId: string) {
  return resolveContexts(await readEligibilityRuleSetContexts(versionId));
}

export async function resolveFundingCallEligibilityContext(
  call: EligibilityContextBinding,
) {
  const [context] = await resolveContexts([call]);
  return context;
}

export async function resolveEligibilityTestFundingCall(
  fundingCallId: string,
  eligibilityVersionId: string,
) {
  const call = await readFundingCallById(fundingCallId);
  if (call?.eligibilityRuleSetVersionId !== eligibilityVersionId) return null;
  return call;
}
