"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { authClientService } from "@/platform/auth/firebase/ClientAuthService";

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      return authClientService.logout();
    },
    onSuccess: () => {
      queryClient.clear();
      router.replace("/sign-in");
      router.refresh();
    },
  });
}
