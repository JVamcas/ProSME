import type { Payload, PayloadRequest } from "payload";

import { hasCollectionSeedHistory } from "@/modules/content/infrastructure/CmsSeedStateRepository";
import { approvedFaqFallback } from "../../modules/content/ContentDefaults";
import { publicPages } from "./public-pages";
import { richText, seedContext } from "./seed-helpers";

export async function seedPages(payload: Payload, req?: PayloadRequest) {
  if (await hasCollectionSeedHistory(payload, "pages", req)) return;

  for (const page of publicPages) {
    const data = {
      title: page.title,
      summary: page.summary,
      content: richText(page.paragraphs),
      ...("layout" in page ? { layout: page.layout } : {}),
      reviewStatus: "approved" as const,
      _status: "published" as const,
    };
    await payload.create({
      collection: "pages",
      data: { ...data, slug: page.slug },
      context: seedContext,
      req,
      overrideAccess: true,
    });
  }
}

export async function seedFaqs(payload: Payload, req?: PayloadRequest) {
  if (await hasCollectionSeedHistory(payload, "faqs", req)) return;

  for (const [order, [question, answer]] of approvedFaqFallback.entries()) {
    const data = {
      answer: richText([answer]),
      category: "General",
      order,
      question,
      reviewStatus: "approved" as const,
      _status: "published" as const,
    };
    await payload.create({
      collection: "faqs",
      data,
      context: seedContext,
      req,
      overrideAccess: true,
    });
  }
}
