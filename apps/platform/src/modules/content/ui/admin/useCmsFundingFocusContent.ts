"use client";

import { useCallback, useRef } from "react";
import { useConfig, usePayloadAPI } from "@payloadcms/ui";
import type { EligibilityItem } from "../../ContentTypes";
import { eligibilityFocusSection } from "../../EligibilityPageContent";

export type CmsFocusSector = EligibilityItem & { id: number; order: number };

export function useCmsFundingFocusContent(enabled: boolean) {
  const { config } = useConfig();
  const sectorParams = {
    depth: 0,
    draft: true,
    limit: 50,
    sort: "order",
    where: { kind: { equals: "focusSector" } },
    select: { label: true, kind: true, description: true, order: true },
  };
  const pageParams = {
    depth: 0,
    draft: true,
    limit: 1,
    where: { slug: { equals: "eligibility" } },
    select: { layout: true },
  };
  const [sectors, sectorApi] = usePayloadAPI(
    enabled ? `${config.routes.api}/eligibility-content` : "",
    { initialParams: sectorParams },
  );
  const [page, pageApi] = usePayloadAPI(
    enabled ? `${config.routes.api}/pages` : "",
    { initialParams: pageParams },
  );
  const refreshVersion = useRef(0);
  const setSectorParams = sectorApi.setParams;
  const setPageParams = pageApi.setParams;
  const refresh = useCallback(() => {
    refreshVersion.current += 1;
    const refresh = refreshVersion.current;
    setSectorParams((previous: object) => ({ ...previous, refresh }));
    setPageParams((previous: object) => ({ ...previous, refresh }));
  }, [setSectorParams, setPageParams]);
  const document = page.data?.docs?.[0];

  return {
    sectors: (sectors.data?.docs ?? []) as CmsFocusSector[],
    focus: eligibilityFocusSection(document?.layout ?? []),
    pageId: document?.id as number | undefined,
    isLoading: sectors.isLoading || page.isLoading,
    isError: sectors.isError || page.isError,
    hasNextPage: Boolean(sectors.data?.hasNextPage),
    hasPrevPage: Boolean(sectors.data?.hasPrevPage),
    page: Number(sectors.data?.page ?? 1),
    changePage: (nextPage: number) => sectorApi.setParams({ ...sectorParams, page: nextPage }),
    refresh,
  };
}
