import type { Metadata } from "next";
import { Toaster } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import "../globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Account", template: "%s | ProSME Namibia" },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
