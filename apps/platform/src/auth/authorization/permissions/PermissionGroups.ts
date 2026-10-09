import {
  permissionCodes,
  type PermissionCode,
  type StaticPermissionCode,
} from "./PermissionCodes";

export type PermissionGroupId =
  | "user"
  | "business"
  | "funding-calls"
  | "eligibility-configuration"
  | "funding-applications"
  | "workflow-tasks"
  | "workflow-instances"
  | "workflow-configuration"
  | "roles"
  | "audit"
  | "branding"
  | "notifications"
  | "content-management"
  | "integrations"
  | "reporting";

export type PermissionGroup = {
  id: PermissionGroupId;
  label: string;
  permissionCodes: readonly StaticPermissionCode[];
  permissionPrefixes?: readonly string[];
};

export const permissionGroups: readonly PermissionGroup[] = [
  {
    id: "reporting",
    label: "Website Analytics and Reporting",
    permissionCodes: [
      permissionCodes.reportingDatasetReadAll,
      permissionCodes.reportingTemplateReadAll,
      permissionCodes.reportingTemplateCreateAll,
      permissionCodes.reportingTemplateUpdateAll,
      permissionCodes.reportingTemplatePublishAll,
      permissionCodes.reportingReportReadAll,
      permissionCodes.reportingReportCreateAll,
      permissionCodes.reportingReportUpdateAll,
      permissionCodes.reportingReportRunAll,
      permissionCodes.reportingScheduleUpdateAll,
      permissionCodes.reportingDeliveryUpdateAll,
      permissionCodes.reportingRunReadAll,
      permissionCodes.reportingRunDownloadAll,

      permissionCodes.reportingQueryExecuteAll,
      permissionCodes.reportingWebsiteReadAll,
    ],
  },
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
      permissionCodes.fundingCallEditDraft,
      permissionCodes.fundingCallSubmitAll,
      permissionCodes.fundingCallReturnAll,
      permissionCodes.fundingCallWithdrawForAmendmentAll,
      permissionCodes.fundingCallApproveAll,
      permissionCodes.fundingCallApprovalRequestOwnWithdraw,
      permissionCodes.fundingCallPublish,
      permissionCodes.fundingCallSuspend,
      permissionCodes.fundingCallResume,
      permissionCodes.fundingCallWithdraw,
      permissionCodes.fundingCallArchive,
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
      permissionCodes.fundingApplicationDraftOwnDelete,
      permissionCodes.fundingApplicationSubmit,
      permissionCodes.fundingApplicationOwnWithdraw,
      permissionCodes.fundingApplicationAllRead,
      permissionCodes.fundingApplicationBulkUpdate,
      permissionCodes.fundingApplicationExport,
      permissionCodes.fundingApplicationDocumentOwnRead,
      permissionCodes.fundingApplicationDocumentOwnUpload,
      permissionCodes.fundingApplicationInformationRequestCreate,
      permissionCodes.fundingApplicationInformationRequestAssignedClose,
      permissionCodes.fundingApplicationInformationRequestOwnRead,
      permissionCodes.fundingApplicationInformationRequestOwnRespond,
    ],
  },
  {
    id: "eligibility-configuration",
    label: "Eligibility Configuration",
    permissionCodes: [
      permissionCodes.eligibilityRuleSetRead,
      permissionCodes.eligibilityRuleSetCreate,
      permissionCodes.eligibilityRuleSetUpdate,
      permissionCodes.eligibilityRuleSetPublish,
      permissionCodes.eligibilityRuleSetRetire,
      permissionCodes.eligibilityQuestionRead,
      permissionCodes.eligibilityQuestionCreate,
      permissionCodes.eligibilityQuestionUpdate,
    ],
  },
  {
    id: "workflow-tasks",
    label: "Workflow Tasks",
    permissionCodes: [
      permissionCodes.workflowTaskAssignedHold,
      permissionCodes.workflowTaskAssignedResume,
      permissionCodes.workflowStageAllHold,
      permissionCodes.workflowStageAllResume,
      permissionCodes.workflowInstanceAllHold,
      permissionCodes.workflowInstanceAllResume,
      permissionCodes.workflowTaskAssignedRead,
      permissionCodes.workflowTaskAssignedProcess,
      permissionCodes.workflowEscalationOwnCancel,
      permissionCodes.workflowTaskAssignedDecide,
      permissionCodes.workflowTaskAssign,
      permissionCodes.workflowQuorumAllRecord,
      permissionCodes.workflowCoiAllReview,
      permissionCodes.workflowTaskCancelAll,
      permissionCodes.workflowTaskReassign,
      permissionCodes.workflowTaskDelegate,
      permissionCodes.workflowTaskAllRead,
    ],
  },
  {
    id: "workflow-instances",
    label: "Workflow Instances",
    permissionCodes: [
      permissionCodes.workflowInstanceAssignedRead,
      permissionCodes.workflowInstanceAllRead,
      permissionCodes.workflowDeadlineAllProcess,
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
    id: "branding",
    label: "Branding",
    permissionCodes: [
      permissionCodes.brandingRead,
      permissionCodes.brandingManage,
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    permissionCodes: [
      permissionCodes.userNotificationOwnRead,
      permissionCodes.notificationConfigurationRead,
      permissionCodes.notificationConfigurationUpdate,
      permissionCodes.notificationTemplateImport,
      permissionCodes.notificationTemplatePublish,
      permissionCodes.notificationDeliveryRead,
      permissionCodes.notificationDeliveryRetry,
    ],
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
    permissionCodes: [
      permissionCodes.integrationEligibilityRead,
      permissionCodes.integrationEligibilityCreate,
      permissionCodes.integrationEligibilityPublish,
      permissionCodes.integrationEligibilityBind,
      permissionCodes.integrationEligibilityExecute,
      permissionCodes.integrationEligibilityManualVerify,
      permissionCodes.integrationErpEnqueue,
    ],
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
