import "server-only";

import { count, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCallListInput } from "../api/FundingCallSchemas";
import { fundingCalls } from "./funding-call.schema";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";

export async function readFundingCalls(input: FundingCallListInput) {
  const database = getDatabase();
  const offset = (input.page - 1) * input.pageSize;
  const filter = input.fundingCallId
    ? eq(fundingCalls.id, input.fundingCallId)
    : undefined;
  const [rows, totals] = await Promise.all([
    database
      .select()
      .from(fundingCalls)
      .where(filter)
      .orderBy(desc(fundingCalls.updatedAt), desc(fundingCalls.id))
      .limit(input.pageSize)
      .offset(offset),
    database.select({ value: count() }).from(fundingCalls).where(filter),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    items: rows.map((row) => ({
      ...row,
      description: sanitizeFundingCallDescription(row.description),
    })),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
}
