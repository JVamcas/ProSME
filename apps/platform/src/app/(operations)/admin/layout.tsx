import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { AdminShell } from "@/components/admin/admin-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import "../../globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Internal dashboard",
    template: "%s | ProSME Internal",
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

  if (!can(user, capabilities.adminAccess)) {
    redirect("/unauthorized");
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          <AdminShell>{children}</AdminShell>
        </QueryProvider>
      </body>
    </html>
  );
}
