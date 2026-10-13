import { getAvailablePortalSpaces } from "@/auth/authorization/portal-access";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { Logo } from "@/shared/ui/Logo";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalSpaceSwitcher } from "@/shared/ui/portal/portal-space-switcher";

import CmsHeaderLabel from "./CmsHeaderLabel";
import CmsLogoutButton from "./CmsLogoutButton";

export async function CmsAccessDenied() {
  const user = await getAuthenticatedPageUser();

  return (
    <section aria-label="CMS workspace" className="min-h-dvh">
      <header className="flex flex-wrap items-center gap-6 bg-brand-navy p-4 text-white sm:px-8">
        <Logo href="/cms" />
        <CmsHeaderLabel />
        <div className="ml-auto w-full sm:w-80">
          <PortalSpaceSwitcher
            availableSpaces={getAvailablePortalSpaces(user)}
            currentSpace="cms"
            dark
          />
        </div>
        <CmsLogoutButton />
      </header>
      <main className="p-4 sm:p-8">
        <PortalErrorState
          title="CMS access denied"
          description="You do not have access to this CMS area. Contact your administrator if you believe you should have access."
        />
      </main>
    </section>
  );
}
