import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { QueryProvider } from "@/components/layout/query-provider";
import "../../globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Applicant portal", template: "%s | ProSME Applicant Portal" },
};

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?next=/portal");
  }

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
