import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prepareChatbotKnowledge } from "@/modules/chatbot/application/PrepareChatbotKnowledge";
import { knowledgeFingerprint } from "@/modules/chatbot/infrastructure/KnowledgeFingerprint";
import { knowledgeDiff } from "@/modules/chatbot/engine/KnowledgeDiff";
import {
  chatbotActor,
  chatbotCall,
  chatbotEligibility,
  chatbotFaq,
  chatbotId,
  chatbotSourceFixture,
} from "../../support/ChatbotKnowledgeFixture";
import {
  knowledgeSelectionSchema,
  chatbotPolicySchema,
} from "@/modules/chatbot/api/ChatbotKnowledgeSchemas";
import { chatbotLimits } from "@/modules/chatbot/domain/ChatbotLimits";

const selection = { fundingCallIds: [chatbotId(10)], faqIds: ["1"] };

describe("public knowledge preparation", () => {
  it("binds exact publication and eligibility revisions and preserves decimal strings and nulls", () => {
    const snapshot = prepareChatbotKnowledge(selection, chatbotSourceFixture());
    expect(snapshot.issues).toEqual([]);
    const call = snapshot.records.find((item) => item.kind === "funding-call")!;
    expect(call.source.revision).toBe(chatbotId(30));
    expect(call.facts.minimumGrantAmount).toBe("1000.50");
    expect(call.facts.publicContactName).toBeNull();
    expect(call.text).toContain("Currency is not specified");
    expect(
      snapshot.records.find((item) => item.kind === "eligibility-criterion")!
        .scope,
    ).toEqual({
      fundingCallId: chatbotId(10),
      rulesetVersionId: chatbotId(20),
    });
  });

  it("keeps multiple calls and exact versions separate", () => {
    const first = chatbotCall();
    const second = chatbotCall(chatbotId(11), chatbotId(21));
    second.publicFields.title = "Second fund";
    second.revisionId = chatbotId(31);
    const secondEligibility = chatbotEligibility(chatbotId(21));
    const firstEligibility = chatbotEligibility();
    const snapshot = prepareChatbotKnowledge(
      { fundingCallIds: [first.id, second.id], faqIds: [] },
      {
        calls: [first, second],
        faqs: [],
        eligibility: {
          versions: [
            ...firstEligibility.versions,
            ...secondEligibility.versions,
          ],
          rules: [...firstEligibility.rules, ...secondEligibility.rules],
          inputs: [...firstEligibility.inputs, ...secondEligibility.inputs],
          groups: firstEligibility.groups,
        },
      },
    );
    expect(snapshot.issues).toEqual([]);
    expect(
      snapshot.records
        .filter((item) => item.kind === "eligibility-criterion")
        .map((item) => item.scope?.rulesetVersionId),
    ).toEqual([chatbotId(20), chatbotId(21)]);
  });

  it.each(["HARD_FAIL", "SOFT_FAIL", "WARNING"] as const)(
    "preserves %s and complete AND/OR grouping",
    (failureType) => {
      const data = chatbotSourceFixture();
      data.eligibility.rules[0].failureType = failureType;
      const group = data.eligibility.groups[0].definition;
      group.children.push({
        ...group,
        id: chatbotId(43),
        combinator: "OR",
        children: [
          ...group.children,
          { ...group.children[0], id: chatbotId(44) },
        ],
      });
      const snapshot = prepareChatbotKnowledge(selection, data);
      const record = snapshot.records.find(
        (item) => item.kind === "eligibility-criterion",
      )!;
      expect(record.facts.failureType).toBe(failureType);
      expect(record.text).toContain("All of:");
      expect(record.text).toContain("At least one of:");
      expect(record.text).toContain("is at most 50");
      expect(record.text).toContain("If not met:");
      expect(record.text).toContain("advisory only");
    },
  );

  it("blocks private dependencies even for public execution-mode rules", () => {
    const data = chatbotSourceFixture();
    const node = data.eligibility.groups[0].definition.children[0];
    if (node.kind !== "CONDITION") throw new Error("Invalid fixture");
    node.leftOperand = { kind: "FIELD", key: "application.private_tax_number" };
    node.rightOperand = { kind: "CONSTANT", value: "SECRET" };
    const snapshot = prepareChatbotKnowledge(selection, data);
    expect(snapshot.issues[0].code).toBe("PRIVATE_DEPENDENCY");
    expect(JSON.stringify(snapshot)).not.toMatch(/SECRET|private_tax_number/);
    expect(
      snapshot.records.some((item) => item.kind === "eligibility-criterion"),
    ).toBe(false);
  });

  it("blocks unsupported operators and unavailable bound versions", () => {
    const data = chatbotSourceFixture();
    const node = data.eligibility.groups[0].definition.children[0];
    if (node.kind !== "CONDITION") throw new Error("Invalid fixture");
    node.operator = "UNKNOWN_OPERATION" as typeof node.operator;
    expect(prepareChatbotKnowledge(selection, data).issues[0].code).toBe(
      "UNSUPPORTED_CONDITION",
    );
    data.eligibility.versions = [];
    expect(prepareChatbotKnowledge(selection, data).issues[0].code).toBe(
      "MISSING_SOURCE",
    );
  });

  it("records missing nullable CMS question/answer as review issues", () => {
    const snapshot = prepareChatbotKnowledge(
      { fundingCallIds: [], faqIds: ["1"] },
      {
        calls: [],
        eligibility: chatbotEligibility(),
        faqs: [{ id: "1", question: null, answer: null }],
      },
    );
    expect(snapshot.issues.length).toBeGreaterThan(0);
    expect(
      snapshot.issues.every((issue) => issue.code === "MISSING_DATA"),
    ).toBe(true);
  });

  it("fingerprints condition trees and referenced public question definitions", () => {
    const data = chatbotSourceFixture();
    const original = knowledgeFingerprint(
      prepareChatbotKnowledge(selection, data),
    );
    data.eligibility.inputs[0].selfCheck.helpText = "Changed public dependency";
    expect(
      knowledgeFingerprint(prepareChatbotKnowledge(selection, data)),
    ).not.toBe(original);
    expect(knowledgeFingerprint({ b: 2, a: 1 })).toBe(
      knowledgeFingerprint({ a: 1, b: 2 }),
    );
  });

  it("retains more than 50 selected FAQs and marks missing sources and conflicts", () => {
    const faqs = Array.from({ length: 123 }, (_, index) =>
      chatbotFaq(String(index + 1)),
    );
    const selected = {
      fundingCallIds: [],
      faqIds: faqs.map((item) => item.id),
    };
    const snapshot = prepareChatbotKnowledge(selected, {
      calls: [],
      faqs,
      eligibility: chatbotEligibility(),
    });
    expect(snapshot.records).toHaveLength(123);
    faqs[1].question = faqs[0].question;
    const conflicting = prepareChatbotKnowledge(
      { ...selected, faqIds: [...selected.faqIds, "999"] },
      { calls: [], faqs, eligibility: chatbotEligibility() },
    );
    expect(conflicting.issues.map((issue) => issue.code)).toContain(
      "CONFLICTING_GUIDANCE",
    );
    expect(conflicting.issues.map((issue) => issue.code)).toContain(
      "MISSING_SOURCE",
    );
  });

  it("uses stable record identities for changed revisions and shows removals", () => {
    const data = chatbotSourceFixture();
    const before = prepareChatbotKnowledge(selection, data).records;
    data.calls[0].revisionId = chatbotId(99);
    data.calls[0].publicFields.title = "Renamed fund";
    const after = prepareChatbotKnowledge(
      { ...selection, faqIds: [] },
      { ...data, faqs: [] },
    ).records;
    const changes = knowledgeDiff(before, after);
    expect(changes.filter((change) => change.kind === "changed")).toHaveLength(
      2,
    );
    expect(
      changes.find((change) => change.kind === "removed")?.before?.id,
    ).toBe("faq:1");
  });

  it("enforces configurable policy and knowledge bounds without named staff", () => {
    expect(chatbotPolicySchema.parse({})).toMatchObject({
      sessionMinutes: 30,
      escalationDays: 90,
      recipientUserIds: [],
    });
    expect(chatbotPolicySchema.safeParse({ escalationDays: 366 }).success).toBe(
      false,
    );
    expect(
      chatbotPolicySchema.safeParse({
        recipientUserIds: [chatbotActor().id, chatbotActor().id],
      }).success,
    ).toBe(false);
    expect(
      knowledgeSelectionSchema.safeParse({ fundingCallIds: [], faqIds: [] })
        .success,
    ).toBe(false);
    expect(
      knowledgeSelectionSchema.safeParse({
        fundingCallIds: [],
        faqIds: ["1", "1"],
      }).success,
    ).toBe(false);
    const data = chatbotSourceFixture();
    data.calls[0].publicFields.description = "x".repeat(
      chatbotLimits.passageCharacters + 1,
    );
    expect(() => prepareChatbotKnowledge(selection, data)).toThrow(/limits/);
  });
});
