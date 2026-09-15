"use client";

import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import {
  useUpdateUserAccess,
  useUserAccess,
} from "@/modules/users/UserAccessHooks";
import type {
  RoleAccessRow,
  UserAccessRow,
} from "@/modules/users/UserAccessTypes";
import { RoleCapabilitiesPanel } from "./RoleCapabilitiesPanel";
import { UserPromotionForm } from "./UserPromotionForm";
import { UsersTabPanel } from "./UsersTabPanel";

type AccessTab = "users" | "roles" | "permissions";

const tabs: Array<{ label: string; value: AccessTab }> = [
  { label: "Users", value: "users" },
  { label: "Roles", value: "roles" },
  { label: "Permissions", value: "permissions" },
];

export function UserAccessWorkspace({
  canManageRoles,
  canManageUsers,
  canReadRoles,
}: {
  canManageRoles: boolean;
  canManageUsers: boolean;
  canReadRoles: boolean;
}) {
  const [activeTab, setActiveTab] = useState<AccessTab>("users");
  const [editingUser, setEditingUser] = useState<UserAccessRow | null>(null);
  const [promotingUser, setPromotingUser] = useState<UserAccessRow | null>(
    null,
  );
  const query = useUserAccess({ limit: 100 });
  const view = query.data;
  if (query.isPending)
    return (
      <p className="text-sm text-brand-navy/60">Loading users and access…</p>
    );
  if (query.isError)
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error.message}
      </p>
    );
  if (!view) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-blue/20 bg-white shadow-[0_12px_32px_rgba(10,24,59,0.06)]">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-brand-navy/10 px-4 pt-3 sm:px-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              className={`border-b-4 px-1 pb-3 pt-2 text-sm font-bold transition ${activeTab === tab.value ? "border-brand-orange text-brand-navy" : "border-transparent text-brand-navy/45 hover:text-brand-navy"}`}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === "users" ? (
        <UsersTabPanel
          canManageRoles={canManageRoles}
          canManageUsers={canManageUsers}
          onEditRoles={setEditingUser}
          onPromote={setPromotingUser}
          users={view.users}
        />
      ) : null}
      {activeTab === "roles" && canReadRoles ? (
        <RoleCapabilitiesPanel
          canManageRoles={canManageRoles}
          capabilities={view.capabilities}
          roles={view.roles}
        />
      ) : null}
      {activeTab === "permissions" ? (
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {view.capabilities.map((capability) => (
            <article
              className="rounded-xl border border-brand-navy/10 bg-brand-white p-4"
              key={capability.code}
            >
              <h2 className="text-sm font-bold text-brand-navy">
                {capability.code}
              </h2>
              <p className="mt-1 text-xs leading-5 text-brand-navy/60">
                {capability.description}
              </p>
            </article>
          ))}
        </div>
      ) : null}
      {editingUser && canManageRoles ? (
        <UserRoleAssignmentPanel
          onClose={() => setEditingUser(null)}
          roles={view.roles}
          user={editingUser}
        />
      ) : null}
      {promotingUser && canManageUsers && canManageRoles ? (
        <div className="border-t border-brand-orange/30 bg-brand-cream p-5">
          <h2 className="text-lg font-bold text-brand-navy">
            Promote verified user
          </h2>
          <p className="mb-4 mt-1 text-sm text-brand-navy/60">
            Choose the least-privilege staff roles for {promotingUser.email}.
          </p>
          <UserPromotionForm
            onDone={() => setPromotingUser(null)}
            roles={view.roles}
            user={promotingUser}
          />
        </div>
      ) : null}
    </div>
  );
}

function UserRoleAssignmentPanel({
  onClose,
  roles,
  user,
}: {
  onClose: () => void;
  roles: RoleAccessRow[];
  user: UserAccessRow;
}) {
  const [selectedRoles, setSelectedRoles] = useState(user.roleCodes);
  const update = useUpdateUserAccess();
  return (
    <div className="border-t border-brand-orange/30 bg-brand-cream p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-brand-navy">Edit user roles</h2>
          <p className="mt-1 text-sm text-brand-navy/60">{user.email}</p>
        </div>
        <GeneralButton onClick={onClose} size="sm" variant="ghost">
          Close
        </GeneralButton>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <label className="flex gap-2 text-sm text-brand-navy" key={role.id}>
            <input
              checked={selectedRoles.includes(role.code)}
              className="mt-1 accent-brand-orange"
              onChange={(event) =>
                setSelectedRoles((current) =>
                  event.target.checked
                    ? [...new Set([...current, role.code])]
                    : current.filter((code) => code !== role.code),
                )
              }
              type="checkbox"
            />
            {role.name}
          </label>
        ))}
        <GeneralButton
          className="sm:col-span-2"
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { input: { roleCodes: selectedRoles }, userId: user.id },
              { onSuccess: onClose },
            )
          }
          size="sm"
        >
          Save user roles
        </GeneralButton>
        {update.error ? (
          <p className="sm:col-span-2 text-sm text-red-700" role="alert">
            {update.error.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
