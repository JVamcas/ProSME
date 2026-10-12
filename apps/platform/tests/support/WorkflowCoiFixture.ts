import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";

export const coiActor: AuthenticatedUser = {
  capabilities: new Set([
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAssignedProcess,
    permissionCodes.workflowCoiAllReview,
  ]),
  createdAt: new Date(),
  displayName: "Reviewer",
  email: "reviewer@example.test",
  id: "11111111-1111-4111-8111-111111111111",
  identitySubject: "reviewer",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};
export const coiTaskId = "22222222-2222-4222-8222-222222222222";
export const coiSectionId = "77777777-7777-4777-8777-777777777777";
const fieldBase = { columnSpan: 1 as const, sectionId: coiSectionId, options: [], required: true };
export const coiAnswers = { HAS_CONFLICT: false, SIGNATURE: "Reviewer", CONFIRMATION: true };
export const coiForm: FormRuntimeSchema = {
  displayMode: "SINGLE_PAGE" as const,
  fields: [
    { ...fieldBase, key: "HAS_CONFLICT", label: "Conflict?", type: "YES_NO" as const, order: 1 },
    { ...fieldBase, key: "DISCLOSURE_TEXT", label: "Details", type: "TEXTAREA" as const, required: false, order: 2 },
    { ...fieldBase, key: "SIGNATURE", label: "Full name", type: "TEXT" as const, minLength: 1, order: 3 },
    { ...fieldBase, key: "CONFIRMATION", label: "Configured acknowledgement", type: "CHECKBOX" as const, order: 4 },
  ],
  instructions: "Select the statement that applies.",
  sections: [{ id: coiSectionId, key: "DECLARATION", title: "Declaration", description: "", columnSpan: 1 as const, order: 1, showContainer: false }],
  submitLabel: "Submit declaration",
  versionId: "88888888-8888-4888-8888-888888888888",
  versionNumber: 1,
};
