import {
  permissionCodes,
  type PermissionCode,
  type StaticPermissionCode,
} from "./PermissionCodes";

export type PermissionGroupId =
  | "user"
  | "business"
  | "funding-calls"
  | "funding-applications"
  | "workflow-tasks"
  | "workflow-configuration"
  | "roles"
  | "audit"
  | "notifications"
  | "content-management"
  | "integrations";

export type PermissionGroup = {
  id: PermissionGroupId;
  label: string;
  permissionCodes: readonly StaticPermissionCode[];
  permissionPrefixes?: readonly string[];
};

export const permissionGroups: readonly PermissionGroup[] = [
  {
    id: "user",
    label: "User",
    permissionCodes: [
      permissionCodes.userRead,
      permissionCodes.userManage,
      permissionCodes.userProfileOwnRead,
      permissionCodes.userProfileOwnUpdate,
    ],
  },
  {
    id: "business",
    label: "Business",
    permissionCodes: [
      permissionCodes.businessOwnRead,
      permissionCodes.businessOwnUpdate,
    ],
  },
  {
    id: "funding-calls",
    label: "Funding Calls",
    permissionCodes: [
      permissionCodes.fundingCallRead,
      permissionCodes.fundingCallCreate,
      permissionCodes.fundingCallUpdate,
      permissionCodes.fundingCallPublish,
      permissionCodes.fundingCallDelete,
      permissionCodes.fundingCallEligibilityCreate,
      permissionCodes.fundingCallEligibilityOwnRead,
    ],
  },
  {
    id: "funding-applications",
    label: "Funding Applications",
    permissionCodes: [
      permissionCodes.fundingApplicationCreate,
      permissionCodes.fundingApplicationOwnRead,
      permissionCodes.fundingApplicationOwnUpdate,
      permissionCodes.fundingApplicationSubmit,
      permissionCodes.fundingApplicationAllRead,
      permissionCodes.fundingApplicationBulkUpdate,
      permissionCodes.fundingApplicationExport,
      permissionCodes.fundingApplicationDocumentOwnRead,
      permissionCodes.fundingApplicationDocumentOwnUpload,
      permissionCodes.fundingApplicationInformationRequestCreate,
      permissionCodes.fundingApplicationInformationRequestOwnRead,
      permissionCodes.fundingApplicationInformationRequestOwnRespond,
    ],
  },
  {
    id: "workflow-tasks",
    label: "Workflow Tasks",
    permissionCodes: [
      permissionCodes.workflowTaskAssignedRead,
      permissionCodes.workflowTaskAssignedProcess,
      permissionCodes.workflowTaskAssignedDecide,
      permissionCodes.workflowTaskClaim,
      permissionCodes.workflowTaskAssign,
    ],
  },
  {
    id: "workflow-configuration",
    label: "Workflow Configuration",
    permissionCodes: [
      permissionCodes.workflowDefinitionRead,
      permissionCodes.workflowDefinitionCreate,
      permissionCodes.workflowDefinitionUpdate,
      permissionCodes.workflowDefinitionSubmit,
      permissionCodes.workflowDefinitionReturn,
      permissionCodes.workflowDefinitionApprove,
      permissionCodes.workflowDefinitionPublish,
      permissionCodes.workflowDefinitionRetire,
      permissionCodes.workflowFormRead,
      permissionCodes.workflowFormCreate,
      permissionCodes.workflowFormUpdate,
      permissionCodes.workflowFormPublish,
      permissionCodes.workflowFormRetire,
    ],
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    permissionCodes: [permissionCodes.roleRead, permissionCodes.roleManage],
  },
  {
    id: "audit",
    label: "Audit",
    permissionCodes: [permissionCodes.auditRead],
  },
  {
    id: "notifications",
    label: "Notifications",
    permissionCodes: [permissionCodes.userNotificationOwnRead],
  },
  {
    id: "content-management",
    label: "Content Management",
    permissionCodes: [
      permissionCodes.cmsAccess,
      permissionCodes.cmsPrincipalsManage,
      permissionCodes.cmsAuditRead,
    ],
    permissionPrefixes: ["cms."],
  },
  {
    id: "integrations",
    label: "Integrations",
    permissionCodes: [permissionCodes.integrationErpEnqueue],
  },
];

export function getPermissionGroup(
  code: PermissionCode,
): PermissionGroup | undefined {
  return permissionGroups.find(
    (group) =>
      group.permissionCodes.some((permission) => permission === code) ||
      group.permissionPrefixes?.some((prefix) => code.startsWith(prefix)),
  );
}
