"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { getErrorMessage } from "@/lib/client-http";

export function QuerySection<T>({
  query,
  loading,
  children,
  title,
}: {
  query: UseQueryResult<T>;
  loading: ReactNode;
  children: (data: T) => ReactNode;
  title: string;
}) {
  if (query.isError) {
    return (
      <PortalErrorState
        headingLevel={2}
        title={`Unable to load ${title}`}
        description={getErrorMessage(query.error) ?? "Please try again."}
        onAction={() => void query.refetch()}
      />
    );
  }
  if (!query.data) return loading;
  return (
    <>
      {query.isFetching ? (
        <p className="sr-only" role="status">
          Refreshing {title}
        </p>
      ) : null}
      {children(query.data)}
    </>
  );
}
