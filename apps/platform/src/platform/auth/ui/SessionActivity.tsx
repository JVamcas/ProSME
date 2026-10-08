"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { createQueryClient } from "@/shared/utils/createQueryClient";
import { useSessionActivity } from "./useSessionActivity";

export function SessionActivityMonitor() {
  useSessionActivity();
  return null;
}

// Only this monitor uses its own query client. Payload's internal data loading
// remains outside the platform query provider.
export function CmsSessionActivity() {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionActivityMonitor />
    </QueryClientProvider>
  );
}
