import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toast } from "@/shared/ui/Toast";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Account", template: "%s | ProSME Namibia" },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toast />
        </QueryProvider>
      </body>
    </html>
  );
}
