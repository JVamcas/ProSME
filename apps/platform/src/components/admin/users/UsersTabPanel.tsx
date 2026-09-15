"use client";

import { MoreHorizontal, Search, UserRoundCheck } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DataTableFilter } from "@/components/ui/data-table-filter";
import { Input } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { useUpdateUserAccess } from "@/modules/users/UserAccessHooks";
import type { UserAccessRow } from "@/modules/users/UserAccessTypes";

function UserRowActions({
  canManageRoles,
  canManageUsers,
  onEditRoles,
  onPromote,
  user,
}: {
  canManageRoles: boolean;
  canManageUsers: boolean;
  onEditRoles: () => void;
  onPromote: () => void;
  user: UserAccessRow;
}) {
  const [open, setOpen] = useState(false);
  const update = useUpdateUserAccess();
  const canActivate = user.emailVerified || user.status === "active";

  function changeStatus() {
    update.mutate({
      input: { status: user.status === "active" ? "suspended" : "active" },
      userId: user.id,
    });
    setOpen(false);
  }

  return (
    <div className="relative flex justify-end">
      <IconButton
        label={`Actions for ${user.displayName}`}
        onClick={() => setOpen((current) => !current)}
        variant="ghost"
      >
        <MoreHorizontal className="size-5" />
      </IconButton>
      {open ? (
        <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-brand-navy/10 bg-white p-1.5 shadow-xl">
          {canManageUsers &&
          user.userType === "applicant" &&
          user.emailVerified ? (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-brand-navy hover:bg-brand-cream"
              onClick={() => {
                onPromote();
                setOpen(false);
              }}
              type="button"
            >
              <UserRoundCheck className="size-4 text-brand-orange" />
              Promote to staff
            </button>
          ) : null}
          {canManageUsers && user.userType === "staff" && canActivate ? (
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-brand-navy hover:bg-brand-cream"
              disabled={update.isPending}
              onClick={changeStatus}
              type="button"
            >
              {user.status === "active" ? "Suspend user" : "Activate user"}
            </button>
          ) : null}
          {canManageRoles ? (
            <button
              className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-brand-navy hover:bg-brand-cream"
              onClick={() => {
                onEditRoles();
                setOpen(false);
              }}
              type="button"
            >
              Edit roles
            </button>
          ) : null}
          {update.error ? (
            <p className="px-3 py-2 text-xs text-red-700" role="alert">
              {update.error.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatLastLogin(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en-NA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function createColumns({
  canManageRoles,
  canManageUsers,
  onEditRoles,
  onPromote,
}: Omit<UsersTabPanelProps, "users">): DataTableColumn<UserAccessRow>[] {
  return [
    {
      accessorKey: "displayName",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.displayName}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "roleCodes",
      header: "Role(s)",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.roleCodes.length ? row.original.roleCodes.join(", ") : "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last login",
      cell: ({ row }) => formatLastLogin(row.original.lastLoginAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <UserRowActions
          canManageRoles={canManageRoles}
          canManageUsers={canManageUsers}
          onEditRoles={() => onEditRoles(row.original)}
          onPromote={() => onPromote(row.original)}
          user={row.original}
        />
      ),
    },
  ];
}

type UsersTabPanelProps = {
  canManageRoles: boolean;
  canManageUsers: boolean;
  onEditRoles: (user: UserAccessRow) => void;
  onPromote: (user: UserAccessRow) => void;
  users: UserAccessRow[];
};

export function UsersTabPanel({
  canManageRoles,
  canManageUsers,
  onEditRoles,
  onPromote,
  users,
}: UsersTabPanelProps) {
  const [search, setSearch] = useState("");
  const columns = createColumns({
    canManageRoles,
    canManageUsers,
    onEditRoles,
    onPromote,
  });
  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    return (
      !term || `${user.displayName} ${user.email}`.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <DataTableFilter
        className="rounded-none border-x-0 border-t-0"
        collapsible={false}
        contentClassName="mt-3"
        isClearDisabled={!search}
        onClear={() => setSearch("")}
        title="User filters"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-orange" />
          <Input
            aria-label="Search users"
            className="h-10 pl-10"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users..."
            value={search}
          />
        </div>
      </DataTableFilter>
      <DataTable
        columns={columns}
        data={filteredUsers}
        emptyMessage="No users match your search."
        minWidth={820}
      />
    </div>
  );
}
