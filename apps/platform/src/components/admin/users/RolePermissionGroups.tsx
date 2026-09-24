"use client";

import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import {
  getPermissionDefinition,
  getPermissionGroup,
  permissionGroups,
  type PermissionCode,
} from "@/auth/authorization/permissions";
import { cn } from "@/lib/utils";
import type {
  CapabilityRow,
  RoleAccessRow,
} from "@/modules/users/UserAccessTypes";

type CapabilityGroup = {
  capabilities: CapabilityRow[];
  key: string;
  label: string;
};

export function RolePermissionGroups({
  capabilities,
  role,
}: {
  capabilities: CapabilityRow[];
  role: RoleAccessRow;
}) {
  const groups = useMemo(() => groupCapabilities(capabilities), [capabilities]);
  const [openGroups, setOpenGroups] = useState(() => new Set([groups[0]?.key]));

  function toggle(key: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <PermissionGroup
          group={group}
          key={group.key}
          onToggle={() => toggle(group.key)}
          open={openGroups.has(group.key)}
          role={role}
        />
      ))}
    </div>
  );
}

function PermissionGroup({
  group,
  onToggle,
  open,
  role,
}: {
  group: CapabilityGroup;
  onToggle: () => void;
  open: boolean;
  role: RoleAccessRow;
}) {
  const granted = group.capabilities.filter((capability) =>
    role.capabilityCodes.includes(capability.code),
  );
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200">
      <button
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <ShieldCheck className="size-5" />
        </span>
        <span className="flex-1">
          <strong className="block text-sm text-brand-navy">
            {group.label}
          </strong>
          <span className="text-xs text-slate-500">
            {granted.length} of {group.capabilities.length} permissions
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-slate-500 transition",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-3 bg-slate-50 px-4 py-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          {group.capabilities.map((capability) => (
            <PermissionItem
              capability={capability}
              granted={role.capabilityCodes.includes(capability.code)}
              key={capability.code}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PermissionItem({
  capability,
  granted,
}: {
  capability: CapabilityRow;
  granted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg bg-white p-3",
        !granted && "opacity-50",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded",
          granted ? "bg-blue-600 text-white" : "border border-slate-300",
        )}
      >
        {granted ? <Check className="size-3" /> : null}
      </span>
      <span>
        <strong className="block text-xs font-semibold text-brand-navy">
          {formatCapabilityName(capability.code)}
        </strong>
        {capability.description ? (
          <span className="mt-0.5 block text-xs text-slate-500">
            {capability.description}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function groupCapabilities(capabilities: CapabilityRow[]): CapabilityGroup[] {
  const groups = new Map(
    permissionGroups.map((group) => [group.id, [] as CapabilityRow[]]),
  );
  for (const capability of capabilities) {
    const group = getPermissionGroup(capability.code as PermissionCode);
    if (!group) continue;
    groups.get(group.id)?.push(capability);
  }
  return permissionGroups.flatMap((group) => {
    const items = groups.get(group.id) ?? [];
    return items.length
      ? [{ capabilities: items, key: group.id, label: group.label }]
      : [];
  });
}

function formatCapabilityName(code: string) {
  return getPermissionDefinition(code as PermissionCode).label;
}
