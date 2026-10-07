import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { canAccessApplicantPortal } from "@/auth/authorization/portal-access";
import { AuthenticatedPortalShell } from "@/shared/ui/portal/authenticated-portal-shell";
import { QueryProvider } from "@/shared/ui/portal/query-provider";
import { createApplicantPortalContext } from "@/modules/profiles/ServerProfileService";
import { queryIdentity } from "@/shared/utils/createQueryClient";
import { DashboardNavigationProvider } from "@/modules/dashboard/ui/DashboardNavigationProvider";
import { Toast } from "@/shared/ui/Toast";
import { WebsiteAnalyticsCollection } from "@/modules/reporting/ui/WebsiteAnalyticsCollection";
import "../../globals.css";

export const metadata: Metadata = {
  title: {
    default: "Applicant portal",
    template: "%s | SME Fund Applicant Portal",
  },
};

type PortalLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const user = await getAuthenticatedPageUser();

  if (!canAccessApplicantPortal(user)) {
    redirect("/unauthorized");
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider
          identity={queryIdentity(user.id, user.capabilities, user.roleCodes)}
        >
          <DashboardNavigationProvider audience="applicant">
            <AuthenticatedPortalShell
              context={createApplicantPortalContext(user)}
              space="applicant"
            >
              {children}
            </AuthenticatedPortalShell>
            <Toast />
            <WebsiteAnalyticsCollection />
          </DashboardNavigationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
