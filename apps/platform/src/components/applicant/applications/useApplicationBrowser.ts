"use client";

import { useState } from "react";

import { useOwnApplications } from "@/modules/applications/ApplicationHooks";

export type ApplicationFilter = "all" | "draft";
export const applicationPageSize = 10;

export function useApplicationBrowser() {
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const query = useOwnApplications({
    after: cursors[pageIndex],
    limit: applicationPageSize,
    status: filter === "draft" ? "draft" : undefined,
  });

  function selectFilter(value: ApplicationFilter) {
    setFilter(value);
    setCursors([undefined]);
    setPageIndex(0);
  }

  function nextPage() {
    if (!query.data?.nextCursor) return;
    setCursors((current) => [
      ...current.slice(0, pageIndex + 1),
      query.data?.nextCursor ?? undefined,
    ]);
    setPageIndex((current) => current + 1);
  }

  return {
    filter,
    nextPage,
    pageIndex,
    previousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
    query,
    selectFilter,
  };
}
