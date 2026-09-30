"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientBrandingService } from "../ClientBrandingService";

const brandingKey = ["admin", "branding"] as const;

export function useBrandingSettings() {
  return useQuery({
    queryFn: clientBrandingService.getSettings,
    queryKey: brandingKey,
  });
}

export function useUploadBrandingLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientBrandingService.uploadLogo,
    onSuccess: (settings) => queryClient.setQueryData(brandingKey, settings),
  });
}
