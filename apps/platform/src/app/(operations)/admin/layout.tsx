import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { AdminShell } from "@/components/admin/admin-shell";
import "../../globals.css";

export const metadata: Metadata = { title: { default: "Internal dashboard", template: "%s | ProSME Internal" } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (!can(user, capabilities.adminAccess)) redirect("/unauthorized");
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
