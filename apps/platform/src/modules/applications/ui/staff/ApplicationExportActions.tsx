"use client";

import { GeneralButton } from "@/components/ui/button";
import { useExportAdminApplications } from "../useAdminApplicationTools";
import type { AdminApplicationExportInput } from "../../api/AdminApplicationSchemas";

export function ApplicationExportActions({
  filters,
}: {
  filters: Omit<AdminApplicationExportInput, "format">;
}) {
  const download = useExportAdminApplications();
  async function exportResults(format: AdminApplicationExportInput["format"]) {
    try {
      const blob = await download.mutateAsync({ ...filters, format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `applications.${format.toLowerCase()}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // The mutation's error is displayed beside the export actions.
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <GeneralButton
        disabled={download.isPending}
        onClick={() => void exportResults("XLSX")}
        type="button"
        variant="outline"
      >
        Export Excel
      </GeneralButton>
      <GeneralButton
        disabled={download.isPending}
        onClick={() => void exportResults("CSV")}
        type="button"
        variant="outline"
      >
        Export CSV
      </GeneralButton>
      {download.isPending ? (
        <p role="status" className="text-sm">
          Preparing export…
        </p>
      ) : null}
      {download.isError ? (
        <p role="alert" className="text-sm text-red-700">
          {download.error.message}
        </p>
      ) : null}
    </div>
  );
}
