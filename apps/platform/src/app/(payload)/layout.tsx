import config from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import { redirect } from "next/navigation";
import type { ServerFunctionClient } from "payload";
import React from "react";

import { permissionCodes } from "@/auth/authorization/permissions";
import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { can } from "@/auth/authorization/policy";
import { importMap } from "./cms/importMap";
import "@/shared/ui/brand-tokens.css";
import "./custom.scss";

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
    >
      {children}
    </RootLayout>
  );
}
