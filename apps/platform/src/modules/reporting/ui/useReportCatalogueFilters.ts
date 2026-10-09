"use client";
import { useState } from "react";
import type { ReportListInput } from "../api/ReportManagementSchemas";

export function useReportCatalogueFilters() {
  const [input, setInput] = useState<ReportListInput>({
    search: "",
    page: 1,
    pageSize: 10,
  });
  return {
    input,
    search: (search: string) =>
      setInput((current) => ({ ...current, search, page: 1 })),
    next: () => setInput((current) => ({ ...current, page: current.page + 1 })),
    previous: () =>
      setInput((current) => ({
        ...current,
        page: Math.max(1, current.page - 1),
      })),
  };
}
