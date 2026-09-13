"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button, IconButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import {
  useBusinesses,
  useDeleteBusiness,
} from "@/modules/profiles/business.hooks";
import type { BusinessView } from "@/modules/profiles/profile.types";

function businessColumns(
  canUpdate: boolean,
  deleting: boolean,
  deleteBusiness: (business: BusinessView) => void,
): DataTableColumn<BusinessView>[] {
  return [
    {
      accessorKey: "legalName",
      header: "Business",
      cell: ({ row }) => (
        <div>
          <p className="font-bold text-brand-navy">
            {row.original.legalName}
          </p>
          <p className="mt-0.5 text-xs text-brand-navy/55">
            {row.original.tradingName || "No trading name"}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "registrationNumber",
      header: "Registration number",
      cell: ({ row }) => row.original.registrationNumber || "—",
    },
    { accessorKey: "businessType", header: "Business type" },
    { accessorKey: "sector", header: "Sector" },
    { accessorKey: "region", header: "Region" },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) =>
        canUpdate ? (
          <div className="flex items-center gap-1">
            <IconButton
              asChild
              label={`Edit ${row.original.legalName}`}
              variant="ghost"
            >
              <Link href={`/portal/businesses/${row.original.id}/edit`}>
                <Pencil aria-hidden="true" className="size-4" />
              </Link>
            </IconButton>
            <IconButton
              disabled={deleting}
              label={`Delete ${row.original.legalName}`}
              onClick={() => deleteBusiness(row.original)}
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </IconButton>
          </div>
        ) : null,
    },
  ];
}

export function BusinessesTable({ canUpdate }: { canUpdate: boolean }) {
  const businesses = useBusinesses();
  const deletion = useDeleteBusiness();

  function remove(business: BusinessView) {
    if (!window.confirm(`Delete ${business.legalName}? This cannot be undone.`)) {
      return;
    }
    deletion.mutate(business.id, {
      onSuccess: () => toast.success("Business deleted"),
    });
  }

  const columns = businessColumns(canUpdate, deletion.isPending, remove);
  const data = businesses.data ?? [];
  const emptyMessage = businesses.isPending
    ? "Loading businesses…"
    : businesses.isError
      ? businesses.error.message
      : "No businesses have been added yet";

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-brand-navy/15 bg-brand-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-brand-navy/10 p-5">
        <div>
          <h2 className="font-bold text-brand-navy">Businesses</h2>
          <p className="mt-1 text-sm text-brand-navy/65">
            Manage your enterprises..
          </p>
        </div>
        {canUpdate ? (
          <Button asChild>
            <Link href="/portal/businesses/new">
              <Plus aria-hidden="true" className="size-4" />
              Add business
            </Link>
          </Button>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={data}
        emptyMessage={emptyMessage}
        minWidth={900}
        footer={
          <div className="border-t border-brand-navy/10 px-5 py-4 text-xs text-brand-navy/55">
            {data.length} {data.length === 1 ? "business" : "businesses"}
          </div>
        }
      />
    </section>
  );
}
