import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";

import { getCurrentUser } from "@/auth/authorization/current-user";
import "../../globals.css";

export const metadata: Metadata = {
  title: { default: "Applicant portal", template: "%s | ProSME Applicant Portal" },
};

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/portal");

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
