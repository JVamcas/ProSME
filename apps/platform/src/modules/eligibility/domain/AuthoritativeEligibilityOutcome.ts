import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type {
  EligibilityFinding,
  EligibilityRuleOutcome,
} from "./EligibilityEvaluation";
import type { EligibilityValueProvenance } from "./EligibilityDataResolution";

export type FinalScreeningOutcome = "ELIGIBLE" | "INELIGIBLE";

export type EligibilityContextReference = {
  applicationId: string;
  applicationRowVersion: number;
  businessProfileUpdatedAt: string;
  correlationId: string;
  fundingCallId: string;
  submissionSnapshotId?: string;
  submissionSnapshotIntegrityHash?: string;
};

export type AuthoritativeEligibilityOutcome = {
  applicationId: string;
  contextReference: EligibilityContextReference;
  eligible: boolean;
  evaluatedAt: Date;
  evaluatedBy: string;
  evaluatedValueProvenance: Record<string, EligibilityValueProvenance>;
  evaluatedValues: Record<string, JsonValue>;
  finalOutcome: FinalScreeningOutcome | null;
  hardFailures: EligibilityFinding[];
  id: string;
  evaluationNumber: number;
  manualScreeningRequired: boolean;
  ruleOutcomes: EligibilityRuleOutcome[];
  ruleSetVersionId: string;
  ruleSetVersionNumber: number;
  softFailures: EligibilityFinding[];
  warnings: EligibilityFinding[];
  workflowTaskId: string | null;
};
