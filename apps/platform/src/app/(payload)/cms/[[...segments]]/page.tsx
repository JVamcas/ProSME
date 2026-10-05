import config from "@payload-config";
import { RootPage } from "@payloadcms/next/views";
import { notFound, redirect } from "next/navigation";

import { homeEditorSectionForPath } from "@/modules/content/ui/admin/HomeEditorSections";
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

  if (
    (segments.length === 1 && segments[0] === "home") ||
    (segments.length === 2 && segments.join("/") === "globals/homepage")
  ) {
    redirect("/cms/home/banner");
  }

  const section = homeEditorSectionForPath(`/cms/${segments.join("/")}`);
  if (segments[0] === "home" && !section) {
    notFound();
  }

  return RootPage({
    config,
    importMap,
    params: section
      ? Promise.resolve({ segments: ["globals", "homepage"] })
      : props.params,
    searchParams: props.searchParams,
  });
}
