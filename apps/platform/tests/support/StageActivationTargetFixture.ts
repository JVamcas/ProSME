import type { StageActivationTarget } from "@/modules/workflows/infrastructure/StageActivationRepository";

export const stageActivationTarget: StageActivationTarget = {
  application: {},
  applicationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  applicationReference: "SME Fund-2026-001",
  eligibility: { eligible: true, outcome: "ELIGIBLE" },
  entryCondition: null,
  fundingCall: {},
  fundingOpportunityTitle: "Growth Fund",
  joinPredecessorStageKeys: ["TECHNICAL_ASSESSMENT", "FINANCIAL_REVIEW"],
  repeatable: false,
  slaHours: 24,
  stageDefinitionId: "44444444-4444-4444-8444-444444444444",
  stageKey: "SCREENING",
  stageName: "Screening",
  publicStatus: {
    status: "UNDER_REVIEW",
    label: "Under review",
    description: "Your application is under review.",
  },
  workflowInstanceId: "33333333-3333-4333-8333-333333333333",
};
