import config from "@payload-config";
import { RootPage } from "@payloadcms/next/views";
import { redirect } from "next/navigation";

import { importMap } from "../importMap";

type Props = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export default async function PayloadAdminPage(props: Props) {
  const { segments = [] } = await props.params;

  if (segments[0] === "login") {
    redirect("/cms");
  }

  return RootPage({
    config,
    importMap,
    params: props.params,
    searchParams: props.searchParams,
  });
}
