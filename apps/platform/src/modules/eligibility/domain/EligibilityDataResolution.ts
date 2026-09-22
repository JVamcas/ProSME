import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityInputDefinition,
  EligibilityScreeningSourceKind,
} from "./EligibilityInputDefinition";

export const eligibilityValueResolutionStatuses = [
  "RESOLVED",
  "MISSING",
  "UNAVAILABLE",
  "INVALID",
] as const;

export type EligibilityValueResolutionStatus =
  (typeof eligibilityValueResolutionStatuses)[number];

export type EligibilityValueProvenance = {
  evaluatedAt: string;
  inputDefinitionId: string;
  inputStableKey: string;
  mode: "SCREENING";
  sourceDefinitionId: string;
  sourceKey: string;
  sourceKind: EligibilityScreeningSourceKind;
  sourceRecordId: string;
  sourceVersionId: string | null;
};

type EligibilityResolvedValue = {
  provenance: EligibilityValueProvenance | null;
  status: "RESOLVED";
  value: JsonValue;
};

type EligibilityUnresolvedValue = {
  message: string;
  provenance: null;
  status: Exclude<EligibilityValueResolutionStatus, "RESOLVED">;
  value: null;
};

export type EligibilityValueResolution = {
  inputDefinitionId: string;
  path: string;
  stableKey: string;
} & (EligibilityResolvedValue | EligibilityUnresolvedValue);

export type EligibilityResolvedData = {
  provenance: Record<string, EligibilityValueProvenance>;
  resolutions: EligibilityValueResolution[];
  values: Record<string, JsonValue>;
};

export type EligibilityScreeningSourceValue = {
  sourceRecordId: string;
  value: JsonValue;
};

export type EligibilityScreeningSourceResolution =
  | {
      status: "RESOLVED";
      value: EligibilityScreeningSourceValue;
    }
  | {
      message: string;
      status: "MISSING" | "UNAVAILABLE" | "INVALID";
    };

export type EligibilityScreeningSourceRequest = {
  applicationId: string;
  binding: NonNullable<EligibilityInputDefinition["screening"]>;
  evaluatedAt: Date;
  input: EligibilityInputDefinition;
};

export interface EligibilityScreeningSourceAdapter {
  readonly sourceKind: EligibilityScreeningSourceKind;
  resolve(
    requests: readonly EligibilityScreeningSourceRequest[],
  ): Promise<ReadonlyMap<string, EligibilityScreeningSourceResolution>>;
}

export class EligibilityInputResolutionError extends Error {
  readonly resolutions: EligibilityValueResolution[];

  constructor(resolutions: EligibilityValueResolution[]) {
    const detail = resolutions
      .map((resolution) => `${resolution.path}: ${resolution.status}`)
      .join(", ");
    super(`Eligibility input resolution failed. ${detail}`);
    this.name = "EligibilityInputResolutionError";
    this.resolutions = resolutions;
  }
}
