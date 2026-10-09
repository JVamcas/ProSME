import { z } from "zod";
import {
  reportParameterDefinitionSchema,
  reportParameterDefinitionsSchema,
  type ReportParameterDefinition,
} from "../domain/ReportParameters";

export function reportParameterEditorSchema(
  parameters: ReportParameterDefinition[],
  editingIndex?: number,
) {
  const index = editingIndex ?? parameters.length;
  return reportParameterDefinitionSchema
    .extend({ hasDefault: z.boolean() })
    .superRefine((values, context) => {
      if (
        values.binding === "value" &&
        values.hasDefault &&
        values.defaultValue === undefined
      ) {
        context.addIssue({
          code: "custom",
          path: ["defaultValue"],
          message: "Enter a default value or turn off Use a default value.",
        });
      }
    })
    .transform(
      ({
        hasDefault,
        defaultValue,
        ...parameter
      }): ReportParameterDefinition => {
        return hasDefault && parameter.binding === "value"
          ? { ...parameter, defaultValue }
          : parameter;
      },
    )
    .superRefine((parameter, context) => {
      const next = [...parameters];
      next[index] = parameter;
      const result = reportParameterDefinitionsSchema.safeParse(next);
      if (result.success) {
        return;
      }
      for (const issue of result.error.issues) {
        const path =
          typeof issue.path[0] === "number" ? issue.path.slice(1) : [];
        context.addIssue({
          code: "custom",
          path: path.length ? path : ["name"],
          message: issue.message,
        });
      }
    });
}

export type ReportParameterEditorValues = z.input<
  ReturnType<typeof reportParameterEditorSchema>
>;
