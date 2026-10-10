import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/integrations/storage/GcsObjectPath", () => ({
  resolveGcsObjectPath: (...segments: string[]) =>
    ["local", ...segments].join("/"),
}));
import { explainEligibilityCondition } from "@/modules/chatbot/engine/EligibilityExplanation";
import { chatbotKnowledgeObjectKeys } from "@/modules/chatbot/infrastructure/ChatbotKnowledgeStorageContract";
import { chatbotLimits } from "@/modules/chatbot/domain/ChatbotLimits";
import { operator } from "@/modules/conditions/domain/Operator";
import type { ConditionNode } from "@/modules/conditions/domain/ConditionGroup";
import {
  chatbotEligibility,
  chatbotId,
} from "../../support/ChatbotKnowledgeFixture";

describe("deterministic eligibility and storage limits", () => {
  it("explains inclusive ranges and exclusions with option labels", () => {
    const data = chatbotEligibility();
    const node = data.groups[0].definition.children[0];
    if (node.kind !== "CONDITION") throw new Error("Invalid fixture");
    node.operator = operator("BETWEEN");
    node.rightOperand = { kind: "CONSTANT", value: [1, 50] };
    expect(explainEligibilityCondition(node, data.inputs)).toBe(
      "Employee count is between 1 and 50, including both limits",
    );
    data.inputs[0].selfCheck.answerType = "SINGLE_SELECT";
    data.inputs[0].selfCheck.options = [
      { value: "EXCLUDED", label: "Excluded sector" },
    ];
    node.operator = operator("NOT_IN");
    node.rightOperand = { kind: "CONSTANT", value: ["EXCLUDED"] };
    expect(explainEligibilityCondition(node, data.inputs)).toBe(
      "Employee count is none of Excluded sector",
    );
  });

  it("uses only allowlisted exact public call operands", () => {
    const data = chatbotEligibility();
    const node = data.groups[0].definition.children[0];
    if (node.kind !== "CONDITION") throw new Error("Invalid fixture");
    node.rightOperand = {
      kind: "FIELD",
      key: "fundingCall.maximumGrantAmount",
    };
    expect(
      explainEligibilityCondition(node, data.inputs, {
        "fundingCall.maximumGrantAmount": {
          label: "Maximum funding",
          value: "50000.00",
        },
      }),
    ).toContain("Maximum funding (50000.00)");
    node.rightOperand = {
      kind: "FIELD",
      key: "fundingCall.workflowTemplateVersionId",
    };
    expect(() => explainEligibilityCondition(node, data.inputs)).toThrow(
      /outside the public self-check/,
    );
  });

  it("blocks computed, malformed-list and oversized condition shapes", () => {
    const data = chatbotEligibility();
    const node = data.groups[0].definition.children[0];
    if (node.kind !== "CONDITION") throw new Error("Invalid fixture");
    node.rightOperand = {
      kind: "COMPUTED",
      operation: "ADD",
      leftOperand: { kind: "CONSTANT", value: 1 },
      rightOperand: { kind: "CONSTANT", value: 2 },
    };
    expect(() => explainEligibilityCondition(node, data.inputs)).toThrow(
      /deterministically/,
    );
    node.operator = operator("IN");
    node.rightOperand = { kind: "CONSTANT", value: 1 };
    expect(() => explainEligibilityCondition(node, data.inputs)).toThrow(
      /deterministically/,
    );
    const group = {
      ...data.groups[0].definition,
      children: Array.from(
        { length: chatbotLimits.conditionNodes + 1 },
        () => ({ ...node, operator: operator("EQUALS") }),
      ),
    };
    expect(() => explainEligibilityCondition(group, data.inputs)).toThrow(
      /deterministically/,
    );
    let nested: ConditionNode = { ...node, operator: operator("EQUALS") };
    for (let depth = 0; depth <= chatbotLimits.conditionDepth; depth++)
      nested = {
        id: chatbotId(40 + depth),
        kind: "GROUP",
        combinator: "AND",
        children: [nested],
      };
    expect(() => explainEligibilityCondition(nested, data.inputs)).toThrow(
      /deterministically/,
    );
  });

  it("requires configured storage only for artifact use and generates environment-scoped immutable keys", () => {
    vi.stubEnv("GCS_DOCUMENTS_BUCKET", undefined);
    expect(() => chatbotKnowledgeObjectKeys(chatbotId(80), "")).toThrow();
    expect(() =>
      chatbotKnowledgeObjectKeys("../override", "knowledge-bucket"),
    ).toThrow();
    expect(
      chatbotKnowledgeObjectKeys(chatbotId(80), "knowledge-bucket"),
    ).toEqual({
      bucket: "knowledge-bucket",
      manifest: `local/chatbot-knowledge-base/releases/${chatbotId(80)}/manifest.json`,
      knowledge: `local/chatbot-knowledge-base/releases/${chatbotId(80)}/knowledge.json`,
    });
  });
});
