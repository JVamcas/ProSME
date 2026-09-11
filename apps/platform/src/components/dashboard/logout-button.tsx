"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const tokenResponse = await fetch("/api/auth/session", { cache: "no-store" });
    const { token } = await tokenResponse.json() as { token: string };
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrfToken: token }),
    });
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className="flex items-center gap-3 px-4 py-3 text-left text-white/55 hover:text-white">
      <LogOutIcon className="size-4" />
      Logout
    </button>
  );
}
