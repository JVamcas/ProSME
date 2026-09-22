"use client";

import {
  ArrowLeft,
  ChevronRight,
  Crown,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

import { EditButton } from "@/components/ui/action-buttons";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  CapabilityRow,
  RoleAccessRow,
  UserAccessRow,
} from "@/modules/users/UserAccessTypes";
import { RolePermissionGroups } from "./RolePermissionGroups";
import { UserIdentity, UserStatus } from "./UserListPrimitives";
import { UserRoleEditor } from "./UserRoleEditor";

type RoleTab = "permissions" | "users";

type Props = {
  canManageRoles: boolean;
  capabilities: CapabilityRow[];
  roles: RoleAccessRow[];
  users: UserAccessRow[];
};

export function RoleCapabilitiesPanel({
  canManageRoles,
  capabilities,
  roles,
  users,
}: Props) {
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? "");
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const selectedRole = roles.find((role) => role.id === selectedId) ?? roles[0];

  if (!selectedRole) {
    return (
      <p className="p-8 text-center text-sm text-slate-500">
        No roles are configured.
      </p>
    );
  }

  function selectRole(role: RoleAccessRow) {
    setSelectedId(role.id);
    setMobileDetailOpen(true);
  }

  return (
    <div className="min-h-[560px] md:grid md:h-[calc(100dvh-8rem)] md:min-h-0 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        className={cn(
          "border-slate-200 md:h-full md:overflow-y-auto md:overscroll-contain md:border-r",
          mobileDetailOpen && "hidden md:block",
        )}
      >
        <div className="space-y-3 p-4 md:space-y-0 md:p-0">
          {roles.map((role, index) => (
            <RoleListItem
              active={role.id === selectedRole.id}
              index={index}
              key={role.id}
              onClick={() => selectRole(role)}
              role={role}
            />
          ))}
        </div>
      </aside>
      <main
        className={cn(
          "md:min-h-0 md:overflow-hidden",
          !mobileDetailOpen && "hidden md:block",
        )}
      >
        <button
          className="m-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 md:hidden"
          onClick={() => setMobileDetailOpen(false)}
          type="button"
        >
          <ArrowLeft className="size-4" /> All roles
        </button>
        <RoleDetail
          canManageRoles={canManageRoles}
          capabilities={capabilities}
          onEdit={() => setEditing(true)}
          role={selectedRole}
          users={users.filter((user) =>
            user.roleCodes.includes(selectedRole.code),
          )}
        />
      </main>
      <DraggableDialog
        isOpen={editing}
        onClose={() => setEditing(false)}
        size="xl"
        title={`Edit ${selectedRole.name}`}
      >
        <UserRoleEditor
          key={selectedRole.id}
          capabilities={capabilities}
          onDone={() => setEditing(false)}
          role={selectedRole}
        />
      </DraggableDialog>
    </div>
  );
}

function RoleListItem({
  active,
  index,
  onClick,
  role,
}: {
  active: boolean;
  index: number;
  onClick: () => void;
  role: RoleAccessRow;
}) {
  const Icon = index === 0 ? Crown : UsersRound;
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 border border-slate-200 p-4 text-left transition md:border-x-0 md:border-t-0",
        "rounded-xl shadow-sm md:rounded-none md:shadow-none",
        active ? "bg-blue-50/80" : "bg-white hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl",
          active ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-brand-navy",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-brand-navy">{role.name}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-4 text-slate-500">
          {role.description || "Custom access role"}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
        <UsersRound className="size-3.5" /> {role.assignedUserCount}
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-400 md:hidden" />
    </button>
  );
}

function RoleDetail({
  canManageRoles,
  capabilities,
  onEdit,
  role,
  users,
}: {
  canManageRoles: boolean;
  capabilities: CapabilityRow[];
  onEdit: () => void;
  role: RoleAccessRow;
  users: UserAccessRow[];
}) {
  const tabs: TabItem<RoleTab>[] = [
    {
      content: <RolePermissionGroups capabilities={capabilities} role={role} />,
      id: "permissions",
      label: "Permissions",
    },
    {
      content: <AssignedUsers users={users} />,
      id: "users",
      label: `Users (${role.assignedUserCount})`,
    },
  ];
  return (
    <div className="md:h-full md:min-h-0">
      <Tabs
        ariaLabel={`${role.name} details`}
        className="md:flex md:h-full md:min-h-0 md:flex-col"
        defaultSelectedId="permissions"
        items={tabs}
        leadingContent={
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-4 pb-4 md:p-5">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600 md:hidden">
                  <ShieldCheck className="size-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-brand-navy">
                    {role.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {role.description || "Custom access role"}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500 md:hidden">
                <UsersRound className="size-4" /> {role.assignedUserCount} users
              </p>
            </div>
            {canManageRoles ? (
              <EditButton onClick={onEdit} title="Edit role" />
            ) : null}
          </div>
        }
        listClassName="md:relative md:z-10 md:shrink-0"
        panelClassName="px-4 md:mt-0 md:min-h-0 md:flex-1 md:overflow-y-auto md:overscroll-contain md:px-5 md:pt-6 md:pb-5 md:[mask-image:linear-gradient(to_bottom,transparent_0,black_1.5rem)]"
        tabListClassName="px-4 md:px-5"
      />
    </div>
  );
}

const assignedUserColumns: DataTableColumn<UserAccessRow>[] = [
  {
    accessorKey: "displayName",
    header: "Name",
    cell: ({ row }) => <UserIdentity user={row.original} />,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <UserStatus status={row.original.status} />,
  },
];

function AssignedUsers({ users }: { users: UserAccessRow[] }) {
  return (
    <DataTable
      columns={assignedUserColumns}
      data={users}
      density="compact"
      emptyMessage="No users are assigned to this role."
      minWidth={560}
      rowKey={(user) => user.id}
    />
  );
}
