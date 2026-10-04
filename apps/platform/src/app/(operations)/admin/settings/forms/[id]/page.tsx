import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formEditorVersionQuerySchema } from "@/modules/forms/api/FormSchemas";
import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { FormEditorWorkspace } from "@/modules/forms/ui/FormEditorWorkspace";

export const metadata: Metadata = { title: "Form editor" };

export default async function FormEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ versionId?: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.workflowFormRead)) {
    redirect("/unauthorized");
  }
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { versionId } = formEditorVersionQuerySchema.parse(query);
  return (
    <FormEditorWorkspace
      canPublish={can(user, permissionCodes.workflowFormPublish)}
      canRetire={can(user, permissionCodes.workflowFormRetire)}
      canUpdate={can(user, permissionCodes.workflowFormUpdate)}
      id={id}
      versionId={versionId}
    />
  );
}
