import type {
  FundingCallCreationProgressValues,
  FundingCallCreationStep,
} from "../api/FundingCallSchemas";

export type FundingCallCreationProgress = {
  createdAt: Date;
  currentStep: FundingCallCreationStep;
  id: string;
  ownerId: string;
  rowVersion: number;
  updatedAt: Date;
  values: FundingCallCreationProgressValues;
};
