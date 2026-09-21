import "server-only";

import { z } from "zod";

import { richTextToPlainText } from "@/shared/utils/RichText";
import type { FundingCall } from "./domain/FundingCall";
import type {
  FundingOpportunityDetail,
  FundingOpportunityListInput,
  FundingOpportunityPage,
  FundingOpportunityStatus,
  FundingOpportunitySummary,
} from "./FundingOpportunityTypes";
import {
  readPublishedFundingCall,
  readPublishedFundingCalls,
} from "./infrastructure/FundingCallRepository";

const cursorSchema = z.object({
  id: z.uuid(),
  opensAt: z.iso.datetime(),
});

type FundingOpportunityCursor = z.infer<typeof cursorSchema>;

function opportunityStatus(call: FundingCall): FundingOpportunityStatus {
  if (call.status === "SCHEDULED") return "upcoming";
  if (call.status === "OPEN") return "open";
  return "closed";
}
function summary(call: FundingCall): FundingOpportunitySummary {
  return {
    closesAt: call.closesAt.toISOString(),
    id: call.id,
    maximumAmount: Number(call.maximumGrantAmount),
    minimumAmount: Number(call.minimumGrantAmount),
    opensAt: call.opensAt.toISOString(),
    slug: call.slug,
    status: opportunityStatus(call),
    summary: richTextToPlainText(call.description),
    title: call.title,
  };
}

function decodeCursor(value: string): FundingOpportunityCursor {
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
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

function encodeCursor(call: FundingCall) {
  return Buffer.from(
    JSON.stringify({ id: call.id, opensAt: call.opensAt.toISOString() }),
  ).toString("base64url");
}

const statuses = {
  closed: "CLOSED",
  open: "OPEN",
  upcoming: "SCHEDULED",
} as const;

export async function listPublishedFundingOpportunities(
  input: FundingOpportunityListInput,
): Promise<FundingOpportunityPage> {
  const cursor = input.after ? decodeCursor(input.after) : undefined;
  const result = await readPublishedFundingCalls({
    after: cursor
      ? { id: cursor.id, opensAt: new Date(cursor.opensAt) }
      : undefined,
    limit: input.limit,
    search: input.search,
    status: input.status ? statuses[input.status] : undefined,
  });
  const hasNextPage = result.items.length > input.limit;
  const calls = result.items.slice(0, input.limit);
  return {
    items: calls.map(summary),
    nextCursor: hasNextPage ? encodeCursor(calls.at(-1)!) : null,
    total: result.total,
  };
}

export async function findPublishedFundingOpportunity(
  id: string,
): Promise<FundingOpportunityDetail | null> {
  const call = await readPublishedFundingCall(id);
  return call ? { ...summary(call), description: call.description } : null;
}

export async function resolvePublishedApplicationFormBinding(id: string) {
  const call = await readPublishedFundingCall(id);
  if (!call) return null;
  return {
    eligibilityRuleSetVersionId: call.eligibilityRuleSetVersionId,
    formVersionId: call.formVersionId,
    id: call.id,
    status: opportunityStatus(call),
    title: call.title,
  };
}

export async function resolvePublishedEligibilityRuleSetBinding(id: string) {
  const call = await readPublishedFundingCall(id);
  if (!call) return null;
  return {
    eligibilityRuleSetVersionId: call.eligibilityRuleSetVersionId,
    fundingCallId: call.id,
    status: opportunityStatus(call),
  };
}
