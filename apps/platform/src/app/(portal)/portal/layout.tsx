import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { canAccessApplicantPortal } from "@/auth/authorization/portal-access";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import { createApplicantPortalContext } from "@/modules/profiles/ServerProfileService";
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/portal");
  }

  if (!canAccessApplicantPortal(user)) {
    redirect("/unauthorized");
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthenticatedPortalShell
            context={createApplicantPortalContext(user)}
            space="applicant"
          >
            {children}
          </AuthenticatedPortalShell>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
