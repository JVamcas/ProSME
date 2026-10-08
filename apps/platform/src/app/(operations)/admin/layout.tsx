import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";
import { AuthenticatedPortalShell } from "@/shared/ui/portal/authenticated-portal-shell";
import { QueryProvider } from "@/shared/ui/portal/query-provider";
import { createPortalContext } from "@/modules/profiles/ServerProfileService";
import { queryIdentity } from "@/shared/utils/createQueryClient";
import { DashboardNavigationProvider } from "@/modules/dashboard/ui/DashboardNavigationProvider";
import { Toast } from "@/shared/ui/Toast";
import { SessionActivityMonitor } from "@/platform/auth/ui/SessionActivity";
import "../../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Internal dashboard",
    template: "%s | SME Fund Internal",
  },
};

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getAuthenticatedPageUser();

  if (!canAccessOperationsPortal(user)) {
    redirect("/unauthorized");
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider
          identity={queryIdentity(user.id, user.capabilities, user.roleCodes)}
        >
          <SessionActivityMonitor />
          <DashboardNavigationProvider audience="staff">
            <AuthenticatedPortalShell
              context={createPortalContext(user)}
              space="operations"
            >
              {children}
            </AuthenticatedPortalShell>
            <Toast />
          </DashboardNavigationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
