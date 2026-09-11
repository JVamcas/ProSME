import type { Metadata } from "next";
import { Toaster } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Account", template: "%s | ProSME Namibia" },
};

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
