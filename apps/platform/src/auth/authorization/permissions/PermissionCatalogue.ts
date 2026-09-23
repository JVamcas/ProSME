import {
  cmsPermissionActions,
  cmsPermissionCode,
  cmsPermissionResources,
  permissionCodes,
  type PermissionCode,
  type StaticPermissionCode,
} from "./PermissionCodes";
import { integrationPermissionCatalogue } from "./IntegrationPermissionCatalogue";

export type PermissionDefinition = {
  code: PermissionCode;
  description: string;
  label: string;
};

function define(
  code: StaticPermissionCode,
  label: string,
  description: string,
): PermissionDefinition {
  return { code, description, label };
}

const staticPermissionCatalogue: readonly PermissionDefinition[] = [
  define(
    permissionCodes.userRead,
    "Read users",
    "Read platform users and their effective access.",
  ),
  define(
    permissionCodes.userManage,
    "Manage users",
    "Manage user status and access.",
  ),
  define(
    permissionCodes.userProfileOwnRead,
    "Read own profile",
    "Read the signed-in user's profile.",
  ),
  define(
    permissionCodes.userProfileOwnUpdate,
    "Update own profile",
    "Update the signed-in user's profile.",
  ),
  define(
    permissionCodes.businessOwnRead,
    "Read own business",
    "Read businesses owned by the signed-in user.",
  ),
  define(
    permissionCodes.businessOwnUpdate,
    "Update own business",
    "Update businesses owned by the signed-in user.",
  ),
  define(
    permissionCodes.fundingCallRead,
    "Read funding calls",
    "Read funding calls.",
  ),
  define(
    permissionCodes.fundingCallCreate,
    "Create funding calls",
    "Create funding calls.",
  ),
  define(
    permissionCodes.fundingCallUpdate,
    "Update funding calls",
    "Update funding calls.",
  ),
  define(
    permissionCodes.fundingCallSubmitAll,
    "Submit funding calls",
    "Submit any draft funding call for governance approval.",
  ),
  define(
    permissionCodes.fundingCallApproveAll,
    "Approve funding calls",
    "Approve any pending funding call subject to maker-checker policy.",
  ),
  define(
    permissionCodes.fundingCallReturnAll,
    "Return funding calls",
    "Return any pending funding call to draft with a reason.",
  ),
  define(
    permissionCodes.fundingCallApprovalRequestOwnWithdraw,
    "Withdraw own funding call approval requests",
    "Withdraw an approval request submitted by the signed-in user when policy permits.",
  ),
  define(
    permissionCodes.fundingCallPublish,
    "Publish funding calls",
    "Publish funding calls.",
  ),
  define(
    permissionCodes.fundingCallDelete,
    "Delete funding calls",
    "Delete funding calls.",
  ),
  define(
    permissionCodes.fundingCallEligibilityCreate,
    "Run eligibility checks",
    "Create a funding-call eligibility assessment.",
  ),
  define(
    permissionCodes.fundingCallEligibilityOwnRead,
    "Read own eligibility checks",
    "Read eligibility assessments owned by the signed-in user.",
  ),
  define(
    permissionCodes.eligibilityRuleSetRead,
    "Read eligibility rulesets",
    "Read eligibility rulesets and their exact versions.",
  ),
  define(
    permissionCodes.eligibilityRuleSetCreate,
    "Create eligibility rulesets",
    "Create eligibility rulesets with an initial draft version.",
  ),
  define(
    permissionCodes.eligibilityRuleSetUpdate,
    "Update eligibility rulesets",
    "Update draft eligibility ruleset versions.",
  ),
  define(
    permissionCodes.eligibilityRuleSetPublish,
    "Publish eligibility rulesets",
    "Publish draft eligibility ruleset versions.",
  ),
  define(
    permissionCodes.eligibilityRuleSetRetire,
    "Retire eligibility rulesets",
    "Retire published eligibility ruleset versions.",
  ),
  define(
    permissionCodes.eligibilityQuestionRead,
    "Read eligibility questions",
    "Read reusable eligibility questions and their ruleset bindings.",
  ),
  define(
    permissionCodes.eligibilityQuestionCreate,
    "Create eligibility questions",
    "Create reusable eligibility questions.",
  ),
  define(
    permissionCodes.eligibilityQuestionUpdate,
    "Update eligibility questions",
    "Update reusable eligibility question definitions.",
  ),
  define(
    permissionCodes.fundingApplicationCreate,
    "Create applications",
    "Create funding applications.",
  ),
  define(
    permissionCodes.fundingApplicationOwnRead,
    "Read own applications",
    "Read funding applications owned by the signed-in user.",
  ),
  define(
    permissionCodes.fundingApplicationOwnUpdate,
    "Update own applications",
    "Update funding applications owned by the signed-in user.",
  ),
  define(
    permissionCodes.fundingApplicationSubmit,
    "Submit applications",
    "Submit an owned funding application.",
  ),
  define(
    permissionCodes.fundingApplicationAllRead,
    "Read all applications",
    "Read all funding applications.",
  ),
  define(
    permissionCodes.fundingApplicationBulkUpdate,
    "Bulk update applications",
    "Perform approved bulk application updates.",
  ),
  define(
    permissionCodes.fundingApplicationExport,
    "Export applications",
    "Export approved funding-application data.",
  ),
  define(
    permissionCodes.fundingApplicationDocumentOwnRead,
    "Read own application documents",
    "Read documents on an owned funding application.",
  ),
  define(
    permissionCodes.fundingApplicationDocumentOwnUpload,
    "Upload own application documents",
    "Upload documents to an owned funding application.",
  ),
  define(
    permissionCodes.fundingApplicationInformationRequestCreate,
    "Create information requests",
    "Request information for a funding application.",
  ),
  define(
    permissionCodes.fundingApplicationInformationRequestOwnRead,
    "Read own information requests",
    "Read information requests for an owned application.",
  ),
  define(
    permissionCodes.fundingApplicationInformationRequestOwnRespond,
    "Respond to own information requests",
    "Respond to information requests for an owned application.",
  ),
  define(
    permissionCodes.workflowTaskAssignedRead,
    "Read assigned tasks",
    "Read workflow tasks assigned to the signed-in user.",
  ),
  define(
    permissionCodes.workflowTaskAssignedProcess,
    "Process assigned tasks",
    "Process an assigned task using its configured actions.",
  ),
  define(
    permissionCodes.workflowTaskAssignedDecide,
    "Decide assigned tasks",
    "Complete an assigned task using its configured decision actions.",
  ),
  define(
    permissionCodes.workflowTaskClaim,
    "Claim tasks",
    "Claim an eligible workflow task.",
  ),
  define(
    permissionCodes.workflowTaskAssign,
    "Assign tasks",
    "Assign or reassign workflow tasks.",
  ),
  define(
    permissionCodes.workflowTaskCancelAll,
    "Cancel all tasks",
    "Cancel any active workflow task.",
  ),
  define(
    permissionCodes.workflowDefinitionRead,
    "Read workflow definitions",
    "Read workflow definitions and versions.",
  ),
  define(
    permissionCodes.workflowDefinitionCreate,
    "Create workflow definitions",
    "Create workflow definitions.",
  ),
  define(
    permissionCodes.workflowDefinitionUpdate,
    "Update workflow definitions",
    "Update workflow drafts and assignments.",
  ),
  define(
    permissionCodes.workflowDefinitionSubmit,
    "Submit all workflow templates for approval",
    "Submit any draft workflow template version for approval.",
  ),
  define(
    permissionCodes.workflowDefinitionReturn,
    "Return all workflow templates to draft",
    "Return any pending workflow template version to draft with a reason.",
  ),
  define(
    permissionCodes.workflowDefinitionApprove,
    "Approve all workflow templates",
    "Approve any pending workflow template version without publishing it.",
  ),
  define(
    permissionCodes.workflowDefinitionPublish,
    "Publish workflow definitions",
    "Publish validated workflow versions.",
  ),
  define(
    permissionCodes.workflowDefinitionRetire,
    "Retire workflow definitions",
    "Retire published workflow versions.",
  ),
  define(
    permissionCodes.workflowFormRead,
    "Read workflow forms",
    "Read workflow form definitions and versions.",
  ),
  define(
    permissionCodes.workflowFormCreate,
    "Create workflow forms",
    "Create workflow form definitions.",
  ),
  define(
    permissionCodes.workflowFormUpdate,
    "Update workflow forms",
    "Update workflow form drafts.",
  ),
  define(
    permissionCodes.workflowFormPublish,
    "Publish workflow forms",
    "Publish workflow form versions.",
  ),
  define(
    permissionCodes.workflowFormRetire,
    "Retire workflow forms",
    "Retire published workflow form versions.",
  ),
  define(
    permissionCodes.roleRead,
    "Read roles",
    "Read roles and their permission grants.",
  ),
  define(
    permissionCodes.roleManage,
    "Manage roles",
    "Manage role membership and permission grants.",
  ),
  define(
    permissionCodes.auditRead,
    "Read audit log",
    "Read authorization audit events.",
  ),
  define(
    permissionCodes.userNotificationOwnRead,
    "Read own notifications",
    "Read notifications belonging to the signed-in user.",
  ),
  define(
    permissionCodes.cmsAccess,
    "Access content management",
    "Access the content-management interface.",
  ),
  define(
    permissionCodes.cmsPrincipalsManage,
    "Manage CMS principals",
    "Manage CMS principal mirrors.",
  ),
  define(
    permissionCodes.cmsAuditRead,
    "Read CMS audit log",
    "Read content-management audit events.",
  ),
  ...integrationPermissionCatalogue,
];

