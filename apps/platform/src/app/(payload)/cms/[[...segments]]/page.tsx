import config from "@payload-config";
import { RootPage } from "@payloadcms/next/views";
import { notFound, redirect } from "next/navigation";

import { homeEditorSectionForPath } from "@/modules/content/ui/admin/HomeEditorSections";
import { getPageEditorSegments } from "@/modules/content/ServerCmsPageEditorService";
import {
  cmsFundingOverviewHref,
  cmsPageEditors,
  cmsPageEditorSlugForPath,
} from "@/modules/content/CmsPageEditors";
import { importMap } from "../importMap";
import { fundingOverviewSections } from "@/modules/content/FundingOverviewSections";

type Props = {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Record<string, string | string[]>>;
};

export default async function PayloadAdminPage(props: Props) {
  const { segments = [] } = await props.params;

  if (segments[0] === "login") {
    redirect("/cms");
  }

  if (segments.join("/") === "globals/contact-details") {
    redirect("/cms/contact");
  }

  if (segments.length === 1 && segments[0] === "contact") {
    return RootPage({
      config,
      importMap,
      params: Promise.resolve({ segments: ["globals", "contact-details"] }),
      searchParams: props.searchParams,
    });
  }

  if (segments.length === 1 && segments[0] === "funding") {
    redirect(cmsFundingOverviewHref);
  }

  if (segments.join("/") === "funding/overview") {
    redirect(fundingOverviewSections["funding-support"].href);
  }

  if (segments.length === 1 && segments[0] === "how-to-apply") {
    redirect(cmsPageEditors["how-to-apply"].href);
  }

  const cmsPage = cmsPageEditorSlugForPath(`/cms/${segments.join("/")}`);
  if (cmsPage) {
    const editorSegments = await getPageEditorSegments(cmsPage);
    return RootPage({
      config,
      importMap,
      params: Promise.resolve({ segments: editorSegments }),
      searchParams: Promise.resolve({
        ...(await props.searchParams),
        cmsPage,
      }),
    });
  }

  if (segments[0] === "funding") {
    notFound();
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
