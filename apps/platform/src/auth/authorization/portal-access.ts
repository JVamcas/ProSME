import type { AuthenticatedUser } from "../types";
import { capabilities } from "./capabilities";
import {
  AuthenticationRequiredError,
  can,
  PermissionDeniedError,
} from "./policy";

export type PortalSpace = "applicant" | "operations";

export const applicantScopeCapabilities = [
  capabilities.profileReadOwn,
  capabilities.profileUpdateOwn,
  capabilities.businessReadOwn,
  capabilities.businessUpdateOwn,
  capabilities.eligibilityCreate,
  capabilities.eligibilityReadOwn,
  capabilities.applicationCreate,
  capabilities.applicationReadOwn,
  capabilities.applicationUpdateOwn,
  capabilities.applicationSubmit,
  capabilities.documentReadOwn,
  capabilities.documentUploadOwn,
  capabilities.informationRequestReadOwn,
  capabilities.informationRequestRespondOwn,
  capabilities.messageReadOwn,
  capabilities.notificationReadOwn,
  capabilities.resourceSaveOwn,
] as const;

export function canAccessApplicantPortal(
  user: AuthenticatedUser | null,
): boolean {
  if (!user || user.status !== "active") {
    return false;
  }

  return applicantScopeCapabilities.some((capability) => {
    return user.capabilities.has(capability);
  });
}

export function canAccessOperationsPortal(
  user: AuthenticatedUser | null,
): boolean {
  return can(user, capabilities.adminAccess);
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
    throw new PermissionDeniedError(capabilities.adminAccess);
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

  if (can(user, capabilities.cmsAccess)) {
    return "/cms";
  }

  return "/unauthorized";
}
