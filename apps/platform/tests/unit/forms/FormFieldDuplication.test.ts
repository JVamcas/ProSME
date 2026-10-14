import { describe, expect, it } from "vitest";
import { createDuplicatedFormField } from "@/modules/forms/domain/FormFieldDuplication";
import {
  duplicateFormField,
  formFieldIdentity,
} from "@/modules/forms/domain/FormFieldOrdering";
import type { FormField } from "@/modules/forms/FormTypes";
import { condition } from "../../support/FormFieldRuleFixture";

const source: FormField = {
  id: "b0000000-0000-4000-8000-000000000001",
  key: "SOURCE",
  label: "Budget reviewed",
  type: "SINGLE_SELECT",
  sectionId: "b0000000-0000-4000-8000-000000000002",
  columnSpan: 2,
  order: 1,
  required: true,
  helpText: "Review all budget lines.",
  options: [
    { key: "YES", label: "Yes", order: 1 },
    { key: "NO", label: "No", order: 2 },
  ],
  visibilityCondition: condition("OTHER"),
  rules: {
    validationCondition: condition("SOURCE"),
    editableCondition: condition("OTHER"),
    requiredCondition: condition("SOURCE"),
    validationSettings: {
      message: "Review the budget.",
      modes: ["SUBMIT"],
      missing: "REJECT",
    },
  },
};

describe("form field duplication", () => {
  it("remaps nested and computed self-references without changing literal values", () => {
    const nested = condition("SOURCE");
    const node = nested.children[0];
    if (node.kind !== "CONDITION")
      throw new Error("Expected condition fixture.");
    node.leftOperand = {
      kind: "COMPUTED",
      operation: "ADD",
      leftOperand: { kind: "FIELD", key: "SOURCE" },
      rightOperand: { kind: "CONSTANT", value: "SOURCE" },
    };
    node.rightOperand = { kind: "FIELD", key: "OTHER" };
    const configured = {
      ...source,
      visibilityCondition: { ...condition("OTHER"), children: [nested] },
    };
    const duplicate = createDuplicatedFormField(configured);
    expect(duplicate.visibilityCondition?.children[0]).toMatchObject({
      children: [
        {
          leftOperand: {
            leftOperand: { kind: "FIELD", key: duplicate.key },
            rightOperand: { kind: "CONSTANT", value: "SOURCE" },
          },
          rightOperand: { kind: "FIELD", key: "OTHER" },
        },
      ],
    });
    expect(node.leftOperand.leftOperand).toEqual({
      kind: "FIELD",
      key: "SOURCE",
    });
  });

  it("preserves scoring sources and independently copies repeatable configuration", () => {
    const aggregate: FormField = {
      ...source,
      type: "SCORING_AGGREGATE",
      options: [],
      scoringAggregate: {
        sources: [{ fieldKey: "SCORE", weight: 2 }],
        method: "WEIGHTED_SUM",
        missing: "REQUIRE_ALL",
        normalization: "RAW",
        precision: 2,
      },
    };
    expect(createDuplicatedFormField(aggregate).scoringAggregate).toEqual(
      aggregate.scoringAggregate,
    );
    const repeatable: FormField = {
      ...source,
      type: "REPEATABLE_GROUP",
      options: [],
      repeatable: {
        itemLabel: "Item",
        addLabel: "Add item",
        minimumItems: 1,
        maximumItems: 5,
        fields: [
          {
            key: "ROW_VALUE",
            label: "Value",
            type: "NUMBER",
            order: 1,
            columnSpan: 1,
            required: false,
          },
        ],
      },
    };
    const duplicate = createDuplicatedFormField(repeatable);
    expect(duplicate.repeatable).toEqual(repeatable.repeatable);
    duplicate.repeatable!.fields[0].label = "Changed copy";
    expect(repeatable.repeatable!.fields[0].label).toBe("Value");
  });

  it("copies configuration independently with fresh identities and remaps only self-references", () => {
    const original = structuredClone(source);
    const duplicate = createDuplicatedFormField(source);
    expect(duplicate.key).toMatch(/^K_[A-F0-9]{32}$/);
    expect(duplicate.id).not.toBe(source.id);
    expect(duplicate).toMatchObject({
      label: source.label,
      type: source.type,
      required: true,
      helpText: source.helpText,
      options: source.options,
    });
    expect(duplicate.rules?.validationCondition?.children[0]).toMatchObject({
      leftOperand: { kind: "FIELD", key: duplicate.key },
    });
    expect(duplicate.rules?.requiredCondition?.children[0]).toMatchObject({
      leftOperand: { kind: "FIELD", key: duplicate.key },
    });
    expect(duplicate.rules?.editableCondition).toEqual(
      source.rules?.editableCondition,
    );
    expect(duplicate.visibilityCondition).toEqual(source.visibilityCondition);
    expect(duplicate.rules?.validationSettings).toEqual(
      source.rules?.validationSettings,
    );
    duplicate.options![0].label = "Changed copy";
    expect(source).toEqual(original);
  });

  it("assigns independent document evidence identity while preserving policies and limits", () => {
    const document: FormField = {
      ...source,
      type: "DOCUMENT",
      options: [],
      uploadedBy: "ANY",
      maxPages: 8,
      maximumFileSizeMb: 5,
      acceptedExtensions: [".pdf"],
      workflowDocument: {
        stableKey: "EVIDENCE",
        acceptedFileTypes: ["PDF"],
        maximumSizeMb: 5,
        expiryDays: 30,
        requestOnStageActivation: true,
        uploader: "ANY",
        verifier: "STAFF",
        templateReference: "template",
      },
    };
    const duplicate = createDuplicatedFormField(document);
    expect(duplicate.workflowDocument).toEqual({
      ...document.workflowDocument,
      stableKey: duplicate.key,
    });
    expect(duplicate).toMatchObject({
      uploadedBy: "ANY",
      maxPages: 8,
      maximumFileSizeMb: 5,
      acceptedExtensions: [".pdf"],
    });
    expect(document.workflowDocument?.stableKey).toBe("EVIDENCE");
  });

  it("inserts directly after the source and preserves the ordering of other sections", () => {
    const next = { ...source, id: "next", key: "NEXT", order: 2 };
    const other = {
      ...source,
      id: "other",
      key: "OTHER",
      sectionId: "other-section",
      order: 1,
    };
    const original = [source, next, other];
    const result = duplicateFormField(original, formFieldIdentity(source));
    expect(result.map((field) => field.order)).toEqual([1, 2, 3, 1]);
    expect(result.map((field) => field.key)).toEqual([
      "SOURCE",
      expect.stringMatching(/^K_[A-F0-9]{32}$/),
      "NEXT",
      "OTHER",
    ]);
    expect(original.map((field) => field.order)).toEqual([1, 2, 1]);
    expect(duplicateFormField(original, "missing")).toBe(original);
  });
});
