"use client";

import { useQuery } from "@tanstack/react-query";

import { clientApplicationService } from "./ClientApplicationService";

export const applicationQueryKeys = {
  all: ["applications"] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationQueryKeys.all,
    queryFn: clientApplicationService.getAll,
  });
}
