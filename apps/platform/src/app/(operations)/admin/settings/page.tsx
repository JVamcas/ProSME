import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";

export default async function SettingsPage() {
  const user = await getAuthenticatedPageUser();
  if (user && can(user, permissionCodes.brandingRead)) {
    redirect("/admin/settings/branding");
  }
  if (user && can(user, permissionCodes.workflowFormRead)) {
    redirect("/admin/settings/forms");
  }
  if (user && can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/admin/notifications/channels");
  }
  redirect("/unauthorized");
}
