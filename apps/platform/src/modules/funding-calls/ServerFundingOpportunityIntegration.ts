import "server-only";

import { getPayload, type Where } from "payload";
import { z } from "zod";
import configPromise from "@payload-config";

import type {
  FundingOpportunityDetail,
  FundingOpportunityListInput,
  FundingOpportunityPage,
  FundingOpportunitySummary,
} from "./FundingOpportunityTypes";

type FundingCallDocument = Awaited<
  ReturnType<typeof loadPublishedCalls>
>["docs"][number];

const publishedOnly = {
  _status: {
    equals: "published" as const,
  },
};

const cursorSchema = z.object({
  id: z.number().int().positive(),
  opensAt: z.iso.datetime(),
});

type FundingOpportunityCursor = z.infer<typeof cursorSchema>;

function summary(item: FundingCallDocument): FundingOpportunitySummary {
  return {
    closesAt: item.closesAt,
    id: item.id,
    maximumAmount: item.maximumAmount,
    minimumAmount: item.minimumAmount,
    opensAt: item.opensAt,
    slug: item.slug,
    status: item.callStatus,
    summary: item.summary,
    title: item.title,
  };
}

function decodeCursor(value: string): FundingOpportunityCursor {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return cursorSchema.parse(JSON.parse(decoded));
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

function encodeCursor(item: FundingCallDocument) {
  return Buffer.from(
    JSON.stringify({ id: item.id, opensAt: item.opensAt }),
  ).toString("base64url");
}

function listWhere(input: FundingOpportunityListInput): Where {
  const conditions: Where[] = [publishedOnly];

  if (input.status) {
    conditions.push({ callStatus: { equals: input.status } });
  }

  if (input.search) {
    conditions.push({
      or: [
        { title: { contains: input.search } },
        { summary: { contains: input.search } },
      ],
    });
  }

  return conditions.length === 1 ? conditions[0] : { and: conditions };
}

function cursorWhere(cursor: FundingOpportunityCursor): Where {
  return {
    or: [
      { opensAt: { less_than: cursor.opensAt } },
      {
        and: [
          { opensAt: { equals: cursor.opensAt } },
          { id: { less_than: cursor.id } },
        ],
      },
    ],
  };
}

async function loadPublishedCalls(input: FundingOpportunityListInput) {
  const payload = await getPayload({ config: configPromise });
  const baseWhere = listWhere(input);
  const where = input.after
    ? { and: [baseWhere, cursorWhere(decodeCursor(input.after))] }
    : baseWhere;
  const [result, count] = await Promise.all([
    payload.find({
      collection: "funding-calls",
      depth: 0,
      draft: false,
      limit: input.limit + 1,
      overrideAccess: true,
      sort: ["-opensAt", "-id"],
      where,
    }),
    payload.count({
      collection: "funding-calls",
      overrideAccess: true,
      where: baseWhere,
    }),
  ]);

  return { docs: result.docs, total: count.totalDocs };
}

export async function listPublishedFundingOpportunities(
  input: FundingOpportunityListInput,
): Promise<FundingOpportunityPage> {
  const result = await loadPublishedCalls(input);
  const hasNextPage = result.docs.length > input.limit;
  const docs = result.docs.slice(0, input.limit);

  return {
    items: docs.map(summary),
    nextCursor: hasNextPage ? encodeCursor(docs.at(-1)!) : null,
    total: result.total,
  };
}

export async function findPublishedFundingOpportunity(
  id: number,
): Promise<FundingOpportunityDetail | null> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "funding-calls",
    depth: 0,
    draft: false,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [publishedOnly, { id: { equals: id } }],
    },
  });
  const item = result.docs[0];

  return item
    ? {
        ...summary(item),
        eligibility: item.eligibility,
      }
    : null;
}
