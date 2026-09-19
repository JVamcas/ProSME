"use client";

import { PortalErrorState } from "@/components/layout/PortalErrorState";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PortalErrorState
      title="Error"
      description={error.message}
      actionLabel="Retry"
      onAction={reset}
    />
  );
}
