import { z } from "zod";
import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import { formRuleValidationModes } from "../domain/FormFieldRules";

export const formFieldRulesSchema = z
  .object({
    validationCondition: conditionGroupSchema.nullish(),
    editableCondition: conditionGroupSchema.nullish(),
    requiredCondition: conditionGroupSchema.nullish(),
    validationSettings: z
      .object({
        message: z.string().trim().min(1).max(500),
        modes: z
          .array(z.enum(formRuleValidationModes))
          .min(1)
          .max(2)
          .refine((modes) => new Set(modes).size === modes.length),
        missing: z.enum(["DEFER_ON_DRAFT", "REJECT"]),
      })
      .nullish(),
  })
  .superRefine((rules, context) => {
    if (rules.validationSettings && !rules.validationCondition) {
      context.addIssue({
        code: "custom",
        message: "Add a validation condition before configuring its settings.",
        path: ["validationSettings"],
      });
    }
  });
