"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@/shared/ui/Pagination";

export function EventPagination({
  eventType,
  page,
  pageSize,
  search,
  total,
}: {
  eventType?: string;
  page: number;
  pageSize: number;
  search: string;
  total: number;
}) {
  const router = useRouter();

  function navigate(nextPage: number) {
    const parameters = new URLSearchParams();
    if (search) parameters.set("search", search);
    if (eventType) parameters.set("eventType", eventType);
    if (nextPage > 1) parameters.set("page", String(nextPage));
    const suffix = parameters.toString();
    router.push(suffix ? `/events?${suffix}` : "/events");
  }

  return (
    <Pagination
      hasNextPage={page * pageSize < total}
      onNext={() => navigate(page + 1)}
      onPrevious={() => navigate(page - 1)}
      page={page}
      pageSize={pageSize}
      total={total}
    />
  );
}
