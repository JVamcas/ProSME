"use client";

import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import type {
  CapabilityRow,
  RoleAccessRow,
} from "@/modules/users/UserAccessTypes";
import { UserRoleEditor } from "./UserRoleEditor";

export function RoleCapabilitiesPanel({
  canManageRoles,
  capabilities,
  roles,
}: {
  canManageRoles: boolean;
  capabilities: CapabilityRow[];
  roles: RoleAccessRow[];
}) {
  const [editingRole, setEditingRole] = useState<RoleAccessRow | null>(null);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b border-brand-navy/10 bg-brand-white text-[10px] uppercase tracking-wider text-brand-navy/55">
            <tr>
              <th className="px-4 py-3">Capability</th>
              {roles.map((role) => (
                <th className="px-3 py-3 text-center" key={role.id}>
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-navy/10">
            {capabilities.map((capability) => (
              <tr key={capability.code}>
                <td className="px-4 py-3">
                  <strong className="block text-brand-navy">
                    {capability.code}
                  </strong>
                  <span className="text-brand-navy/55">
                    {capability.description}
                  </span>
                </td>
                {roles.map((role) => (
                  <td className="px-3 py-3 text-center" key={role.id}>
                    <span
                      className={
                        role.capabilityCodes.includes(capability.code)
                          ? "text-brand-green"
                          : "text-brand-navy/20"
                      }
                    >
                      {role.capabilityCodes.includes(capability.code)
                        ? "✓"
                        : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-brand-navy/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-brand-navy/55">
            Capabilities are granted through roles, never directly to users.
          </p>
          {canManageRoles ? (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <GeneralButton
                  key={role.id}
                  onClick={() => setEditingRole(role)}
                  size="sm"
                  variant="outline"
                >
                  Edit {role.name}
                </GeneralButton>
              ))}
            </div>
          ) : null}
        </div>
        {editingRole ? (
          <div className="mt-5 rounded-xl bg-brand-cream p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-brand-navy">
                Edit {editingRole.name}
              </h3>
              <GeneralButton
                onClick={() => setEditingRole(null)}
                size="sm"
                variant="ghost"
              >
                Close
              </GeneralButton>
            </div>
            <UserRoleEditor capabilities={capabilities} role={editingRole} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
