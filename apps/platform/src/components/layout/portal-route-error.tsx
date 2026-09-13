"use client";

import { useEffect } from "react";

import { PortalErrorState } from "./portal-error-state";

type PortalRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function PortalRouteError({ error, reset }: PortalRouteErrorProps) {
  useEffect(() => {
    console.error("Portal route rendering failed", {
      digest: error.digest,
      error,
    });
  }, [error]);

  return (
    <PortalErrorState
      title="This workspace could not be loaded"
      description="Your session is still safe. Try loading this section again."
      onAction={reset}
    />
  );
}
