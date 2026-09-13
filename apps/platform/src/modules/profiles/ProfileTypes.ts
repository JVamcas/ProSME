import type { ApplicantProfileInput } from "./ProfileSchemas";
import type { PortalSpace } from "@/auth/authorization/portal-access";
import type { AuthenticatedUser } from "@/auth/types";

export type ApplicantProfileView = ApplicantProfileInput & {
  email: string;
  updatedAt: string | null;
};

export type ApplicantDashboardSummary = {
  displayName: string;
  completion: {
    applicantProfile: boolean;
    businessProfile: boolean;
  };
};

export type PortalContext = {
  userId: string;
  displayName: string;
  email: string;
  status: AuthenticatedUser["status"];
  roleCodes: string[];
  capabilityCodes: string[];
  availableSpaces: PortalSpace[];
  defaultSpace: PortalSpace;
};
