import { describe, expect, it } from "vitest";
import { evaluateApplicationReadiness } from "@/modules/applications/domain/ApplicationReadiness";
import { applicationDocumentRequirements } from "@/modules/applications/domain/ApplicationDocumentPolicy";
import { condition, definition } from "../../support/FormFieldRuleFixture";

function readiness(enabled: boolean, mode: "DRAFT" | "SUBMIT" = "SUBMIT") {
  const form = definition({
    validationCondition: condition("AMOUNT", 10),
    validationSettings: {
      message: "Use the approved amount.",
      modes: [mode],
      missing: "REJECT",
    },
  });
  form.fields.push({
    ...form.fields[1],
    key: "PROFILE",
    label: "Business Profile",
    type: "DOCUMENT",
    order: 3,
    rules: {
      requiredCondition: condition("ENABLED"),
      editableCondition: condition("ENABLED"),
    },
  });
  const values = { ENABLED: enabled, AMOUNT: 5 };
  return {
    requirements: applicationDocumentRequirements(form, values),
    result: evaluateApplicationReadiness({
      application: {
        businessId: "business",
        formVersionId: form.versionId,
        rowVersion: 1,
        status: "draft",
      },
      callOpen: true,
      configurationAvailable: true,
      documents: [],
      evaluatedAt: new Date(),
      form,
      response: { formVersionId: form.versionId, rowVersion: 1, values },
    }),
  };
}

describe("submission readiness with field rules", () => {
  it("returns configured validation messages as submission blockers", () => {
    expect(readiness(true).result.blockers).toContainEqual(
      expect.objectContaining({
        category: "form",
        code: "FORM_RULE_INVALID",
        message: "Use the approved amount.",
      }),
    );
  });

  it("does not apply draft-only rules during readiness checks", () => {
    expect(
      readiness(true, "DRAFT").result.blockers.some(
        (blocker) => blocker.code === "FORM_RULE_INVALID",
      ),
    ).toBe(false);
  });

  it.each([true, false])(
    "requires the document only when enabled=%s",
    (enabled) => {
      const { requirements, result } = readiness(enabled);
      expect(requirements[0]).toMatchObject({
        required: enabled,
        editable: enabled,
      });
      expect(
        result.blockers.some(
          (blocker) =>
            blocker.code === "DOCUMENT_MISSING" &&
            blocker.requirementKey === "PROFILE",
        ),
      ).toBe(enabled);
    },
  );
});
