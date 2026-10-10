"use client";

import { usePathname } from "next/navigation";

import { useWebsiteHeatmapCollection } from "./useWebsiteHeatmapCollection";

export function WebsiteHeatmapCollection({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  useWebsiteHeatmapCollection(enabled, pathname);
  return null;
}
