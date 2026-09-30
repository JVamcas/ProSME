import { ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { BrandingSettingsPage } from "@/modules/branding/ui/BrandingSettingsPage";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Branding" };

export default async function AdminBrandingPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.brandingRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Manage the logo used by platform-generated email and shared brand experiences."
      eyebrow="Administration"
      icon={<ImageIcon />}
      title="Branding"
    >
      <BrandingSettingsPage canManage={can(user, permissionCodes.brandingManage)} />
    </PageShell>
  );
}
