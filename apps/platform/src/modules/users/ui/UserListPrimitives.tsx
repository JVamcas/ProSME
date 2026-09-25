"use client";

import { cn } from "@/lib/utils";
import {
  useProvisionUser,
  useUpdateUserAccess,
} from "@/modules/users/UserAccessHooks";
import type { UserAccessRow } from "@/modules/users/UserAccessTypes";
import { ActionMenu, type ActionMenuItem } from "@/shared/ui/ActionMenu";
import { toast } from "@/shared/ui/Toast";
import type { UsersTabPanelProps } from "./UsersTabPanel";

export function UserRowActions({
  canManageRoles,
  canManageUsers,
  onEditRoles,
  user,
}: Pick<UsersTabPanelProps, "canManageRoles" | "canManageUsers" | "onEditRoles"> & {
  user: UserAccessRow;
}) {
  const update = useUpdateUserAccess();
  const provision = useProvisionUser();
  const isProvisioned = user.status !== "unprovisioned";
  const canActivate = user.emailVerified || user.status === "active";
  const actions: ActionMenuItem[] = [];

  if (canManageUsers && !isProvisioned) {
    actions.push({
      id: "provision",
      label: "Provision user",
      disabled: provision.isPending,
      onAction: () => {
        provision.mutate(user.id, {
          onError: (error) => toast.error(error.message),
          onSuccess: () => toast.success("User provisioned"),
        });
      },
    });
  }

  if (canManageUsers && isProvisioned && canActivate) {
    actions.push({
      id: "status",
      label: user.status === "active" ? "Suspend user" : "Activate user",
      disabled: update.isPending,
      onAction: () => {
        update.mutate({
          input: {
            status: user.status === "active" ? "suspended" : "active",
          },
          userId: user.id,
        });
      },
    });
  }

  if (canManageRoles && isProvisioned) {
    actions.push({
      id: "roles",
      label: "Edit roles",
      onAction: () => onEditRoles(user),
    });
  }

  if (!actions.length) return null;

  return (
    <div className="flex justify-end">
      <ActionMenu
        items={actions}
        label={`Actions for ${user.displayName || user.email}`}
      />
    </div>
  );
}

export function UserIdentity({ user }: { user: UserAccessRow }) {
  const initials = user.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
        {initials || "U"}
      </span>
      <span className="font-semibold text-brand-navy">{user.displayName}</span>
      <span className="font-semibold text-brand-navy/50">{user.email}</span>
    </div>
  );
}

export function RolePills({ codes }: { codes: string[] }) {
  if (!codes.length) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {codes.map((code) => (
        <span
          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700"
          key={code}
        >
          {code}
        </span>
      ))}
    </div>
  );
}

export function UserStatus({ status }: { status: UserAccessRow["status"] }) {
  const active = status === "active";
  return (
    <span className="inline-flex items-center gap-2 text-sm capitalize text-slate-600">
      <span
        className={cn(
          "size-2 rounded-full",
          active ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
      {status}
    </span>
  );
}

export function formatLastActive(value: string | null) {
  if (!value) return "Never";
  const elapsed = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(elapsed / 3_600_000));
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return new Intl.DateTimeFormat("en-NA", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
