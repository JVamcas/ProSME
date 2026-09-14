import { z } from "zod";
import {
  applicationDeclarationsSectionSchema,
  partialDeclarationsSectionSchema,
} from "./ApplicationDeclarationSchemas";

const requiredText = (label: string, maximum = 200) =>
  z.string().trim().min(1, `${label} is required`).max(maximum);

const optionalText = (maximum = 200) => z.string().trim().max(maximum);
const isoDate = (label: string) =>
  requiredText(label, 10).pipe(
    z.iso.date({ error: `Enter a valid ${label.toLocaleLowerCase()}` }),
  );
const money = (label: string) =>
  z
    .number()
    .finite(`${label} must be a number`)
    .min(0, `${label} cannot be negative`)
    .max(1_000_000_000, `${label} is too large`);

export const applicationBusinessSectionSchema = z.object({
  businessId: z.uuid({ error: "Select a business" }),
});
const applicationProjectSectionBaseSchema = z.object({
  projectTitle: requiredText("Project title"),
  projectSummary: requiredText("Project summary", 500).min(
    40,
    "Project summary must be at least 40 characters",
  ),
  projectStartDate: isoDate("Project start date"),
  projectEndDate: isoDate("Project end date"),
});
export const applicationProjectSectionSchema =
  applicationProjectSectionBaseSchema.refine(
    (value) => value.projectEndDate >= value.projectStartDate,
    {
      message: "Project end date must be on or after the start date",
      path: ["projectEndDate"],
    },
  );

export const budgetItemSchema = z.object({
  amount: money("Budget amount").min(
    1,
    "Budget amount must be greater than zero",
  ),
  category: requiredText("Budget category", 100),
  description: requiredText("Budget description", 240),
});
const applicationFinancialSectionBaseSchema = z.object({
  totalProjectCost: money("Total project cost").min(
    1,
    "Total project cost is required",
  ),
  amountRequested: money("Amount requested").min(
    1,
    "Amount requested is required",
  ),
  applicantContribution: money("Applicant contribution"),
  otherFundingSources: optionalText(240),
  budgetBreakdown: z
    .array(budgetItemSchema)
    .min(1, "Add at least one budget item")
    .max(20),
});
const partialText = (maximum: number) =>
  z.string().trim().max(maximum).optional();
const partialBusinessSectionSchema = z.object({
  businessId: z.uuid({ error: "Select a valid business" }).optional(),
});
const partialProjectSectionSchema = z.object({
  projectEndDate: partialText(10),
  projectStartDate: partialText(10),
  projectSummary: partialText(500),
  projectTitle: partialText(200),
});
const partialFinancialSectionSchema = z.object({
  amountRequested: z.number().min(0).optional(),
  applicantContribution: z.number().min(0).optional(),
  budgetBreakdown: z
    .array(
      z.object({
        amount: z.number().min(0),
        category: z.string().trim().max(100),
        description: z.string().trim().max(240),
      }),
    )
    .max(20)
    .optional(),
  otherFundingSources: partialText(240),
  totalProjectCost: z.number().min(0).optional(),
});

export const applicationFinancialSectionSchema =
  applicationFinancialSectionBaseSchema.superRefine((value, context) => {
    if (value.amountRequested > value.totalProjectCost) {
      context.addIssue({
        code: "custom",
        message: "Amount requested cannot exceed total project cost",
        path: ["amountRequested"],
      });
    }
    const budgetTotal = value.budgetBreakdown.reduce(
      (total, item) => total + item.amount,
      0,
    );
    if (budgetTotal > value.totalProjectCost) {
      context.addIssue({
        code: "custom",
        message: "Budget items cannot exceed total project cost",
        path: ["budgetBreakdown"],
      });
    }
  });

export const applicationSectionSchema = z.enum([
  "business",
  "project",
  "financial",
  "documents",
  "declarations",
]);
export const createApplicationSchema = z.object({
  fundingOpportunityId: z.number().int().positive(),
});

export const applicationListSchema = z
  .object({
    after: z.string().max(500).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    status: z.literal("draft").optional(),
  })
  .strict();

const updateApplicationBaseSchema = z.discriminatedUnion("section", [
  z.object({
    data: partialBusinessSectionSchema,
    expectedRowVersion: z.number().int().positive(),
    intent: z.enum(["save", "continue"]),
    section: z.literal("business"),
  }),
  z.object({
    data: partialProjectSectionSchema,
    expectedRowVersion: z.number().int().positive(),
    intent: z.enum(["save", "continue"]),
    section: z.literal("project"),
  }),
  z.object({
    data: partialFinancialSectionSchema,
    expectedRowVersion: z.number().int().positive(),
    intent: z.enum(["save", "continue"]),
    section: z.literal("financial"),
  }),
  z.object({
    data: z.object({}),
    expectedRowVersion: z.number().int().positive(),
    intent: z.literal("continue"),
    section: z.literal("documents"),
  }),
  z.object({
    data: partialDeclarationsSectionSchema,
    expectedRowVersion: z.number().int().positive(),
    intent: z.enum(["save", "continue"]),
    section: z.literal("declarations"),
  }),
]);

const sectionSchemas = {
  business: applicationBusinessSectionSchema,
  declarations: applicationDeclarationsSectionSchema,
  documents: z.object({}),
  financial: applicationFinancialSectionSchema,
  project: applicationProjectSectionSchema,
};

export const updateApplicationSchema = updateApplicationBaseSchema.superRefine(
  (input, context) => {
    if (input.intent !== "continue") return;
    const result = sectionSchemas[input.section].safeParse(input.data);
    if (result.success) return;
    for (const issue of result.error.issues) {
      context.addIssue({ ...issue, path: ["data", ...issue.path] });
    }
  },
);

export type ApplicationBusinessSection = z.infer<
  typeof applicationBusinessSectionSchema
>;
export type ApplicationProjectSection = z.infer<
  typeof applicationProjectSectionSchema
>;
export type ApplicationFinancialSection = z.infer<
  typeof applicationFinancialSectionSchema
>;
export type ApplicationSection = z.infer<typeof applicationSectionSchema>;
export type ApplicationUpdateInput = z.infer<typeof updateApplicationSchema>;
export type ApplicationSectionCompletion = Record<ApplicationSection, boolean>;
