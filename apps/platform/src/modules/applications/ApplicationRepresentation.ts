import "server-only";

import { z } from "zod";

import type { findOwnedApplication } from "@/db/repositories/ApplicationRepository";
import type {
  ApplicationSection,
  ApplicationSectionCompletion,
} from "./ApplicationSchemas";
import type { ApplicationSummary, ApplicationView } from "./ApplicationTypes";

const cursorSchema = z.object({
  id: z.uuid(),
  updatedAt: z.iso.datetime(),
});

export type ApplicationSummaryRecord = {
  createdAt: Date;
  currentSection: ApplicationSection;
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  id: string;
  sectionCompletion: ApplicationSectionCompletion;
  status: "draft";
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
  return {
    ...toApplicationSummary(application),
    businessSection: application.businessSection,
    declarationsSection: application.declarationsSection,
    financialSection: application.financialSection,
    projectSection: application.projectSection,
    rowVersion: application.rowVersion,
    sectionCompletion: application.sectionCompletion,
  };
}
