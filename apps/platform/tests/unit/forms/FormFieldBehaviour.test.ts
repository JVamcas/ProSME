import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { additionalOperators } from "@/modules/conditions/engine/AdditionalOperators";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { activeFormDefinition } from "@/modules/forms/engine/FormVisibility";
import {
  formFieldIsEditable,
  formFieldRuleErrors,
} from "@/modules/forms/engine/FormFieldBehaviour";
import { evaluateFormRule } from "@/modules/forms/engine/FormRuleEvaluation";
import { validatedFormResponseValues } from "@/modules/forms/application/FormResponseValidation";
import { parseFormDefinition } from "@/modules/forms/engine/FormDefinitionParser";
import { formRuleConfigurationErrors } from "@/modules/forms/engine/FormRuleConfiguration";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";

import {
  amount,
  condition,
  definition,
} from "../../support/FormFieldRuleFixture";

describe("conditional field behavior", () => {
  it("requires a field only when its configured condition is true", () => {
    const form = definition({ requiredCondition: condition("ENABLED") });
    expect(
      validateFormValues(
        activeFormDefinition(form, { ENABLED: false }).fields,
        { ENABLED: false },
        true,
      ),
    ).toBe(true);
    expect(
      validateFormValues(
        activeFormDefinition(form, { ENABLED: true }).fields,
        { ENABLED: true },
        true,
      ),
    ).toBe(false);
    expect(
      validateFormValues(
        activeFormDefinition(form, { ENABLED: true, AMOUNT: 0 }).fields,
        { ENABLED: true, AMOUNT: 0 },
        true,
      ),
    ).toBe(true);
  });

  it("preserves unconditional required flags", () => {
    const form = definition({ requiredCondition: condition("ENABLED") });
    form.fields[1].required = true;
    expect(
      activeFormDefinition(form, { ENABLED: false }).fields[1].required,
    ).toBe(true);
  });

  it("disables the rendered field and denies server-side tampering", () => {
    const form = definition({ editableCondition: condition("ENABLED") });
    expect(
      parseFormDefinition(form, { ENABLED: false, AMOUNT: 10 }).uiSchema.AMOUNT,
    ).toMatchObject({ "ui:disabled": true, "ui:readonly": true });
    expect(() =>
      validatedFormResponseValues(form, { ENABLED: false, AMOUNT: 20 }, false, {
        ENABLED: true,
        AMOUNT: 10,
      }),
    ).toThrow("Amount is not editable");
    expect(
      validatedFormResponseValues(form, { ENABLED: false }, false, {
        AMOUNT: 10,
      }),
    ).toEqual({ ENABLED: false, AMOUNT: 10 });
    expect(
      validatedFormResponseValues(form, { ENABLED: true, AMOUNT: 20 }, true, {
        AMOUNT: 10,
      }),
    ).toEqual({ ENABLED: true, AMOUNT: 20 });
  });

  it("denies editability when rule inputs are unavailable", () => {
    expect(
      formFieldIsEditable(
        { ...amount, rules: { editableCondition: condition("ENABLED") } },
        {},
      ),
    ).toBe(false);
  });

  it("validates references and prevents self-unlocking or unknown fields", () => {
    const valid = definition({
      editableCondition: condition("ENABLED"),
      validationCondition: condition("AMOUNT", 10),
    });
    expect(formRuleConfigurationErrors(valid.fields, valid.sections)).toEqual(
      [],
    );
    const self = definition({ editableCondition: condition("AMOUNT", 10) });
    expect(
      formRuleConfigurationErrors(self.fields, self.sections).length,
    ).toBeGreaterThan(0);
    const unknown = definition({ validationCondition: condition("UNKNOWN") });
    expect(
      formRuleConfigurationErrors(unknown.fields, unknown.sections).length,
    ).toBeGreaterThan(0);
  });
});

describe("validation modes and messages", () => {
  it.each(["DRAFT", "SUBMIT"] as const)(
    "applies a rule only in %s mode",
    (mode) => {
      const form = definition({
        validationCondition: condition("AMOUNT", 10),
        validationSettings: {
          message: "Amount must equal ten.",
          modes: [mode],
          missing: "REJECT",
        },
      });
      const values = { AMOUNT: 5 };
      expect(validateFormValues(form.fields, values, mode === "SUBMIT")).toBe(
        false,
      );
      expect(validateFormValues(form.fields, values, mode !== "SUBMIT")).toBe(
        true,
      );
      expect(formFieldRuleErrors(form.fields, values, mode)).toEqual({
        AMOUNT: "Amount must equal ten.",
      });
      expect(() =>
        validatedFormResponseValues(form, values, mode === "SUBMIT"),
      ).toThrow("Amount must equal ten.");
    },
  );

  it("defers missing rule inputs only for partial drafts", () => {
    const form = definition({ validationCondition: condition("AMOUNT", 10) });
    expect(validateFormValues(form.fields, {}, false)).toBe(true);
    expect(validateFormValues(form.fields, {}, true)).toBe(false);
    expect(formFieldRuleErrors(form.fields, {}, "SUBMIT").AMOUNT).toContain(
      "inputs are missing",
    );
  });

  it("rejects missing inputs during drafts when configured", () => {
    const form = definition({
      validationCondition: condition("AMOUNT", 10),
      validationSettings: {
        message: "Enter amount.",
        modes: ["DRAFT", "SUBMIT"],
        missing: "REJECT",
      },
    });
    expect(validateFormValues(form.fields, {}, false)).toBe(false);
  });

  it("evaluates cross-field rules using the complete authoritative context", () => {
    const field = {
      ...amount,
      rules: { validationCondition: condition("ENABLED") },
    };
    expect(
      validateFormValues([field], { AMOUNT: 10 }, true, {
        ENABLED: true,
        AMOUNT: 10,
      }),
    ).toBe(true);
    expect(
      validateFormValues([field], { AMOUNT: 10 }, true, {
        ENABLED: false,
        AMOUNT: 10,
      }),
    ).toBe(false);
  });

  it("does not defer invalid computed operands", () => {
    const rule = condition("AMOUNT", 10);
    if (rule.children[0].kind === "CONDITION") {
      rule.children[0].leftOperand = {
        kind: "COMPUTED",
        operation: "DIVIDE",
        leftOperand: { kind: "FIELD", key: "AMOUNT" },
        rightOperand: { kind: "CONSTANT", value: 0 },
      };
    }
    expect(evaluateFormRule(rule, { AMOUNT: 10 })).toBe("INVALID");
  });

  it("allows empty checks to evaluate missing values", () => {
    const rule = condition("AMOUNT", 10);
    if (rule.children[0].kind === "CONDITION") {
      rule.children[0].operator = additionalOperators.IS_EMPTY;
      delete rule.children[0].rightOperand;
    }
    expect(evaluateFormRule(rule, {})).toBe("TRUE");
  });

  it("rejects orphan settings and empty mode selections", () => {
    const settings = {
      message: "Invalid amount",
      modes: ["SUBMIT"],
      missing: "REJECT",
    };
    expect(
      formFieldSchema.safeParse({
        ...amount,
        rules: { validationSettings: settings },
      }).success,
    ).toBe(false);
    expect(
      formFieldSchema.safeParse({
        ...amount,
        rules: {
          validationCondition: condition("AMOUNT", 10),
          validationSettings: { ...settings, modes: [] },
        },
      }).success,
    ).toBe(false);
  });
});
