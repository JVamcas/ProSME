"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import {
  businessMemberRoles,
  type BusinessProfileInput,
} from "../BusinessSchemas";

export function BusinessMembersTable({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { control, formState } = useFormContext<BusinessProfileInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });
  type MemberRow = (typeof fields)[number];
  const columns: DataTableColumn<MemberRow>[] = [
    {
      id: "fullName",
      header: "Full name",
      cell: ({ row }) => (
        <FormInput
          label="Full name"
          name={`members.${row.index}.fullName`}
          disabled={disabled}
          required
        />
      ),
    },
    {
      id: "idNumber",
      header: "ID number",
      cell: ({ row }) => (
        <FormInput
          label="ID number"
          name={`members.${row.index}.idNumber`}
          disabled={disabled}
          required
        />
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <FormSelect
          label="Role"
          name={`members.${row.index}.role`}
          items={businessMemberRoles.map((role) => ({
            label: role,
            value: role,
          }))}
          disabled={disabled}
          required
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <GeneralButton
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => remove(row.index)}
          aria-label={`Remove member ${row.index + 1}`}
        >
          Remove
        </GeneralButton>
      ),
    },
  ];
  const error = formState.errors.members;
  return (
    <div className="space-y-3">
      <DataTable
        columns={columns}
        data={fields}
        rowKey={(member) => member.id}
        emptyMessage="Add at least one principal or founding member."
        toolbar={{
          title: "Principal / founding members",
          description: "Enter each member's full name, ID number, and role.",
          actions: (
            <GeneralButton
              type="button"
              disabled={disabled || fields.length >= 100}
              onClick={() =>
                append({ fullName: "", idNumber: "", role: "Principal" })
              }
            >
              Add member
            </GeneralButton>
          ),
        }}
      />
      {error?.message || error?.root?.message ? (
        <p role="alert" className="text-sm text-red-700">
          {error.message ?? error.root?.message}
        </p>
      ) : null}
    </div>
  );
}
