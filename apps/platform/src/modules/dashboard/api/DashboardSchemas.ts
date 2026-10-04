import { z } from "zod";

import { adminDashboardPeriods } from "../AdminDashboardTypes";
import { workflowRfiStatuses } from "@/modules/workflows/domain/runtime/WorkflowRfi";

const count = z.number().int().nonnegative();
const activity = z.object({
  applicationId: z.uuid(),
  applicationReference: z.string(),
  eventCode: z.string(),
  occurredAt: z.iso.datetime({ offset: true }),
});

export const dashboardPeriodSchema = z.enum(adminDashboardPeriods);
export const dashboardRequestSchema = z
  .object({
    period: dashboardPeriodSchema.default("30"),
  })
  .strict();

export const adminDashboardSchema = z.object({
  activities: z.array(activity.extend({ actorName: z.string() })),
  metrics: z.object({
    informationRequests: count,
    pendingDecision: count,
    totalApplications: count,
    underReview: count,
  }),
  period: dashboardPeriodSchema,
  statuses: z.array(z.object({ count, label: z.string() })),
  visibility: z.enum(["all", "assigned", "none"]),
});

export const applicantDashboardSchema = z.object({
  activities: z.array(activity.extend({ fundingOpportunityTitle: z.string() })),
  displayName: z.string(),
  metrics: z.object({
    actionRequired: count,
    applicationsInProgress: count,
    openFundingOpportunities: count,
    submittedApplications: count,
  }),
  urgentRequests: z.array(
    z.object({
      applicationId: z.uuid(),
      applicationReference: z.string(),
      applicationTitle: z.string(),
      createdAt: z.iso.datetime({ offset: true }),
      deadlineAt: z.iso.datetime({ offset: true }),
      id: z.uuid(),
      instructions: z.string(),
      isOverdue: z.boolean(),
      question: z.string(),
      respondedAt: z.iso.datetime({ offset: true }).nullable(),
      rowVersion: z.number().int().positive(),
      status: z.enum(workflowRfiStatuses),
      taskId: z.uuid(),
    }),
  ),
});
