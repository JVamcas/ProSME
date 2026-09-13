import type { Payload } from "payload";

import { approvedFaqFallback } from "../../modules/content/ContentDefaults";
import { publicPages } from "./public-pages";
import { findId, richText, seedContext } from "./seed-helpers";

export async function seedPages(payload: Payload) {
  for (const page of publicPages) {
    const current = await findId(payload, "pages", "slug", page.slug);
    const data = {
      title: page.title,
      summary: page.summary,
      content: richText(page.paragraphs),
      ...("layout" in page ? { layout: page.layout } : {}),
      reviewStatus: "approved" as const,
      _status: "published" as const,
    };
    if (current) {
      await payload.update({ collection: "pages", id: current, data, context: seedContext, overrideAccess: true });
    } else {
      await payload.create({ collection: "pages", data: { ...data, slug: page.slug }, context: seedContext, overrideAccess: true });
    }
  }
}

export async function seedFaqs(payload: Payload) {
  for (const [order, [question, answer]] of approvedFaqFallback.entries()) {
    const current = await findId(payload, "faqs", "question", question);
    const data = {
      answer: richText([answer]),
      category: "General",
      order,
      question,
      reviewStatus: "approved" as const,
      _status: "published" as const,
    };
    if (current) {
      await payload.update({ collection: "faqs", id: current, data, context: seedContext, overrideAccess: true });
    } else {
      await payload.create({ collection: "faqs", data, context: seedContext, overrideAccess: true });
    }
  }
}
