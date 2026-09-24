"use client";

import { useCallback, useDeferredValue, useState } from "react";

import { useFundingOpportunities } from "@/modules/funding-calls/FundingOpportunityHooks";

export const opportunityChooserPageSize = 10;

export function useApplicationOpportunityChooser() {
  const [search, setSearch] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const deferredSearch = useDeferredValue(search.trim());
  const query = useFundingOpportunities({
    after: cursors[pageIndex],
    limit: opportunityChooserPageSize,
    search: deferredSearch || undefined,
    status: "open",
  });

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setCursors([undefined]);
    setPageIndex(0);
  }, []);

  function nextPage() {
    if (!query.data?.nextCursor) return;
    setCursors((current) => [
      ...current.slice(0, pageIndex + 1),
      query.data?.nextCursor ?? undefined,
    ]);
    setPageIndex((current) => current + 1);
  }

  return {
    nextPage,
    pageIndex,
    previousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
    query,
    search,
    setSearch: changeSearch,
  };
}
