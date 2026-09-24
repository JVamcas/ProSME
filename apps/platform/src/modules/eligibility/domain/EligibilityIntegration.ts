import type { ConditionFieldType } from "@/modules/conditions/domain/ConditionConfiguration";
import type { JsonValue } from "@/modules/conditions/domain/Operand";

export const eligibilityIntegrationVersionStatuses = [
  "DRAFT",
  "PUBLISHED",
  "RETIRED",
] as const;
export type EligibilityIntegrationVersionStatus =
  (typeof eligibilityIntegrationVersionStatuses)[number];

export const eligibilityIntegrationResultStatuses = [
  "SUCCEEDED",
  "NEGATIVE",
  "UNAVAILABLE",
  "TIMED_OUT",
] as const;
export type EligibilityIntegrationResultStatus =
  (typeof eligibilityIntegrationResultStatuses)[number];

export type EligibilityIntegrationOutputDefinition = {
  description: string;
  eligibleForScreening: boolean;
  key: string;
  label: string;
  type: ConditionFieldType;
};

export type EligibilityIntegrationExecutionPolicy = {
  initialBackoffMs: number;
  maxAttempts: number;
  timeoutMs: number;
};

export type EligibilityIntegrationRawResponsePolicy =
  | { kind: "DISCARD" }
  | { kind: "RETAIN"; retentionDays: number };

export type EligibilityIntegrationVersion = {
  definitionId: string;
  id: string;
  outputSchema: EligibilityIntegrationOutputDefinition[];
  rawResponsePolicy: EligibilityIntegrationRawResponsePolicy;
  retryPolicy: EligibilityIntegrationExecutionPolicy;
  status: EligibilityIntegrationVersionStatus;
  versionNumber: number;
};

export type EligibilityIntegrationBinding = {
  fundingCallId: string;
  id: string;
  integrationVersion: EligibilityIntegrationVersion;
  manualFallbackAllowed: boolean;
  providerAdapterKey: string;
  providerDisplayName: string;
  secretReference: string | null;
  workflowTemplateVersionId: string;
};

export type EligibilityIntegrationAdapterRequest = {
  applicationId: string;
  fundingCallId: string;
  secretReference: string | null;
  signal: AbortSignal;
};

export type EligibilityIntegrationAdapterResult = {
  normalizedOutputs: Readonly<Record<string, JsonValue>>;
  rawResponse?: JsonValue;
  status: "SUCCEEDED" | "NEGATIVE";
};

export interface EligibilityIntegrationProviderAdapter {
  readonly key: string;
  execute(
    request: EligibilityIntegrationAdapterRequest,
  ): Promise<EligibilityIntegrationAdapterResult>;
}

export type EligibilityIntegrationExecutionResult = {
  attemptCount: number;
  failureMessage: string | null;
  normalizedOutputs: Readonly<Record<string, JsonValue>>;
  rawResponse: JsonValue | null;
  status: EligibilityIntegrationResultStatus;
};

export class EligibilityIntegrationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EligibilityIntegrationUnavailableError";
  }
}
