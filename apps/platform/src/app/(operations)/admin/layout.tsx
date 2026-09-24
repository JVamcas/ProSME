import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";
import { AuthenticatedPortalShell } from "@/components/layout/authenticated-portal-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import { createPortalContext } from "@/modules/profiles/ServerProfileService";
import { Toast } from "@/shared/ui/Toast";
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
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?next=/admin");
  }

  if (!canAccessOperationsPortal(user)) {
    redirect("/unauthorized");
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          <AuthenticatedPortalShell
            context={createPortalContext(user)}
            space="operations"
          >
            {children}
          </AuthenticatedPortalShell>
          <Toast />
        </QueryProvider>
      </body>
    </html>
  );
}
