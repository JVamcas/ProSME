import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import type { JsonPrimitive } from "@/modules/conditions/domain/Operand";

export const documentRequirementFactDefinitions = [
  { key: "present", label: "present", type: "BOOLEAN" },
  { key: "verified", label: "verified", type: "BOOLEAN" },
  {
    key: "verificationStatus",
    label: "verification status",
    type: "TEXT",
  },
  { key: "validUntil", label: "valid-until date", type: "DATE" },
  {
    key: "expiredAtEvaluation",
    label: "expired at evaluation",
    type: "BOOLEAN",
  },
  {
    key: "latestAcceptedVersionId",
    label: "latest accepted version identifier",
    type: "TEXT",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  type: ConditionFieldType;
}>;

export const checklistItemCompletionFactDefinition = {
  key: "completed",
  label: "completion status",
  type: "BOOLEAN",
} as const satisfies {
  key: string;
  label: string;
  type: ConditionFieldType;
};

export const checklistItemResponseFactKey = "response";

export type DocumentVerificationStatus =
  | "MISSING"
  | "PENDING"
  | "REJECTED"
  | "VERIFIED";

export type DocumentEvidenceVersionFactSource = {
  id: string;
  requirementId: string;
  validUntil: Date | null;
  verificationStatus: "REJECTED" | "VERIFIED" | null;
  versionNumber: number;
};

export type DocumentRequirementFacts = {
  expiredAtEvaluation: boolean;
  latestAcceptedVersionId: string | null;
  present: boolean;
  requirementId: string;
  validUntil: string | null;
  verificationStatus: DocumentVerificationStatus;
  verified: boolean;
};

export type ChecklistItemResponseFactSource = {
  completedAt: Date | null;
  itemDefinitionId: string;
  response: JsonPrimitive | undefined;
  taskId: string;
};

export type ChecklistItemFacts = {
  completed: boolean;
  itemDefinitionId: string;
  response: JsonPrimitive;
};

function newestDocumentVersion(
  versions: readonly DocumentEvidenceVersionFactSource[],
) {
  return [...versions].sort((left, right) =>
    right.versionNumber - left.versionNumber
  )[0];
}

function latestAcceptedVersion(
  versions: readonly DocumentEvidenceVersionFactSource[],
) {
  return newestDocumentVersion(
    versions.filter((version) => version.verificationStatus === "VERIFIED"),
  );
}

export function resolveDocumentRequirementFacts(
  requirementId: string,
  versions: readonly DocumentEvidenceVersionFactSource[],
  evaluatedAt: Date,
): DocumentRequirementFacts {
  const matching = versions.filter((version) =>
    version.requirementId === requirementId
  );
  const current = newestDocumentVersion(matching);
  const accepted = latestAcceptedVersion(matching);
  const verificationStatus = current?.verificationStatus ?? (
    current ? "PENDING" : "MISSING"
  );
  return {
    expiredAtEvaluation: Boolean(
      current?.validUntil
      && current.validUntil.getTime() <= evaluatedAt.getTime(),
    ),
    latestAcceptedVersionId: accepted?.id ?? null,
    present: Boolean(current),
    requirementId,
    validUntil: current?.validUntil?.toISOString() ?? null,
    verificationStatus,
    verified: verificationStatus === "VERIFIED",
  };
}

export function resolveChecklistItemFacts(
  itemDefinitionId: string,
  attempts: readonly ChecklistItemResponseFactSource[],
): ChecklistItemFacts {
  const latest = attempts
    .filter((attempt) => attempt.itemDefinitionId === itemDefinitionId)
    .toSorted((left, right) =>
      (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0)
    )[0];
  const completed = Boolean(
    latest?.completedAt && latest.response !== undefined,
  );
  return {
    completed,
    itemDefinitionId,
    response: completed ? latest!.response! : null,
  };
}
