"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { authClientService } from "@/platform/auth/firebase/ClientAuthService";

export default function CmsLogoutButton() {
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
    <div className="cms-logout">
      <GeneralButton
        className="cms-logout__button"
        disabled={pending}
        onClick={logout}
        type="button"
        variant="ghost"
      >
        {pending ? "Signing out…" : "Sign out"}
      </GeneralButton>
      {failed ? (
        <p className="cms-logout__error" role="alert">
          Sign out failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}
