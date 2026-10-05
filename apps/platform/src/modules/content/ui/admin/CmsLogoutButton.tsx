"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SidebarLogoutControl } from "@/shared/ui/navigation/SidebarLogoutControl";
import { authClientService } from "@/platform/auth/firebase/ClientAuthService";

export default function CmsLogoutButton({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logout() {
    setPending(true);
    setFailed(false);

    try {
      await authClientService.logout();
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div>
      <SidebarLogoutControl
        collapsed={collapsed}
        onLogout={logout}
        pending={pending}
      />
      {failed ? (
        <p className="mx-3 mt-2 mb-0 text-xs text-brand-navy" role="alert">
          Sign out failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}
