import config from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import { redirect } from "next/navigation";
import type { ServerFunctionClient } from "payload";
import React from "react";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { cmsAdminClassName } from "@/modules/content/ui/admin/CmsAdminTheme";
import { importMap } from "./cms/importMap";
import "./tailwind.css";

type Props = { children: React.ReactNode };

const serverFunction: ServerFunctionClient = async (args) => {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default async function PayloadLayout({ children }: Props) {
  const user = await getAuthenticatedPageUser();

  if (!can(user, permissionCodes.cmsAccess)) {
    redirect("/unauthorized");
  }

  return (
    <RootLayout
      config={config}
      importMap={importMap}
      serverFunction={serverFunction}
      htmlProps={{ className: cmsAdminClassName }}
    >
      {children}
    </RootLayout>
  );
}
