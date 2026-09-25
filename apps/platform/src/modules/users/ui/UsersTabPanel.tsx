"use client";

import { Search } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input, Select } from "@/shared/ui/FormPrimitives";
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
import { StatusBadge } from "@/components/ui/status-badge";

export type UsersTabPanelProps = {
  canManageRoles: boolean;
  canManageUsers: boolean;
  onEditRoles: (user: UserAccessRow) => void;
  onPageChange: (page: number) => void;
  onRoleChange: (role: string) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: string) => void;
  onStatusChange: (status: string) => void;
  page: number;
  pageSize: number;
  role: string;
  search: string;
  sort: string;
  status: string;
  total: number;
  isFetching: boolean;
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
      enableSorting: false,
      cell: ({ row }) => <UserIdentity user={row.original} />,
    },
    {
      accessorKey: "roleCodes",
      header: "Roles",
      enableSorting: false,
      cell: ({ row }) => <RolePills codes={row.original.roleCodes} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last active",
      enableSorting: false,
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
  const columns = createColumns(props);

  return (
    <div className="p-4 sm:p-6">
      <UserFilters
        onRoleChange={props.onRoleChange}
        onSearchChange={props.onSearchChange}
        onSortChange={props.onSortChange}
        onStatusChange={props.onStatusChange}
        role={props.role}
        roles={props.roles}
        search={props.search}
        sort={props.sort}
        status={props.status}
      />
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={props.users}
          emptyMessage="No users match your filters."
          footer={
            <Pagination
              disabled={props.isFetching}
              hasNextPage={props.page * props.pageSize < props.total}
              onNext={() => props.onPageChange(props.page + 1)}
              onPrevious={() => props.onPageChange(props.page - 1)}
              page={props.page}
              pageSize={props.pageSize}
              total={props.total}
            />
          }
          minWidth={880}
        />
      </div>
      <div className="space-y-3 md:hidden">
        {props.users.map((user) => (
          <MobileUserCard key={user.id} props={props} user={user} />
        ))}
        {!props.users.length ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No users match your filters.
          </p>
        ) : null}
        <Pagination
          disabled={props.isFetching}
          hasNextPage={props.page * props.pageSize < props.total}
          onNext={() => props.onPageChange(props.page + 1)}
          onPrevious={() => props.onPageChange(props.page - 1)}
          page={props.page}
          pageSize={props.pageSize}
          total={props.total}
        />
      </div>
    </div>
  );
}

function UserFilters(props: {
  onRoleChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  role: string;
  roles: RoleAccessRow[];
  search: string;
  sort: string;
  status: string;
}) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-[minmax(16rem,1fr)_11rem_11rem_11rem]">
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
        <option value="unprovisioned">Unprovisioned</option>
        <option value="active">Active</option>
        <option value="invited">Invited</option>
        <option value="suspended">Suspended</option>
        <option value="disabled">Disabled</option>
      </Select>
      <Select
        aria-label="Sort users"
        className="h-10 rounded-lg border-slate-200"
        onChange={(event) => props.onSortChange(event.target.value)}
        value={props.sort}
      >
        <option value="name-asc">Name A–Z</option>
        <option value="name-desc">Name Z–A</option>
        <option value="email-asc">Email A–Z</option>
        <option value="email-desc">Email Z–A</option>
        <option value="last-active-desc">Last active</option>
        <option value="status-asc">Status</option>
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
