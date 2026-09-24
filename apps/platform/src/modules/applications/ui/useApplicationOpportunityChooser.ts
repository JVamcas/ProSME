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
  const updateSearch = useCallback((value: string) => {
    setSearch(value);
    setPageIndex(0);
    setCursors([undefined]);
  }, []);
  const nextPage = () => {
    const next = query.data?.nextCursor;
    if (!next) return;
    setCursors((current) => {
      const copy = current.slice(0, pageIndex + 1);
      copy[pageIndex + 1] = next;
      return copy;
    });
    setPageIndex((current) => current + 1);
  };
  return {
    nextPage,
    pageIndex,
    previousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
    query,
    search,
    setSearch: updateSearch,
  };
}
