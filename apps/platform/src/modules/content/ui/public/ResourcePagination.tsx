"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";
import type { ResourcePage } from "../../ResourceCentreTypes";

export function ResourcePagination({ result }: { result: ResourcePage }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/resources?${params.toString()}`);
  }

  return (
    <Pagination
      hasNextPage={result.hasNextPage}
      onNext={() => goToPage(result.page + 1)}
      onPrevious={() => goToPage(result.page - 1)}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
    />
  );
}
