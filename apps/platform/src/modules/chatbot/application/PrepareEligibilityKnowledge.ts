import { publicEligibilityHref } from "@/modules/funding-calls/domain/PublicFundingCallLinks";
import { findConditionNode } from "@/modules/conditions/domain/ConditionTree";
import { deserializeConditionGroup } from "@/modules/conditions/domain/ConditionSerialization";
import type { FundingCallKnowledgeProjection } from "@/modules/funding-calls/application/ServerFundingCallKnowledgeService";
import type { PublicEligibilityKnowledge } from "@/modules/eligibility/application/ServerEligibilityKnowledgeService";
import {
  explainEligibilityCondition,
  EligibilityExplanationError,
} from "../engine/EligibilityExplanation";
import type {
  KnowledgeIssue,
  KnowledgeRecord,
  KnowledgeSource,
} from "../domain/ChatbotKnowledge";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";

const severity = {
  HARD_FAIL:
    "Mandatory requirement. If not met, the self-check reports a blocking failure.",
  SOFT_FAIL:
    "Review requirement. If not met, formal screening needs manual review.",
  WARNING: "Advisory criterion. If not met, the self-check reports a warning.",
};
const disclaimer =
  "This guidance is advisory only. Final eligibility is determined during formal screening.";

export function prepareEligibilityKnowledge(
  call: FundingCallKnowledgeProjection,
  data: PublicEligibilityKnowledge,
) {
  const records: KnowledgeRecord[] = [];
  const issues: KnowledgeIssue[] = [];
  const version = data.versions.find(
    (item) => item.id === call.eligibilityVersionId,
  );
  if (!version) {
    issues.push({
      recordId: `call:${call.id}`,
      code: "MISSING_SOURCE",
      message: "The publication's bound eligibility version is unavailable.",
    });
    return { records, issues, source: null };
  }
  const rules = data.rules.filter((rule) => rule.versionId === version.id);
  const inputs = data.inputs.filter((input) => input.versionId === version.id);
  const groups = data.groups.filter((group) =>
    rules.some((rule) => rule.conditionGroupId === group.id),
  );
  const source: KnowledgeSource = {
    kind: "eligibility",
    id: `${call.id}:${version.id}`,
    revision: version.id,
    fingerprint: knowledgeFingerprint({ version, rules, inputs, groups }),
    url: publicEligibilityHref(call.id),
    label: `Eligibility version ${version.versionNumber} for ${call.publicFields.title}`,
  };
  for (const rule of rules) {
    const id = `eligibility:${call.id}:${rule.id}`;
    try {
      const definition = groups.find(
        (group) => group.id === rule.conditionGroupId,
      )?.definition;
      if (!definition)
        throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
      const group = deserializeConditionGroup(definition);
      const node =
        rule.conditionKind === "GROUP"
          ? group
          : findConditionNode(group, rule.conditionId ?? "");
      if (!node || node.kind !== rule.conditionKind)
        throw new EligibilityExplanationError("UNSUPPORTED_CONDITION");
      const fields = call.publicFields;
      const publicCallFacts = {
        "fundingCall.minimumGrantAmount": {
          label: "The published minimum funding amount",
          value: fields.minimumGrantAmount,
        },
        "fundingCall.maximumGrantAmount": {
          label: "The published maximum funding amount",
          value: fields.maximumGrantAmount,
        },
        "fundingCall.totalBudgetEnvelope": {
          label: "The published funding envelope",
          value: fields.totalBudgetEnvelope,
        },
        "fundingCall.opensAt": {
          label: "The published opening date",
          value: fields.opensAt,
        },
        "fundingCall.closesAt": {
          label: "The published closing date",
          value: fields.closesAt,
        },
      };
      const explanation = explainEligibilityCondition(
        node,
        inputs,
        publicCallFacts,
      );
      records.push({
        id,
        kind: "eligibility-criterion",
        title: `${call.publicFields.title}: criterion ${rule.order}`,
        source,
        scope: { fundingCallId: call.id, rulesetVersionId: version.id },
        facts: { failureType: rule.failureType, disclaimer },
        text: `${severity[rule.failureType]}\n\n${explanation}\n\nIf not met: ${rule.applicantMessage}\n\n${disclaimer}`,
      });
    } catch (error) {
      const code =
        error instanceof EligibilityExplanationError
          ? error.code
          : "UNSUPPORTED_CONDITION";
      issues.push({
        recordId: id,
        code,
        message:
          error instanceof EligibilityExplanationError
            ? error.message
            : "An invalid condition reference requires correction in the public source.",
      });
    }
  }
  if (!rules.length) {
    issues.push({
      recordId: `call:${call.id}`,
      code: "MISSING_DATA",
      message: "The bound ruleset contains no public self-check guidance.",
    });
  }
  return { records, issues, source };
}
