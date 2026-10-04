import { queryOptions } from "@tanstack/react-query";
import { clientApplicationService } from "../ClientApplicationService";
import { applicationQueryKeys } from "./ApplicationQueryKeys";

export function staffApplicationDetailQuery(id: string) {
  return queryOptions({
    queryKey: applicationQueryKeys.adminDetail(id),
    queryFn: ({ signal }) =>
      clientApplicationService.getAdminApplicationDetail(id, signal),
    staleTime: 30_000,
  });
}

export function ownApplicationReadViewQuery(id: string) {
  return queryOptions({
    queryKey: applicationQueryKeys.readView(id),
    queryFn: ({ signal }) =>
      clientApplicationService.getOwnApplicationReadView(id, signal),
    staleTime: 30_000,
  });
}
