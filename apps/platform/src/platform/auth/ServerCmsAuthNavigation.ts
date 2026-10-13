import "server-only";

import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import {
  hasCmsCapability,
  type CmsRequestUser,
} from "@/payload/access/can-access-cms";

import { authNavigationHref } from "./AuthNavigation";

export async function getCmsLoginDestination(): Promise<string> {
  const applicationUser = await getCurrentUser();
  if (!applicationUser) {
    return authNavigationHref("/sign-in", "/cms");
  }

  if (!can(applicationUser, permissionCodes.cmsAccess)) {
    return "/cms/unauthorized";
  }

  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });

  // Returning to CMS is safe only when its own authentication accepts the user.
  return hasCmsCapability(user as CmsRequestUser, permissionCodes.cmsAccess)
    ? "/cms"
    : "/cms/unauthorized";
}
