"use client";

import { RefreshCw } from "lucide-react";
import { GeneralButton } from "@/components/ui/button";

export function QueryRefreshButton({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <GeneralButton disabled={refreshing} onClick={onRefresh} variant="outline">
      <RefreshCw aria-hidden="true" className="size-4" />
      {refreshing ? "Refreshing…" : "Refresh"}
    </GeneralButton>
  );
}
