"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClientService } from "@/auth/firebase/auth-client.service";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const logout = useMutation({
    mutationFn: authClientService.logout,
    onSuccess: () => {
      router.replace("/sign-in");
      router.refresh();
    },
  });

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
      className="h-auto justify-start rounded-none px-4 py-3 text-left text-white/55 hover:bg-transparent hover:text-white"
    >
      <LogOutIcon className="size-4 text-brand-orange" />
      {logout.isPending ? "Logging out…" : "Logout"}
    </Button>
  );
}
