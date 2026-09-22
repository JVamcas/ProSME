import type { AuthenticatedUser } from "../types";
import { permissionCodes } from "./permissions";
import {
  AuthenticationRequiredError,
  can,
  PermissionDeniedError,
} from "./policy";

export type PortalSpace = "applicant" | "operations";

export const applicantScopePermissions = [
  permissionCodes.userProfileOwnRead,
  permissionCodes.userProfileOwnUpdate,
  permissionCodes.businessOwnRead,
  permissionCodes.businessOwnUpdate,
  permissionCodes.fundingCallEligibilityCreate,
  permissionCodes.fundingCallEligibilityOwnRead,
  permissionCodes.fundingApplicationCreate,
  permissionCodes.fundingApplicationOwnRead,
  permissionCodes.fundingApplicationOwnUpdate,
  permissionCodes.fundingApplicationSubmit,
  permissionCodes.fundingApplicationDocumentOwnRead,
  permissionCodes.fundingApplicationDocumentOwnUpload,
  permissionCodes.fundingApplicationInformationRequestOwnRead,
  permissionCodes.fundingApplicationInformationRequestOwnRespond,
  permissionCodes.userNotificationOwnRead,
] as const;

export const operationsScopePermissions = [
  permissionCodes.userRead,
  permissionCodes.userManage,
  permissionCodes.fundingCallCreate,
  permissionCodes.fundingCallUpdate,
  permissionCodes.fundingCallSubmitAll,
  permissionCodes.fundingCallApproveAll,
  permissionCodes.fundingCallReturnAll,
  permissionCodes.fundingCallPublish,
  permissionCodes.fundingCallDelete,
  permissionCodes.eligibilityRuleSetRead,
  permissionCodes.fundingApplicationAllRead,
  permissionCodes.fundingApplicationBulkUpdate,
  permissionCodes.fundingApplicationExport,
  permissionCodes.fundingApplicationInformationRequestCreate,
  permissionCodes.workflowTaskAssignedRead,
  permissionCodes.workflowTaskAssignedProcess,
  permissionCodes.workflowTaskAssignedDecide,
  permissionCodes.workflowTaskClaim,
  permissionCodes.workflowTaskAssign,
  permissionCodes.workflowTaskCancelAll,
  permissionCodes.workflowTaskPoolRead,
  permissionCodes.workflowDefinitionRead,
  permissionCodes.workflowFormRead,
  permissionCodes.roleRead,
  permissionCodes.roleManage,
  permissionCodes.auditRead,
  permissionCodes.integrationErpEnqueue,
] as const;

export function canAccessApplicantPortal(
  user: AuthenticatedUser | null,
): boolean {
  if (!user || user.status !== "active") {
    return false;
  }

  return applicantScopePermissions.some((permission) => {
    return user.capabilities.has(permission);
  });
}

export function canAccessOperationsPortal(
  user: AuthenticatedUser | null,
): boolean {
  return operationsScopePermissions.some((permission) => can(user, permission));
}

export function requireApplicantPortalAccess(
  user: AuthenticatedUser | null,
): AuthenticatedUser {
  if (!user) {
    throw new AuthenticationRequiredError();
  }

  if (!canAccessApplicantPortal(user)) {
    throw new PermissionDeniedError("applicant portal access");
  }

  return user;
}

export function requireOperationsPortalAccess(
  user: AuthenticatedUser | null,
): AuthenticatedUser {
  if (!user) {
    throw new AuthenticationRequiredError();
  }

  if (!canAccessOperationsPortal(user)) {
    throw new PermissionDeniedError("operations portal access");
  }

  return user;
}

export function getAvailablePortalSpaces(
  user: AuthenticatedUser,
): PortalSpace[] {
  const spaces: PortalSpace[] = [];

  if (canAccessApplicantPortal(user)) {
    spaces.push("applicant");
  }

  if (canAccessOperationsPortal(user)) {
    spaces.push("operations");
  }

  return spaces;
}

export function getDefaultPortalSpace(
  user: AuthenticatedUser,
): PortalSpace | null {
  if (canAccessOperationsPortal(user)) {
    return "operations";
  }

  if (canAccessApplicantPortal(user)) {
    return "applicant";
  }

  return null;
}

export function getDefaultAuthenticatedPath(
  user: AuthenticatedUser,
): string {
  const defaultSpace = getDefaultPortalSpace(user);

  if (defaultSpace === "operations") {
    return "/admin";
  }

  if (defaultSpace === "applicant") {
    return "/portal";
  }

  if (can(user, permissionCodes.cmsAccess)) {
    return "/cms";
  }

  return "/unauthorized";
}
