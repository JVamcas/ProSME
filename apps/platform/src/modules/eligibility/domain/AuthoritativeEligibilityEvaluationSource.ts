import type { JsonValue } from "@/modules/conditions/domain/Operand";

export type FundingCallEvaluationSource = {
  closesAt: Date;
  eligibilityRuleSetVersionId: string | null;
  fundingInstrument: string | null;
  id: string;
  maximumGrantAmount: string;
  minimumGrantAmount: string;
  opensAt: Date;
  slug: string;
  status: string;
  thematicArea: string | null;
  title: string;
  totalBudgetEnvelope: string;
};

export type ApplicationEvaluationSource = {
  businessSection?: Record<string, JsonValue>;
  declarationsSection: { compliance?: boolean };
  eligibilityRuleSetVersionId: string | null;
  financialSection: { amountRequested?: number };
  formVersionId?: string | null;
  id: string;
  projectSection?: Record<string, JsonValue>;
  rowVersion: number;
};

export type BusinessEvaluationSource = {
  employeeCount: number | null;
  establishedYear: number | null;
  registrationNumber: string;
  updatedAt: Date;
};

export type CreateAuthoritativeOutcomeInput = {
  actorId: string;
  application: ApplicationEvaluationSource;
  business: BusinessEvaluationSource;
  correlationId: string;
  evaluatedAt: Date;
  evaluationNumber: number;
  fundingCall: FundingCallEvaluationSource;
  workflowTaskId: string | null;
};

