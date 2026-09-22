import "server-only";

import { z } from "zod";

import { richTextToPlainText } from "@/shared/utils/RichText";
import type { FundingCall } from "./domain/FundingCall";
import { isFundingCallEffectivelyOpen } from "./domain/FundingCallLifecycle";
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

function opportunityStatus(
  call: FundingCall,
  now: Date,
): FundingOpportunityStatus {
  if (isFundingCallEffectivelyOpen(call, now)) return "open";
  if (call.status === "SCHEDULED" && now < call.opensAt) return "upcoming";
  return "closed";
}
function summary(call: FundingCall, now: Date): FundingOpportunitySummary {
  return {
    closesAt: call.closesAt.toISOString(),
    id: call.id,
    maximumAmount: Number(call.maximumGrantAmount),
    minimumAmount: Number(call.minimumGrantAmount),
    opensAt: call.opensAt.toISOString(),
    slug: call.slug,
    status: opportunityStatus(call, now),
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

export async function listPublishedFundingOpportunities(
  input: FundingOpportunityListInput,
): Promise<FundingOpportunityPage> {
  const now = new Date();
  const cursor = input.after ? decodeCursor(input.after) : undefined;
  const result = await readPublishedFundingCalls({
    after: cursor
      ? { id: cursor.id, opensAt: new Date(cursor.opensAt) }
      : undefined,
    limit: input.limit,
    now,
    search: input.search,
    status: input.status,
  });
  const hasNextPage = result.items.length > input.limit;
  const calls = result.items.slice(0, input.limit);
  return {
    items: calls.map((call) => summary(call, now)),
    nextCursor: hasNextPage ? encodeCursor(calls.at(-1)!) : null,
    total: result.total,
  };
}

export async function findPublishedFundingOpportunity(
  id: string,
): Promise<FundingOpportunityDetail | null> {
  const call = await readPublishedFundingCall(id);
  return call
    ? { ...summary(call, new Date()), description: call.description }
    : null;
}

export async function resolvePublishedApplicationFormBinding(id: string) {
  const call = await readPublishedFundingCall(id);
  if (!call) return null;
  return {
    eligibilityRuleSetVersionId: call.eligibilityRuleSetVersionId,
    formVersionId: call.formVersionId,
    id: call.id,
    status: opportunityStatus(call, new Date()),
    title: call.title,
  };
}

export async function resolvePublishedEligibilityRuleSetBinding(id: string) {
  const call = await readPublishedFundingCall(id);
  if (!call) return null;
  return {
    eligibilityRuleSetVersionId: call.eligibilityRuleSetVersionId,
    formVersionId: call.formVersionId,
    fundingCallId: call.id,
    status: opportunityStatus(call, new Date()),
  };
}
