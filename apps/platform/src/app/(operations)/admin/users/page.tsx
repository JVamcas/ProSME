import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can, requireAnyPermission } from "@/auth/authorization/policy";
import { UserAccessWorkspace } from "@/components/admin/users/UserAccessWorkspace";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin/users");
  requireAnyPermission(user, [
    capabilities.userRead,
    capabilities.userManage,
    capabilities.roleRead,
    capabilities.roleManage,
  ]);

  return (
    <section>
      <PageHeader
        description="Manage people, roles, and permissions."
        eyebrow="Administration"
        title="Users & Roles"
      />
      <UserAccessWorkspace
        canManageRoles={can(user, capabilities.roleManage)}
        canManageUsers={can(user, capabilities.userManage)}
        canReadRoles={
          can(user, capabilities.roleRead) || can(user, capabilities.roleManage)
        }
        canReadUsers={
          can(user, capabilities.userRead) || can(user, capabilities.userManage)
        }
      />
    </section>
  );
}
