"use client";

import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { useUpdateUserAccess } from "@/modules/users/UserAccessHooks";
import type {
  RoleAccessRow,
  UserAccessRow,
} from "@/modules/users/UserAccessTypes";

export function UserRoleAssignmentPanel({
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

  function toggleRole(code: string, checked: boolean) {
    setSelectedRoles((current) =>
      checked
        ? [...new Set([...current, code])]
        : current.filter((roleCode) => roleCode !== code),
    );
  }

  function saveRoles() {
    update.mutate(
      { input: { roleCodes: selectedRoles }, userId: user.id },
      { onSuccess: onClose },
    );
  }

  return (
    <div>
      <p className="mb-5 text-sm text-slate-500">{user.email}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <label
            className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 text-sm text-brand-navy hover:bg-slate-50"
            key={role.id}
          >
            <input
              checked={selectedRoles.includes(role.code)}
              className="mt-0.5 size-4 accent-blue-600"
              onChange={(event) => toggleRole(role.code, event.target.checked)}
              type="checkbox"
            />
            <span>
              <strong className="block">{role.name}</strong>
              <span className="mt-0.5 block text-xs text-slate-500">
                {role.description || "No description"}
              </span>
            </span>
          </label>
        ))}
      </div>
      <GeneralButton
        className="mt-5 w-full rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        disabled={update.isPending}
        onClick={saveRoles}
        type="button"
      >
        {update.isPending ? "Saving…" : "Save user roles"}
      </GeneralButton>
      {update.error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {update.error.message}
        </p>
      ) : null}
    </div>
  );
}
