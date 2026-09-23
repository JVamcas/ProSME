import "server-only";

import { z } from "zod";

import type { findOwnedApplication } from "@/modules/applications/infrastructure/ApplicationRepository";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
} from "./ApplicationSchemas";
import type { ApplicationSummary, ApplicationView } from "./ApplicationTypes";
import type { ApplicationLifecycleStatus } from "./domain/Application";

const cursorSchema = z.object({
  id: z.uuid(),
  updatedAt: z.iso.datetime(),
});

export type ApplicationSummaryRecord = {
  businessName?: string | null;
  createdAt: Date;
  currentSection: ApplicationSection;
  fundingOpportunityId: string;
  fundingOpportunityTitle: string;
  id: string;
  sectionCompletion: ApplicationSectionCompletion;
  status: ApplicationLifecycleStatus;
  updatedAt: Date;
};

function progress(completion: ApplicationSectionCompletion) {
  const completed = Object.values(completion).filter(Boolean).length;
  return Math.round((completed / 5) * 100);
}

export function toApplicationSummary(
  application: ApplicationSummaryRecord,
): ApplicationSummary {
  return {
    businessName: application.businessName ?? null,
    createdAt: application.createdAt.toISOString(),
    currentSection: application.currentSection,
    fundingOpportunityId: application.fundingOpportunityId,
    fundingOpportunityTitle: application.fundingOpportunityTitle,
    id: application.id,
    progressPercent: progress(application.sectionCompletion),
    status: application.status,
    updatedAt: application.updatedAt.toISOString(),
  };
}

export function decodeApplicationCursor(value: string) {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = cursorSchema.parse(JSON.parse(decoded));
    return {
      id: parsed.id,
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    throw new z.ZodError([
      {
        code: "custom",
        message: "The pagination cursor is invalid.",
        path: ["after"],
      },
    ]);
  }
}

export function encodeApplicationCursor(application: ApplicationSummaryRecord) {
  const value = {
    id: application.id,
    updatedAt: application.updatedAt.toISOString(),
  };
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function toApplicationView(
  application: NonNullable<Awaited<ReturnType<typeof findOwnedApplication>>>,
): ApplicationView {
  if (!application.formVersionId) {
    throw new Error("Application is missing its bound form version.");
  }
  if (!application.eligibilityRuleSetVersionId) {
    throw new Error("Application is missing its bound eligibility version.");
  }
  return {
    ...toApplicationSummary(application),
    businessSection: application.businessSection,
    declarationsSection: application.declarationsSection,
    financialSection: application.financialSection,
    eligibilityRuleSetVersionId: application.eligibilityRuleSetVersionId,
    formVersionId: application.formVersionId,
    projectSection: application.projectSection,
    rowVersion: application.rowVersion,
    sectionCompletion: application.sectionCompletion,
  };
}
