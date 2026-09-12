"use client";

import { useQuery } from "@tanstack/react-query";

import { applicationClientService } from "./application-client.service";

export const applicationQueryKeys = {
  all: ["applications"] as const,
};

export function useApplications() {
  return useQuery({
    queryKey: applicationQueryKeys.all,
    queryFn: applicationClientService.getAll,
  });
}
