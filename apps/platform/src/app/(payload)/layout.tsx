import config from "@payload-config";
import "@payloadcms/next/css";
import { RootLayout, handleServerFunctions } from "@payloadcms/next/layouts";
import { redirect } from "next/navigation";
import type { ServerFunctionClient } from "payload";
import React from "react";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { importMap } from "./cms/importMap";
import "./custom.scss";

type Props = { children: React.ReactNode };



const serverFunction: ServerFunctionClient = async (args) => {
  "use server";
  return handleServerFunctions({ ...args, config, importMap });
};

export default async function PayloadLayout({ children }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in?next=/cms");
  }

  if (!can(user, capabilities.cmsAccess)) {
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
