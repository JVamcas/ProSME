import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { knowledgeSelectionSchema } from "@/modules/chatbot/api/ChatbotKnowledgeSchemas";
import { prepareChatbotKnowledge } from "@/modules/chatbot/application/PrepareChatbotKnowledge";
import { lexicalToKnowledgeText } from "@/modules/content/domain/LexicalPlainText";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import {
  chatbotCall,
  chatbotEligibility,
  chatbotFaq,
  chatbotId,
} from "../../support/ChatbotKnowledgeFixture";

describe("recorded knowledge preparation boundaries", () => {
  it("accepts maximum source selections and rejects exceeding either limit or PostgreSQL ID range", () => {
    const fundingCallIds = Array.from({ length: 100 }, (_, index) =>
      chatbotId(1000 + index),
    );
    const faqIds = Array.from({ length: 1000 }, (_, index) =>
      String(index + 1),
    );
    expect(
      knowledgeSelectionSchema.safeParse({ fundingCallIds, faqIds }).success,
    ).toBe(true);
    expect(
      knowledgeSelectionSchema.safeParse({
        fundingCallIds: [...fundingCallIds, chatbotId(2000)],
        faqIds,
      }).success,
    ).toBe(false);
    expect(
      knowledgeSelectionSchema.safeParse({
        fundingCallIds,
        faqIds: [...faqIds, "1001"],
      }).success,
    ).toBe(false);
    expect(
      knowledgeSelectionSchema.safeParse({
        fundingCallIds: [],
        faqIds: ["2147483648"],
      }).success,
    ).toBe(false);
  });

  it("rejects a corpus exceeding 5 MiB even when every passage and selection fits", () => {
    const answer = paragraphsToRichText(["Public guidance. ".repeat(900)]);
    const faqs = Array.from({ length: 400 }, (_, index) => ({
      ...chatbotFaq(String(index + 1)),
      answer,
    }));
    expect(() =>
      prepareChatbotKnowledge(
        { fundingCallIds: [], faqIds: faqs.map((faq) => faq.id) },
        {
          calls: [],
          eligibility: chatbotEligibility(),
          faqs,
        },
      ),
    ).toThrow(/preparation limits/);
  });

  it("rejects over 5,000 prepared records across many eligible call/version bindings", () => {
    const calls = Array.from({ length: 100 }, (_, index) =>
      chatbotCall(chatbotId(1000 + index)),
    );
    const eligibility = chatbotEligibility();
    eligibility.rules = Array.from({ length: 50 }, (_, index) => ({
      ...eligibility.rules[0],
      id: chatbotId(3000 + index),
      order: index + 1,
    }));
    expect(() =>
      prepareChatbotKnowledge(
        { fundingCallIds: calls.map((call) => call.id), faqIds: [] },
        {
          calls,
          eligibility,
          faqs: [],
        },
      ),
    ).toThrow(/preparation limits/);
  });

  it("blocks deeply nested or very large FAQ editor trees without silently truncating answers", () => {
    type Node = { type: string; text?: string; children?: Node[] };
    let node: Node = { type: "text", text: "Answer" };
    for (let index = 0; index < 31; index++)
      node = { type: "paragraph", children: [node] };
    expect(lexicalToKnowledgeText({ root: node }).issues[0]).toMatch(
      /conversion limits/,
    );
    const children = Array.from({ length: 5001 }, () => ({
      type: "text",
      text: "x",
    }));
    const oversized = lexicalToKnowledgeText({
      root: { type: "root", children },
    });
    expect(oversized.text).toBe("");
    expect(oversized.issues[0]).toMatch(/conversion limits/);
  });
});
