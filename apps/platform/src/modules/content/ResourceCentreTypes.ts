import type { ListingItem } from "./ContentTypes";

export const RESOURCE_PAGE_SIZE = 12;

export type ResourcePage = {
  items: ListingItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

export function resourcePageNumber(value: string | string[] | undefined): number {
  const parsed = typeof value === "string" && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : 1;
  return Number.isSafeInteger(parsed) && parsed <= 100_000 ? parsed : 1;
}
