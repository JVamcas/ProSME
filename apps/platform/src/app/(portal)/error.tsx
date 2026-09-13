"use client";

import { PortalRouteError } from "@/components/layout/portal-route-error";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PortalRouteError error={error} reset={reset} />;
}
