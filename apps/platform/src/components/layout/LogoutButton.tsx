"use client";

import { useMutation } from "@tanstack/react-query";
import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClientService } from "@/auth/firebase/ClientAuthService";
import { GeneralButton } from "@/components/ui/button";

export function LogoutButton({
  collapsed = false,
  tone = "dark",
}: {
  collapsed?: boolean;
  tone?: "brand" | "dark";
}) {
  const router = useRouter();
  const logout = useMutation({
    mutationFn: authClientService.logout,
    onSuccess: () => {
      router.replace("/sign-in");
      router.refresh();
    },
  });

  return (
    <GeneralButton
      type="button"
      variant="ghost"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
      title={collapsed ? "Logout" : undefined}
      className={
        tone === "brand"
          ? `h-11 w-full rounded-xl text-brand-navy hover:bg-brand-navy/10 ${collapsed ? "justify-center px-2" : "justify-start px-3"}`
          : `h-auto py-3 text-left text-white/55 hover:bg-transparent hover:text-white ${collapsed ? "justify-center rounded-xl px-2" : "justify-start rounded-none px-4"}`
      }
    >
      <LogOutIcon
        className={
          tone === "brand"
            ? "size-4 text-brand-navy"
            : "size-4 text-brand-orange"
        }
      />
      <span className={collapsed ? "sr-only" : undefined}>
        {logout.isPending ? "Logging out…" : "Logout"}
      </span>
    </GeneralButton>
  );
}
