import { fundingCallPermissionCatalogue } from "./FundingCallPermissionCatalogue";
import {
  cmsPermissionActions,
  cmsPermissionCode,
  cmsPermissionResources,
  permissionCodes,
  type PermissionCode,
  type StaticPermissionCode,
} from "./PermissionCodes";
import { integrationPermissionCatalogue } from "./IntegrationPermissionCatalogue";
import { brandingPermissionCatalogue } from "./BrandingPermissionCatalogue";
import { notificationPermissionCatalogue } from "./NotificationPermissionCatalogue";
import { workflowTaskPermissionCatalogue } from "./WorkflowTaskPermissionCatalogue";
import { workflowInstancePermissionCatalogue } from "./WorkflowInstancePermissionCatalogue";

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
    permissionCodes.reportingDatasetReadAll,
    "Read system reporting datasets",
    "Read versioned dataset definitions and approved columns. Source data access requires its separate contextual permission.",
  ),
  define(
    permissionCodes.reportingQueryExecuteAll,
    "Execute approved reporting queries across authorized sources",
    "Execute validated read queries against one system dataset. Requires dataset read and the dataset's source permissions; does not grant source access itself.",
  ),
  define(
    permissionCodes.reportingWebsiteReadAll,
    "Read website analytics across all funding calls",
    "Read consent-based website metrics and anonymous advisory eligibility aggregates for any funding call. Does not grant access to applicant records or report scheduling.",
  ),
  ...brandingPermissionCatalogue,
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
  ...fundingCallPermissionCatalogue,
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
    permissionCodes.fundingApplicationDraftOwnDelete,
    "Delete own application drafts",
    "Delete an unsubmitted funding application draft owned by the signed-in user.",
  ),
  define(
    permissionCodes.fundingApplicationSubmit,
    "Submit applications",
    "Submit an owned funding application.",
  ),
  define(
    permissionCodes.fundingApplicationOwnWithdraw,
    "Withdraw own submitted applications",
    "Withdraw a submitted application owned by the signed-in user while processing is active.",
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
    permissionCodes.fundingApplicationInformationRequestAssignedClose,
    "Close assigned information requests",
    "Close information requests for workflow tasks assigned to the signed-in user.",
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
  ...workflowTaskPermissionCatalogue,
  ...workflowInstancePermissionCatalogue,
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
  ...notificationPermissionCatalogue,
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
