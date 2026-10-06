import "server-only";

import { draftMode } from "next/headers";
import type { Where } from "payload";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { readResourceBySlug, readResourcePage, readResourceSitemap } from "./infrastructure/PayloadResourceCentreRepository";
import { RESOURCE_PAGE_SIZE, resourcePageNumber, type ResourcePage } from "./ResourceCentreTypes";

async function resourceReadMode() {
  const requested = (await draftMode()).isEnabled;
  const draft = requested
    ? can(await getCurrentUser(), cmsPermissionCode("resources", "read"))
    : false;
  const where: Where = draft ? {} : { _status: { equals: "published" } };
  return {
    draft,
    where,
  };
}

export async function getResourcePage(value?: string | string[]): Promise<ResourcePage> {
  const page = resourcePageNumber(value);
  if (process.env.SKIP_CMS_PRERENDER === "1") {
    return {
      items: [],
      page,
      pageSize: RESOURCE_PAGE_SIZE,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
    };
  }
  return readResourcePage(page, await resourceReadMode());
}

export async function getResource(slug: string) {
  if (process.env.SKIP_CMS_PRERENDER === "1") return null;
  return readResourceBySlug(slug, await resourceReadMode());
}

export async function getResourceSitemapEntries() {
  if (process.env.SKIP_CMS_PRERENDER === "1") return [];
  return readResourceSitemap();
}
