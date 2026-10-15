import { z } from "zod";

export const workflowStageFunnelQuerySchema = z.object({
  stageKey: z.string().trim().min(1).max(120),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type WorkflowStageFunnelQuery = z.output<
  typeof workflowStageFunnelQuerySchema
>;

export type WorkflowStageFunnelCount = {
  stageKey: string;
  name: string;
  sequence: number;
  count: number;
};

export type WorkflowStageFunnelSummary = {
  fundingCallTitle: string;
  stages: WorkflowStageFunnelCount[];
};

export type WorkflowStageApplication = {
  applicationId: string;
  reference: string;
  applicantName: string;
  businessName: string | null;
  legalName: string | null;
  registrationNumber: string | null;
  businessType: string | null;
  sector: string | null;
  region: string | null;
  reachedAt: string;
  submittedAt: string | null;
  fundingCallTitle: string;
  stageName: string;
  iterationNumber: number;
  averageScore: number | null;
  scoreMaximum: number | null;
  scoreUnit: "POINTS" | "PERCENTAGE" | null;
  comments: string | null;
};

export type WorkflowStageApplicationPage = {
  items: WorkflowStageApplication[];
  total: number;
  page: number;
  pageSize: number;
};
