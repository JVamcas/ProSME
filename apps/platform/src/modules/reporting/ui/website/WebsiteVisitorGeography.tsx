import type { WebsiteGeography } from "../../domain/WebsiteAnalyticsPanels";
import { NamibiaVisitorMap } from "./NamibiaVisitorMap";

export function WebsiteVisitorGeography({ data }: { data: WebsiteGeography }) {
  return <NamibiaVisitorMap regions={data.regions} />;
}
