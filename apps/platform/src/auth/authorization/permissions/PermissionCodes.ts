export const cmsPermissionActions = [
  "read",
  "create",
  "update",
  "publish",
  "delete",
] as const;

export const cmsPermissionResources = [
  "pages",
  "news",
  "resources",
  "events",
  "faqs",
  "eligibility",
  "statistics",
  "media",
  "site-settings",
  "engagement-submissions",
] as const;

export type CmsPermissionAction = (typeof cmsPermissionActions)[number];
export type CmsPermissionResource = (typeof cmsPermissionResources)[number];
export type CmsPermissionCode =
  `cms.${CmsPermissionResource}.${CmsPermissionAction}`;

export const permissionCodes = {
  userRead: "user.read",
  userManage: "user.manage",
  userProfileOwnRead: "user.profile.own.read",
  userProfileOwnUpdate: "user.profile.own.update",
  businessOwnRead: "business.own.read",
  businessOwnUpdate: "business.own.update",
  fundingCallRead: "funding.call.read",
  fundingCallCreate: "funding.call.create",
  fundingCallUpdate: "funding.call.update",
  fundingCallSubmitAll: "funding.call.submit.all",
  fundingCallApproveAll: "funding.call.approve.all",
  fundingCallReturnAll: "funding.call.return.all",
  fundingCallApprovalRequestOwnWithdraw:
    "funding.call.approval-request.own.withdraw",
  fundingCallPublish: "funding.call.publish",
  fundingCallDelete: "funding.call.delete",
  fundingCallEligibilityCreate: "funding.call.eligibility.create",
  fundingCallEligibilityOwnRead: "funding.call.eligibility.own.read",
  eligibilityRuleSetRead: "eligibility.ruleset.read",
  eligibilityRuleSetCreate: "eligibility.ruleset.create",
  eligibilityRuleSetUpdate: "eligibility.ruleset.update",
  eligibilityRuleSetPublish: "eligibility.ruleset.publish",
  eligibilityRuleSetRetire: "eligibility.ruleset.retire",
  eligibilityQuestionRead: "eligibility.question.read",
  eligibilityQuestionCreate: "eligibility.question.create",
  eligibilityQuestionUpdate: "eligibility.question.update",
  fundingApplicationCreate: "funding.application.create",
  fundingApplicationOwnRead: "funding.application.own.read",
  fundingApplicationOwnUpdate: "funding.application.own.update",
  fundingApplicationDraftOwnDelete: "funding.application.draft.own.delete",
  fundingApplicationSubmit: "funding.application.submit",
  fundingApplicationOwnWithdraw: "funding.application.own.withdraw",
  fundingApplicationAllRead: "funding.application.all.read",
  fundingApplicationBulkUpdate: "funding.application.bulk-update",
  fundingApplicationExport: "funding.application.export",
  fundingApplicationDocumentOwnRead: "funding.application.document.own.read",
  fundingApplicationDocumentOwnUpload:
    "funding.application.document.own.upload",
  fundingApplicationInformationRequestCreate:
    "funding.application.information-request.create",
  fundingApplicationInformationRequestOwnRead:
    "funding.application.information-request.own.read",
  fundingApplicationInformationRequestOwnRespond:
    "funding.application.information-request.own.respond",
  workflowTaskAssignedRead: "workflow.task.assigned.read",
  workflowTaskAssignedProcess: "workflow.task.assigned.process",
  workflowTaskAssignedDecide: "workflow.task.assigned.decide",
  workflowTaskClaim: "workflow.task.claim",
  workflowTaskAssign: "workflow.task.assign",
  workflowQuorumAllRecord: "workflow.quorum.all.record",
  workflowCoiAllReview: "workflow.coi.all.review",
  workflowTaskCancelAll: "workflow.task.cancel.all",
  workflowDefinitionRead: "workflow.definition.read",
  workflowDefinitionCreate: "workflow.definition.create",
  workflowDefinitionUpdate: "workflow.definition.update",
  workflowDefinitionSubmit: "workflow.definition.submit.all",
  workflowDefinitionReturn: "workflow.definition.return.all",
  workflowDefinitionApprove: "workflow.definition.approve.all",
  workflowDefinitionPublish: "workflow.definition.publish",
  workflowDefinitionRetire: "workflow.definition.retire",
  workflowFormRead: "workflow.form.read",
  workflowFormCreate: "workflow.form.create",
  workflowFormUpdate: "workflow.form.update",
  workflowFormPublish: "workflow.form.publish",
  workflowFormRetire: "workflow.form.retire",
  workflowTaskReassign: "workflow.task.reassign",
  workflowTaskDelegate: "workflow.task.delegate",
  workflowTaskAllRead: "workflow.task.all.read",
  workflowTaskPoolRead: "workflow.task.pool.read",
  workflowInstanceAllRead: "workflow.instance.all.read",
  roleRead: "role.read",
  roleManage: "role.manage",
  auditRead: "audit.read",
  userNotificationOwnRead: "user.notification.own.read",
  cmsAccess: "cms.access",
  cmsPrincipalsManage: "cms.principals.manage",
  cmsAuditRead: "cms.audit.read",
  integrationEligibilityRead: "integration.eligibility.read",
  integrationEligibilityCreate: "integration.eligibility.create",
  integrationEligibilityPublish: "integration.eligibility.publish",
  integrationEligibilityBind: "integration.eligibility.bind",
  integrationEligibilityExecute: "integration.eligibility.execute",
  integrationEligibilityManualVerify: "integration.eligibility.manual-verify",
  integrationErpEnqueue: "integration.erp.enqueue",
} as const;

export type StaticPermissionCode =
  (typeof permissionCodes)[keyof typeof permissionCodes];
export const staticPermissionCodes = Object.values(permissionCodes) as [
  StaticPermissionCode,
  ...StaticPermissionCode[],
];
export type PermissionCode = StaticPermissionCode | CmsPermissionCode;

export function cmsPermissionCode(
  resource: CmsPermissionResource,
  action: CmsPermissionAction,
): CmsPermissionCode {
  return `cms.${resource}.${action}`;
}
