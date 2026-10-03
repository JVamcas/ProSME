import type { Metadata } from "next";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requireAnyPermission } from "@/auth/authorization/policy";
import { UserAccessWorkspace } from "@/modules/users/ui/UserAccessWorkspace";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersAccessPage() {
  const user = await getAuthenticatedPageUser();
  requireAnyPermission(user, [
    permissionCodes.userRead,
    permissionCodes.userManage,
    permissionCodes.roleRead,
    permissionCodes.roleManage,
  ]);

  return (
    <PageShell
      description="Manage people, roles, and permissions."
      eyebrow="Administration"
      title="Users & Roles"
    >
      <UserAccessWorkspace
        canManageRoles={can(user, permissionCodes.roleManage)}
        canManageUsers={can(user, permissionCodes.userManage)}
        canReadRoles={
          can(user, permissionCodes.roleRead) ||
          can(user, permissionCodes.roleManage)
        }
        canReadUsers={
          can(user, permissionCodes.userRead) ||
          can(user, permissionCodes.userManage)
        }
      />
    </PageShell>
  );
}
