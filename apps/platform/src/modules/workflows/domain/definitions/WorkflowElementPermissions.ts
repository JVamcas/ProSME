import {
  permissionCodes,
  type StaticPermissionCode,
} from "@/auth/authorization/permissions";

export const workflowElementVisibilities = [
  "APPLICANT_VISIBLE",
  "INTERNAL_ONLY",
] as const;

export type WorkflowElementVisibility =
  (typeof workflowElementVisibilities)[number];

export type WorkflowElementPermissions = {
  view: StaticPermissionCode;
  edit: StaticPermissionCode;
  decide: StaticPermissionCode;
  visibility: WorkflowElementVisibility;
};

export const defaultWorkflowElementPermissions: WorkflowElementPermissions = {
  view: permissionCodes.workflowTaskAssignedRead,
  edit: permissionCodes.workflowTaskAssignedProcess,
  decide: permissionCodes.workflowTaskAssignedDecide,
  visibility: "INTERNAL_ONLY",
};
