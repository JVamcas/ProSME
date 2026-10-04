import { QueryCache, QueryClient } from "@tanstack/react-query";

import { ClientRequestError } from "@/lib/client-http";

export function isAccessFailure(error: unknown) {
  return (
    error instanceof ClientRequestError &&
    [401, 403, 404].includes(error.status)
  );
}

export function queryIdentity(
  actorId: string,
  permissions: Iterable<string>,
  roles: Iterable<string>,
) {
  return JSON.stringify([actorId, [...permissions].sort(), [...roles].sort()]);
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isAccessFailure(error)) {
          query.setState({ data: undefined, dataUpdatedAt: 0 });
        }
      },
    }),
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !isAccessFailure(error) && failureCount < 1,
        staleTime: 30_000,
      },
    },
  });
}
