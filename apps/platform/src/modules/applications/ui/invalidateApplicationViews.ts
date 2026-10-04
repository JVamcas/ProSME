import type { QueryClient } from "@tanstack/react-query";
import { dashboardQueryKeys } from "@/modules/dashboard/ui/useDashboard";
import { workQueueQueryKeys } from "@/modules/work-queue/ui/WorkQueueQueryKeys";
import { applicationQueryKeys } from "./ApplicationQueryKeys";

export function invalidateApplicationViews(
  client: QueryClient,
  workflow = false,
) {
  const keys = [
    applicationQueryKeys.all,
    applicationQueryKeys.own,
    applicationQueryKeys.admin,
    dashboardQueryKeys.all,
  ];
  return Promise.all([
    ...keys.map((queryKey) => client.invalidateQueries({ queryKey })),
    ...(workflow
      ? [client.invalidateQueries({ queryKey: workQueueQueryKeys.all })]
      : []),
  ]);
}