const cmsPermissionCatalogue: readonly PermissionDefinition[] =
  cmsPermissionResources.flatMap((resource) =>
    cmsPermissionActions.map((action) => ({
      code: cmsPermissionCode(resource, action),
      description: `${formatSegment(action)} ${formatSegment(resource)} content.`,
      label: `${formatSegment(action)} ${formatSegment(resource)}`,
    })),
  );

export const permissionCatalogue: readonly PermissionDefinition[] = [
  ...staticPermissionCatalogue,
  ...cmsPermissionCatalogue,
];

const definitionsByCode = new Map(
  permissionCatalogue.map((permission) => [permission.code, permission]),
);

export function isPermissionCode(code: string): code is PermissionCode {
  return definitionsByCode.has(code as PermissionCode);
}

export function getPermissionDefinition(
  code: PermissionCode,
): PermissionDefinition {
  const definition = definitionsByCode.get(code);
  if (definition) return definition;

  const [, resource, action] = code.split(".");
  const resourceLabel = formatSegment(resource);
  const actionLabel = formatSegment(action);
  return {
    code,
    description: `${actionLabel} ${resourceLabel} content.`,
    label: `${actionLabel} ${resourceLabel}`,
  };
}

function formatSegment(value: string | undefined) {
  if (!value) return "CMS";
  const words = value.replaceAll("-", " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}
