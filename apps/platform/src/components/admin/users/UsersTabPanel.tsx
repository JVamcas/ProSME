"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/form-controls";
import { Pagination } from "@/components/ui/pagination";
import type {
  RoleAccessRow,
  UserAccessRow,
} from "@/modules/users/UserAccessTypes";
import {
  formatLastActive,
  RolePills,
  UserIdentity,
  UserRowActions,
  UserStatus,
} from "./UserListPrimitives";

const PAGE_SIZE = 8;

export type UsersTabPanelProps = {
  canManageRoles: boolean;
  canManageUsers: boolean;
  onEditRoles: (user: UserAccessRow) => void;
  roles: RoleAccessRow[];
  users: UserAccessRow[];
};

function createColumns(
  props: UsersTabPanelProps,
): DataTableColumn<UserAccessRow>[] {
  return [
    {
      accessorKey: "displayName",
      header: "Name",
      cell: ({ row }) => <UserIdentity user={row.original} />,
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "roleCodes",
      header: "Roles",
      enableSorting: false,
      cell: ({ row }) => <RolePills codes={row.original.roleCodes} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <UserStatus status={row.original.status} />,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last active",
      cell: ({ row }) => formatLastActive(row.original.lastLoginAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => <UserRowActions {...props} user={row.original} />,
    },
  ];
}

export function UsersTabPanel(props: UsersTabPanelProps) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const filteredUsers = useMemo(
    () => filterUsers(props.users, search, role, status),
    [props.users, role, search, status],
  );
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount);
  const visibleUsers = filteredUsers.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const columns = createColumns(props);

  return (
    <div className="p-4 sm:p-6">
      <UserFilters
        onRoleChange={(value) => {
          setRole(value);
          setPage(1);
        }}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        role={role}
        roles={props.roles}
        search={search}
        status={status}
      />
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={visibleUsers}
          emptyMessage="No users match your filters."
          footer={
            <Pagination
              hasNextPage={activePage < pageCount}
              onNext={() => setPage(activePage + 1)}
              onPrevious={() => setPage(activePage - 1)}
              page={activePage}
              pageSize={PAGE_SIZE}
              total={filteredUsers.length}
            />
          }
          minWidth={880}
        />
      </div>
      <div className="space-y-3 md:hidden">
        {visibleUsers.map((user) => (
          <MobileUserCard key={user.id} props={props} user={user} />
        ))}
        {!visibleUsers.length ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No users match your filters.
          </p>
        ) : null}
        <Pagination
          hasNextPage={activePage < pageCount}
          onNext={() => setPage(activePage + 1)}
          onPrevious={() => setPage(activePage - 1)}
          page={activePage}
          pageSize={PAGE_SIZE}
          total={filteredUsers.length}
        />
      </div>
    </div>
  );
}

function filterUsers(
  users: UserAccessRow[],
  search: string,
  role: string,
  status: string,
) {
  const term = search.trim().toLowerCase();
  return users.filter((user) => {
    const matchesSearch =
      !term ||
      `${user.displayName} ${user.email} ${user.roleCodes.join(" ")}`
        .toLowerCase()
        .includes(term);
    return (
      matchesSearch &&
      (!role || user.roleCodes.includes(role)) &&
      (!status || user.status === status)
    );
  });
}

function UserFilters(props: {
  onRoleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  role: string;
  roles: RoleAccessRow[];
  search: string;
  status: string;
}) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem]">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-10 rounded-lg border-slate-200 pl-10"
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Search by name, email, or role…"
          value={props.search}
        />
      </div>
      <Select
        className="h-10 rounded-lg border-slate-200"
        onChange={(event) => props.onRoleChange(event.target.value)}
        value={props.role}
      >
        <option value="">All roles</option>
        {props.roles.map((item) => (
          <option key={item.id} value={item.code}>
            {item.name}
          </option>
        ))}
      </Select>
      <Select
        className="h-10 rounded-lg border-slate-200"
        onChange={(event) => props.onStatusChange(event.target.value)}
        value={props.status}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="invited">Invited</option>
        <option value="suspended">Suspended</option>
        <option value="disabled">Disabled</option>
      </Select>
    </div>
  );
}

function MobileUserCard({
  props,
  user,
}: {
  props: UsersTabPanelProps;
  user: UserAccessRow;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <UserIdentity user={user} />
        <UserRowActions {...props} user={user} />
      </div>
      <p className="mt-2 pl-12 text-sm text-slate-500">{user.email}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <RolePills codes={user.roleCodes} />
        <UserStatus status={user.status} />
      </div>
    </article>
  );
}
