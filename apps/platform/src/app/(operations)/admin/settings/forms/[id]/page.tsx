import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { FormEditorWorkspace } from "@/components/admin/forms/FormEditorWorkspace";

export const metadata: Metadata = { title: "Form editor" };

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user, capabilities.formRead)) redirect("/unauthorized");
  const { id } = await params;
  return (
    <FormEditorWorkspace
      canPublish={can(user, capabilities.formPublish)}
      canRetire={can(user, capabilities.formRetire)}
      canUpdate={can(user, capabilities.formUpdate)}
      id={id}
    />
  );
}
