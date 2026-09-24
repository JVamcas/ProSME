"use client";

import { MoreVertical } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUpdateUserAccess } from "@/modules/users/UserAccessHooks";
import type { UserAccessRow } from "@/modules/users/UserAccessTypes";
import type { UsersTabPanelProps } from "./UsersTabPanel";

export function UserRowActions({
  canManageRoles,
  canManageUsers,
  onEditRoles,
  user,
}: Omit<UsersTabPanelProps, "roles" | "users"> & {
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
        className="size-8 rounded-lg"
        label={`Actions for ${user.displayName}`}
        onClick={() => setOpen((current) => !current)}
        variant="ghost"
      >
        <MoreVertical className="size-4" />
      </IconButton>
      {open ? (
        <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {canManageUsers && user.userType === "staff" && canActivate ? (
            <MenuAction disabled={update.isPending} onClick={changeStatus}>
              {user.status === "active" ? "Suspend user" : "Activate user"}
            </MenuAction>
          ) : null}
          {canManageRoles ? (
            <MenuAction
              onClick={() => {
                onEditRoles(user);
                setOpen(false);
              }}
            >
              Edit roles
            </MenuAction>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuAction({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-brand-navy hover:bg-slate-50 disabled:opacity-50"
      type="button"
      {...props}
    >
      {children}
    </button>
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
