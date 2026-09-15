import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can, requireAnyCapability } from "@/auth/authorization/policy";
import { UserAccessWorkspace } from "@/components/admin/users/UserAccessWorkspace";
import { ProfilePageHeader } from "@/components/applicant/profile/ProfilePageHeader";

export const metadata: Metadata = { title: "Users & access" };

export default async function UsersAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin/users");
  requireAnyCapability(user, [
    capabilities.userRead,
    capabilities.userManage,
    capabilities.roleRead,
    capabilities.roleManage,
  ]);

  return (
    <section>
      <ProfilePageHeader
        title="Users & access"
        eyebrow="Administration"
        description="Manage user access."
      />
      <UserAccessWorkspace
        canManageRoles={can(user, capabilities.roleManage)}
        canManageUsers={can(user, capabilities.userManage)}
        canReadRoles={
          can(user, capabilities.roleRead) || can(user, capabilities.roleManage)
        }
      />
    </section>
  );
}
