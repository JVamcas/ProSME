import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (user && can(user, permissionCodes.workflowFormRead)) {
    redirect("/admin/settings/forms");
  }
  if (user && can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/admin/notifications/channels");
  }
  redirect("/unauthorized");
}
