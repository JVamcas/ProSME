"use client";
import type { ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { GeneralButton } from "@/shared/ui/Button";
import { Checkbox, FieldError } from "@/shared/ui/FormPrimitives";
import { Badge } from "@/shared/ui/Badge";
import { ArrowLink } from "@/shared/ui/Links";
import { permissionCodes } from "@/auth/authorization/permissions";
import { useCapabilities } from "@/shared/ui/portal/capability-context";
import type { ChatbotResource } from "../../domain/ChatbotResource";
import {
  chatbotResourceSelectionSchema,
  type ChatbotResourceSelection,
} from "../../api/ChatbotResourceSchemas";
import { useUpdateChatbotResources } from "./useChatbotResources";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalDateTime24 } from "@/lib/dateUtils";

const typeLabels = {
  funding: "Funding",
  eligibility: "Eligibility",
  faq: "FAQ",
  contact: "Contact",
};

export function ChatbotResourceTable({
  items,
  footer,
}: {
  items: ChatbotResource[];
  footer?: ReactNode;
}) {
  const grants = useCapabilities();
  const canActivate = grants.has(permissionCodes.chatbotKnowledgeActivateAll);
  const canDeactivate = grants.has(
    permissionCodes.chatbotKnowledgeDeactivateAll,
  );
  const mutation = useUpdateChatbotResources();
  const form = useForm<ChatbotResourceSelection>({
    resolver: zodResolver(chatbotResourceSelectionSchema),
    defaultValues: { resourceKeys: [] },
  });
  const selected = useWatch({ control: form.control, name: "resourceKeys" });
  const disabled = mutation.isPending || (!canActivate && !canDeactivate);
  const selectRow = (key: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...selected, key])]
      : selected.filter((value) => value !== key);
    form.setValue("resourceKeys", next, { shouldValidate: true });
  };
  const allShownSelected =
    items.length > 0 && items.every((item) => selected.includes(item.key));
  const selectShown = (checked: boolean) => {
    const shown = new Set(items.map((item) => item.key));
    const next = checked
      ? [...new Set([...selected, ...shown])]
      : selected.filter((key) => !shown.has(key));
    form.setValue("resourceKeys", next, { shouldValidate: true });
  };
  const update = (active: boolean) =>
    form.handleSubmit(async (values) => {
      try {
        await mutation.mutateAsync({ ...values, active });
        form.reset({ resourceKeys: [] });
      } catch {
        // The mutation shows the error and keeps the selection available for retry.
      }
    });
  const columns: DataTableColumn<ChatbotResource>[] = [
    {
      id: "select",
      enableSorting: false,
      header: () => (
        <Checkbox
          aria-label="Select all shown resources"
          checked={allShownSelected}
          disabled={disabled || !items.length}
          onChange={(event) => selectShown(event.target.checked)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.name}`}
          checked={selected.includes(row.original.key)}
          disabled={disabled}
          onChange={(event) =>
            selectRow(row.original.key, event.target.checked)
          }
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Resource name",
      enableSorting: false,
      cell: ({ row }) => (
        <ArrowLink href={row.original.url}>{row.original.name}</ArrowLink>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: false,
      cell: ({ row }) => typeLabels[row.original.type],
    },
    {
      accessorKey: "active",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.original.active ? "Active" : "Inactive";
        return <StatusBadge status={status} label={status} />;
      },
    },
    {
      accessorKey: "lastUpdated",
      header: "Last updated",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.lastUpdated
          ? formatLocalDateTime24(row.original.lastUpdated)
          : "—",
    },
  ];
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={update(true)}>
        {canActivate || canDeactivate ? (
          <div className="flex flex-wrap items-end gap-3">
            <span>{selected.length} selected</span>
            {canActivate ? (
              <GeneralButton
                size="compact"
                type="submit"
                disabled={mutation.isPending || !selected.length}
              >
                Activate
              </GeneralButton>
            ) : null}
            {canDeactivate ? (
              <GeneralButton
                size="compact"
                type="button"
                variant="outline"
                disabled={mutation.isPending || !selected.length}
                onClick={update(false)}
              >
                Deactivate
              </GeneralButton>
            ) : null}
          </div>
        ) : null}
        <FieldError message={form.formState.errors.resourceKeys?.message} />
        <DataTable
          columns={columns}
          data={items}
          rowKey={(row) => row.key}
          emptyMessage="No published resources available."
          footer={footer}
        />
      </form>
    </FormProvider>
  );
}
