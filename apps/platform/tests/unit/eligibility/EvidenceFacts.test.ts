import { describe, expect, it } from "vitest";

import type { Condition } from "@/modules/conditions/domain/Condition";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { evaluateCondition } from "@/modules/conditions/engine/ConditionEngine";
import {
  resolveChecklistItemFacts,
  resolveDocumentRequirementFacts,
  type DocumentEvidenceVersionFactSource,
} from "@/modules/workflows/domain/EvidenceFacts";

const requirementId = "10000000-0000-4000-8000-000000000001";
const firstVersionId = "10000000-0000-4000-8000-000000000002";
const secondVersionId = "10000000-0000-4000-8000-000000000003";
const evaluatedAt = new Date("2026-09-22T12:00:00.000Z");

function version(
  overrides: Partial<DocumentEvidenceVersionFactSource> = {},
): DocumentEvidenceVersionFactSource {
  return {
    id: firstVersionId,
    requirementId,
    validUntil: new Date("2026-10-01T00:00:00.000Z"),
    verificationStatus: null,
    versionNumber: 1,
    ...overrides,
  };
}

function factCondition(
  key: string,
  expected: string | boolean,
): Condition {
  return {
    id: "10000000-0000-4000-8000-000000000004",
    kind: "CONDITION",
    leftOperand: { key, kind: "FIELD" },
    operator: basicOperators.EQUALS,
    rightOperand: { kind: "CONSTANT", value: expected },
  };
}

describe("generic Eligibility evidence facts", () => {
  it("distinguishes missing evidence from a pending verification", () => {
    const missing = resolveDocumentRequirementFacts(
      requirementId,
      [],
      evaluatedAt,
    );
    const pending = resolveDocumentRequirementFacts(
      requirementId,
      [version()],
      evaluatedAt,
    );

    expect(missing).toMatchObject({
      present: false,
      verificationStatus: "MISSING",
      verified: false,
    });
    expect(pending).toMatchObject({
      present: true,
      verificationStatus: "PENDING",
      verified: false,
    });
  });

  it("calculates validity and expiry at the authoritative timestamp", () => {
    const valid = resolveDocumentRequirementFacts(
      requirementId,
      [version({ verificationStatus: "VERIFIED" })],
      evaluatedAt,
    );
    const expired = resolveDocumentRequirementFacts(
      requirementId,
      [version({ validUntil: new Date("2026-09-01T00:00:00.000Z") })],
      evaluatedAt,
    );

    expect(valid).toMatchObject({
      expiredAtEvaluation: false,
      latestAcceptedVersionId: firstVersionId,
      verified: true,
    });
    expect(expired.expiredAtEvaluation).toBe(true);
  });

  it("keeps a replaced document version and its verification distinct", () => {
    const facts = resolveDocumentRequirementFacts(
      requirementId,
      [
        version({ verificationStatus: "VERIFIED" }),
        version({
          id: secondVersionId,
          validUntil: null,
          versionNumber: 2,
        }),
      ],
      evaluatedAt,
    );

    expect(facts).toMatchObject({
      latestAcceptedVersionId: firstVersionId,
      present: true,
      verificationStatus: "PENDING",
      verified: false,
    });
  });

  it("exposes checklist response and completion by immutable item identity", () => {
    const itemDefinitionId = "10000000-0000-4000-8000-000000000005";
    const facts = resolveChecklistItemFacts(itemDefinitionId, [{
      completedAt: evaluatedAt,
      itemDefinitionId,
      response: true,
      taskId: "10000000-0000-4000-8000-000000000006",
    }]);

    expect(facts).toEqual({
      completed: true,
      itemDefinitionId,
      response: true,
    });
  });

  it("feeds typed facts to the shared Conditions Engine", () => {
    const facts = resolveDocumentRequirementFacts(
      requirementId,
      [version({ verificationStatus: "VERIFIED" })],
      evaluatedAt,
    );
    const result = evaluateCondition(
      factCondition("evidence.verified", true),
      { "evidence.verified": facts.verified },
    );

    expect(result).toMatchObject({ error: null, passed: true });
  });
});
