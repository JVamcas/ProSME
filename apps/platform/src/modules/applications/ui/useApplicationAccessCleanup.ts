"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect } from "react";
import { isAccessFailure } from "@/shared/utils/createQueryClient";
import { workQueueQueryKeys } from "@/modules/work-queue/ui/WorkQueueQueryKeys";
import { applicationQueryKeys } from "./ApplicationQueryKeys";

function startsWith(key: QueryKey, prefix: QueryKey) {
  return prefix.every((value, index) => key[index] === value);
}

export function useApplicationAccessCleanup(
  id: string,
  audience: "staff" | "applicant",
  error: unknown,
) {
  const client = useQueryClient();
  useEffect(() => {
    if (!isAccessFailure(error)) return;
    const primary =
      audience === "staff"
        ? applicationQueryKeys.adminDetail(id)
        : applicationQueryKeys.readView(id);
    const record =
      audience === "staff"
        ? applicationQueryKeys.adminDetail(id)
        : applicationQueryKeys.detail(id);
    const progress = [...workQueueQueryKeys.all, "workflow-progress", id];
    const filter = {
      predicate: (query: { queryKey: QueryKey }) =>
        JSON.stringify(query.queryKey) !== JSON.stringify(primary) &&
        (startsWith(query.queryKey, record) ||
          startsWith(query.queryKey, progress)),
    };
    void client.cancelQueries(filter);
    client.removeQueries(filter);
  }, [client, id, audience, error]);
}
