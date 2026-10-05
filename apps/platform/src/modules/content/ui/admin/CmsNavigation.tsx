import { getCurrentUser } from "@/auth/authorization/current-user";
import { getAvailablePortalSpaces } from "@/auth/authorization/portal-access";
import { can } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import CmsSidebar from "./CmsSidebar";

export default async function CmsNavigation() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.cmsAccess)) return null;

  return (
    <CmsSidebar
      availableSpaces={getAvailablePortalSpaces(user)}
      displayName={user.displayName}
      email={user.email}
    />
  );
}
