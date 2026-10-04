import type { Metadata } from "next";

import { PublicSiteShell } from "@/modules/content/ui/public/PublicSiteShell";
import { QueryProvider } from "@/shared/ui/portal/query-provider";
import { Toast } from "@/shared/ui/Toast";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Account", template: "%s | SME Fund Namibia" },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          <PublicSiteShell>{children}</PublicSiteShell>
          <Toast />
        </QueryProvider>
      </body>
    </html>
  );
}
