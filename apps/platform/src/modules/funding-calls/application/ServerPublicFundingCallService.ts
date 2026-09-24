import "server-only";

import { z } from "zod";

import { ResourceNotFoundError } from "@/lib/resource-errors";
import { richTextToPlainText } from "@/shared/utils/RichText";
import type {
  PublicFundingCallDetail,
  PublicFundingCallListInput,
  PublicFundingCallPage,
  PublicFundingCallStatus,
  PublicFundingCallSummary,
} from "../api/PublicFundingCallTransport";
import {
  readPublicFundingCallById,
  readPublicFundingCallBySlug,
  readPublicFundingCalls,
  type PublicFundingCallRecord,
} from "../infrastructure/FundingCallRepository";

const cursorSchema = z.object({
  id: z.uuid(),
  opensAt: z.iso.datetime(),
});

type Cursor = z.infer<typeof cursorSchema>;

export class PublicFundingCallNotFoundError extends ResourceNotFoundError {
  constructor() {
    super("funding call");
    this.name = "PublicFundingCallNotFoundError";
  }
}

export function publicFundingCallStatus(
  call: Pick<PublicFundingCallRecord, "closesAt" | "opensAt" | "status">,
  now: Date,
): PublicFundingCallStatus {
  if (call.status === "CLOSED" || now >= call.closesAt) return "closed";
  if (now < call.opensAt) return "upcoming";
  return "open";
}

function summary(
  call: PublicFundingCallRecord,
  now: Date,
): PublicFundingCallSummary {
  const status = publicFundingCallStatus(call, now);
  return {
    applicationsOpen: status === "open",
    closesAt: call.closesAt.toISOString(),
    fundingInstrument: call.fundingInstrument,
    id: call.id,
    maximumAmount: Number(call.maximumGrantAmount),
    minimumAmount: Number(call.minimumGrantAmount),
    opensAt: call.opensAt.toISOString(),
    reference: call.reference,
    selfCheckAvailable: call.eligibilityRuleSetVersionId !== null,
    slug: call.slug,
    status,
    summary: richTextToPlainText(call.description),
    summaryHtml: call.description,
    thematicArea: call.thematicArea,
    title: call.title,
    totalFundingAmount: Number(call.totalBudgetEnvelope),
  };
}

function detail(
  call: PublicFundingCallRecord,
  now: Date,
): PublicFundingCallDetail {
  return {
    ...summary(call, now),
    description: call.description,
    eligibilitySummary: call.eligibilitySummary,
    publicContact: {
      email: call.publicContactEmail,
      name: call.publicContactName,
      phone: call.publicContactPhone,
    },
    publicDocuments: call.publicDocuments,
  };
}

function decodeCursor(value: string): Cursor {
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

function encodeCursor(call: PublicFundingCallRecord) {
  return Buffer.from(
    JSON.stringify({ id: call.id, opensAt: call.opensAt.toISOString() }),
  ).toString("base64url");
}

export async function listPublicFundingCalls(
  input: PublicFundingCallListInput,
): Promise<PublicFundingCallPage> {
  if (process.env.SKIP_CMS_PRERENDER === "1") {
    return { items: [], nextCursor: null, total: 0 };
  }
  const now = new Date();
  const cursor = input.after ? decodeCursor(input.after) : undefined;
  const result = await readPublicFundingCalls({
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

export async function findPublicFundingCallById(
  id: string,
): Promise<PublicFundingCallDetail | null> {
  const call = await readPublicFundingCallById(id);
  return call ? detail(call, new Date()) : null;
}

export async function findPublicFundingCallBySlug(
  slug: string,
): Promise<PublicFundingCallDetail | null> {
  if (process.env.SKIP_CMS_PRERENDER === "1") return null;
  const call = await readPublicFundingCallBySlug(slug);
  return call ? detail(call, new Date()) : null;
}

export async function getPublicFundingCallBySlug(slug: string) {
  const call = await findPublicFundingCallBySlug(slug);
  if (!call) throw new PublicFundingCallNotFoundError();
  return call;
}
