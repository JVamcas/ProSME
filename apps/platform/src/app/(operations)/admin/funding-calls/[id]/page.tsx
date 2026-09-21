import { CircleDollarSign } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { PageHeader } from "@/components/ui/PageHeader";
import { FundingCallEditor } from "@/modules/funding-calls/ui/FundingCallEditor";

export const metadata: Metadata = { title: "Edit funding call" };

export default async function FundingCallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.fundingCallRead)) {
    redirect("/unauthorized");
  }
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) {
    redirect("/admin/funding-calls");
  }

  return (
    <section>
      <PageHeader
        description="Edit the business details and application window while this call is a draft."
        eyebrow="Programmes"
        icon={<CircleDollarSign />}
        title="Edit funding call"
      />
      <FundingCallEditor
        canUpdate={can(user, permissionCodes.fundingCallUpdate)}
        id={id.data}
      />
    </section>
  );
}
