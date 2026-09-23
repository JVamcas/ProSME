import "server-only";

import type { JsonValue } from "@/modules/conditions/domain/Operand";
import {
  type ApplicationSubmissionSnapshotContent,
  verifySubmissionSnapshotIntegrity,
} from "@/modules/applications/domain/ApplicationSubmissionSnapshot";
import type { AuthoritativeEligibilityTransaction } from "../infrastructure/AuthoritativeEligibilityRepository";
import {
  AuthoritativeEligibilityUnavailableError,
  prepareAuthoritativeEligibilityOutcome,
} from "./ServerAuthoritativeEligibilityService";

type SubmissionAuthoritativeOutcomeInput = {
  actorId: string;
  applicationId: string;
  applicationRowVersion: number;
  correlationId: string;
  evaluatedAt: Date;
  evaluationNumber: number;
  snapshot: {
    canonicalContent: string;
    id: string;
    integrityHash: string;
    snapshotContent: ApplicationSubmissionSnapshotContent;
  };
  workflowTaskId: string | null;
};

function snapshotRecord(value: unknown): Record<string, JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, JsonValue>
    : {};
}

export async function prepareSubmissionAuthoritativeEligibilityOutcome(
  transaction: AuthoritativeEligibilityTransaction,
  input: SubmissionAuthoritativeOutcomeInput,
) {
  if (!verifySubmissionSnapshotIntegrity(input.snapshot)) {
    throw new AuthoritativeEligibilityUnavailableError(
      "The submission snapshot failed integrity verification.",
    );
  }
  const content = input.snapshot.snapshotContent;
  const application = snapshotRecord(content.application);
  const business = snapshotRecord(content.business);
  const fundingCall = snapshotRecord(content.fundingCall);
  const terms = snapshotRecord(fundingCall.terms);
  const normalizedValues = snapshotRecord(content.form.normalizedValues);
  const result = await prepareAuthoritativeEligibilityOutcome(transaction, {
    actorId: input.actorId,
    application: {
      businessSection: {
        ...normalizedValues,
        ...snapshotRecord(application.businessSection),
      },
      declarationsSection: snapshotRecord(application.declarationsSection),
      eligibilityRuleSetVersionId: content.eligibilityRuleSetVersionId,
      financialSection: snapshotRecord(application.financialSection),
      formVersionId: content.form.versionId,
      id: input.applicationId,
      projectSection: snapshotRecord(application.projectSection),
      rowVersion: input.applicationRowVersion,
    },
    business: {
      employeeCount: typeof business.employeeCount === "number"
        ? business.employeeCount
        : null,
      establishedYear: typeof business.establishedYear === "number"
        ? business.establishedYear
        : null,
      registrationNumber: String(business.registrationNumber ?? ""),
      updatedAt: new Date(String(business.updatedAt)),
    },
    correlationId: input.correlationId,
    evaluatedAt: input.evaluatedAt,
    evaluationNumber: input.evaluationNumber,
    fundingCall: {
      closesAt: new Date(String(terms.closesAt)),
      eligibilityRuleSetVersionId: content.eligibilityRuleSetVersionId,
      fundingInstrument: typeof terms.fundingInstrument === "string"
        ? terms.fundingInstrument
        : null,
      id: String(fundingCall.id),
      maximumGrantAmount: String(terms.maximumGrantAmount),
      minimumGrantAmount: String(terms.minimumGrantAmount),
      opensAt: new Date(String(terms.opensAt)),
      slug: String(terms.slug),
      status: String(fundingCall.statusAtSubmission),
      thematicArea: typeof terms.thematicArea === "string"
        ? terms.thematicArea
        : null,
      title: String(terms.title),
      totalBudgetEnvelope: String(terms.totalBudgetEnvelope),
    },
    workflowTaskId: input.workflowTaskId,
  });
  return {
    ...result,
    contextReference: {
      ...result.contextReference,
      submissionSnapshotId: input.snapshot.id,
      submissionSnapshotIntegrityHash: input.snapshot.integrityHash,
    },
  };
}
