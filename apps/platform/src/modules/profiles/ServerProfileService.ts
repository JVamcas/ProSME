import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import {
  getAvailablePortalSpaces,
  getDefaultPortalSpace,
  requireApplicantPortalAccess,
} from "@/auth/authorization/portal-access";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findApplicantProfile,
  saveApplicantProfile,
} from "@/db/repositories/ProfileRepository";
import type { ApplicantProfileUpdateInput } from "./ProfileSchemas";
import type {
  ApplicantDashboardSummary,
  ApplicantProfileView,
  PortalContext,
} from "./ProfileTypes";

function isoDate(value: Date | null) {
  return value?.toISOString() ?? null;
}

function applicantProfileView(
  profile: NonNullable<Awaited<ReturnType<typeof findApplicantProfile>>>,
): ApplicantProfileView {
  return {
    ...profile,
    dateOfBirth: profile.dateOfBirth ?? "",
    updatedAt: isoDate(profile.updatedAt),
  };
}

export function createPortalContext(user: AuthenticatedUser): PortalContext {
  const defaultSpace = getDefaultPortalSpace(user);

  if (!defaultSpace) {
    throw new PermissionDeniedError("portal access");
  }

  return {
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    status: user.status,
    roleCodes: [...user.roleCodes].sort(),
    capabilityCodes: [...user.capabilities].sort(),
    availableSpaces: getAvailablePortalSpaces(user),
    defaultSpace,
  };
}

export function createApplicantPortalContext(
  user: AuthenticatedUser | null,
): PortalContext {
  return createPortalContext(requireApplicantPortalAccess(user));
}

export function createApplicantDashboardSummary(
  user: AuthenticatedUser | null,
): ApplicantDashboardSummary {
  const applicant = requireApplicantPortalAccess(user);

  return {
    displayName: applicant.displayName,
    completion: {
      applicantProfile: Boolean(applicant.profileComplete),
      businessProfile: Boolean(applicant.businessProfileComplete),
    },
  };
}

export async function getApplicantProfile(
  user: AuthenticatedUser | null,
): Promise<ApplicantProfileView> {
  const actor = requireCapability(user, capabilities.profileReadOwn);
  const profile = await findApplicantProfile(actor.id);

  if (profile) {
    return applicantProfileView(profile);
  }

  const names = actor.displayName.trim().split(/\s+/);
  return {
    firstName: names[0] ?? "",
    surname: names.slice(1).join(" "),
    position: "",
    phoneNumber: "",
    dateOfBirth: "",
    nationality: "Namibian",
    region: "",
    postalAddress: "",
    email: actor.email,
    updatedAt: null,
  };
}

export async function updateApplicantProfile(
  user: AuthenticatedUser | null,
  input: ApplicantProfileUpdateInput,
): Promise<ApplicantProfileView> {
  const actor = requireCapability(user, capabilities.profileUpdateOwn);
  await saveApplicantProfile(actor.id, input);
  const profile = await findApplicantProfile(actor.id);

  if (!profile) {
    throw new Error("The saved applicant profile could not be reloaded");
  }

  return applicantProfileView(profile);
}
