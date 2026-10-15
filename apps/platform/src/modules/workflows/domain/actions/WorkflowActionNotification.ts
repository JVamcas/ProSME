import { z } from "zod";
import {
  sanitizeFormRichText,
  formRichTextAsPlainText,
} from "@/modules/forms/engine/FormRichText";
import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";

export const actionNotificationParameters = [
  { value: "fundingcalltitle", label: "Funding call title" },
  { value: "applicationreference", label: "Application reference" },
  { value: "stagename", label: "Stage name" },
  { value: "actionlabel", label: "Action label" },
  { value: "actorname", label: "Action performer name" },
  { value: "recipientname", label: "Recipient name" },
] as const;

export const actionNotificationRecipientItems = [
  { value: "APPLICATION_OWNER", label: "Application owner" },
  { value: "ACTION_ACTOR", label: "Action performer" },
  { value: "ASSIGNED_USER", label: "Assigned users in this stage" },
  { value: "SPECIFIC_USER", label: "Selected user" },
  { value: "SPECIFIC_ROLE", label: "Users in selected role" },
] as const;

export const workflowActionNotificationSchema = z
  .object({
    id: z.uuid(),
    condition: conditionGroupSchema.nullable(),
    recipientType: z.enum([
      "APPLICATION_OWNER",
      "ACTION_ACTOR",
      "ASSIGNED_USER",
      "SPECIFIC_USER",
      "SPECIFIC_ROLE",
    ]),
    recipientId: z.uuid().nullable(),
    subject: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine(
        (value) => !/[\r\n]/.test(value),
        "Subject must be a single line.",
      ),
    body: z
      .string()
      .trim()
      .min(1)
      .max(100_000)
      .transform(sanitizeFormRichText)
      .refine(
        (value) =>
          formRichTextAsPlainText(value)
            .replace(/&nbsp;/g, " ")
            .trim().length > 0,
        "Enter a notification message.",
      ),
  })
  .strict()
  .superRefine((row, context) => {
    const targeted =
      row.recipientType === "SPECIFIC_USER" ||
      row.recipientType === "SPECIFIC_ROLE";
    if (targeted !== Boolean(row.recipientId)) {
      context.addIssue({
        code: "custom",
        path: ["recipientId"],
        message: targeted
          ? "Select a recipient."
          : "Relationship recipients must not specify a user or role.",
      });
    }
    for (const path of ["subject", "body"] as const) {
      const remaining = row[path].replace(
        /{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g,
        (match, key) =>
          actionNotificationParameters.some(
            (parameter) => parameter.value === key,
          )
            ? ""
            : match,
      );
      if (/{{|}}/.test(remaining)) {
        context.addIssue({
          code: "custom",
          path: [path],
          message:
            "Use a parameter from the available notification parameters.",
        });
      }
    }
  });

export type WorkflowActionNotification = z.infer<
  typeof workflowActionNotificationSchema
>;
