"use client";

import { useConfig, usePayloadAPI } from "@payloadcms/ui";
import { useCallback, useRef } from "react";

import type { FaqItem } from "../../ContentTypes";

export function useCmsFaqContent(enabled: boolean) {
  const { config } = useConfig();
  const [{ data, isLoading, isError }, { setParams }] = usePayloadAPI(
    enabled ? `${config.routes.api}/faqs` : "",
    {
      initialParams: {
        depth: 0,
        draft: true,
        limit: 20,
        sort: "order",
        select: { question: true, answer: true, category: true },
      },
    },
  );
  const refreshVersion = useRef(0);
  const refresh = useCallback(() => {
    refreshVersion.current += 1;
    const refresh = refreshVersion.current;
    setParams((previous: object) => ({ ...previous, refresh }));
  }, [setParams]);
  const changePage = (page: number) => {
    setParams((previous: object) => ({ ...previous, page }));
  };

  return {
    faqs: (data?.docs ?? []) as FaqItem[],
    isLoading,
    isError,
    page: Number(data?.page ?? 1),
    hasNextPage: Boolean(data?.hasNextPage),
    hasPrevPage: Boolean(data?.hasPrevPage),
    refresh,
    changePage,
  };
}
