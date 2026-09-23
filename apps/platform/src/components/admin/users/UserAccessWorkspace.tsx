"use client";

import { useState } from "react";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useUserAccess } from "@/modules/users/UserAccessHooks";
import type { UserAccessRow } from "@/modules/users/UserAccessTypes";
import { UserRoleAssignmentPanel } from "./UserRoleAssignmentPanel";
import { UsersTabPanel } from "./UsersTabPanel";
import { RolePermissionsPanel } from "./RolePermissionsPanel";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { PortalErrorState } from "@/components/layout/PortalErrorState";

type AccessTab = "users" | "roles";

type Props = {
  canManageRoles: boolean;
  canManageUsers: boolean;
  canReadRoles: boolean;
  canReadUsers: boolean;
};

export function UserAccessWorkspace(props: Props) {
  const initialTab = props.canReadUsers ? "users" : "roles";
  const [editingUser, setEditingUser] = useState<UserAccessRow | null>(null);

  const query = useUserAccess({ limit: 100 });

  if (query.isPending) {
    return <PortalLoadingState title="" description="Just a moment..."/>
  }
  if (query.isError) {
    return <PortalErrorState title={query.error.name} description={query.error.message}/>
  }
  if (!query.data) return null;

  const view = query.data;
  const tabs: TabItem<AccessTab>[] = [];
  if (props.canReadUsers) {
    tabs.push({
      content: (
        <UsersTabPanel
          canManageRoles={props.canManageRoles}
          canManageUsers={props.canManageUsers}
          onEditRoles={setEditingUser}
          roles={view.roles}
          users={view.users}
        />
      ),
      id: "users",
      label: "Users",
    });
  }
  if (props.canReadRoles) {
    tabs.push({
      content: (
        <RolePermissionsPanel
          canManageRoles={props.canManageRoles}
          capabilities={view.capabilities}
          roles={view.roles}
          users={view.users}
        />
      ),
      id: "roles",
      label: "Roles",
    });
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 pt-2 shadow-[0_10px_35px_rgba(10,24,59,0.06)] sm:px-6">
      <div>
        <Tabs
          ariaLabel="User access sections"
          defaultSelectedId={initialTab}
          items={tabs}
        />
      </div>

      <DraggableDialog
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit user roles"
      >
        {editingUser ? (
          <UserRoleAssignmentPanel
            onClose={() => setEditingUser(null)}
            roles={view.roles}
            user={editingUser}
          />
        ) : null}
      </DraggableDialog>

    </section>
  );
}

