"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useDeferredValue, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useFundingOpportunities } from "@/modules/funding-calls/FundingOpportunityHooks";
import {
  fundingOpportunitySearchSchema,
  type FundingOpportunitySearchInput,
} from "@/modules/funding-calls/FundingOpportunitySchemas";
import type { PublicFundingCallStatus } from "@/modules/funding-calls/api/PublicFundingCallTransport";

export type FundingOpportunityFilter = "all" | PublicFundingCallStatus;
export const fundingOpportunityPageSize = 10;

export function useFundingOpportunityBrowser(
  initialFilter: FundingOpportunityFilter = "all",
) {
  const [filter, setFilter] = useState<FundingOpportunityFilter>(initialFilter);
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const searchForm = useForm<FundingOpportunitySearchInput>({
    defaultValues: { search: "" },
    resolver: zodResolver(fundingOpportunitySearchSchema),
  });
  const search = useWatch({ control: searchForm.control, name: "search" });
  const deferredSearch = useDeferredValue(search.trim());
  const query = useFundingOpportunities({
    after: cursors[pageIndex],
    limit: fundingOpportunityPageSize,
    search: deferredSearch || undefined,
    status: filter === "all" ? undefined : filter,
  });

  function resetPagination() {
    setCursors([undefined]);
    setPageIndex(0);
  }

  function selectFilter(nextFilter: FundingOpportunityFilter) {
    setFilter(nextFilter);
    resetPagination();
  }

  function nextPage() {
    const nextCursor = query.data?.nextCursor;
    if (!nextCursor) return;
    setCursors((current) => [...current.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((current) => current + 1);
  }

  return {
    filter,
    hasActiveCriteria: filter !== "all" || Boolean(deferredSearch),
    nextPage,
    pageIndex,
    previousPage: () => setPageIndex((current) => Math.max(0, current - 1)),
    query,
    resetPagination,
    searchForm,
    selectFilter,
  };
}
