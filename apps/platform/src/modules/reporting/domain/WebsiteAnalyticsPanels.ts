export type WebsiteTrafficDay = {
  date: string;
  pageViews: number;
  sessions: number;
};
export type WebsiteViewedPage = { path: string; pageViews: number };
export type WebsiteRegion = {
  providerRegion: string;
  canonicalRegion: string | null;
  users: number;
  share: number;
};
export type WebsiteGeography = {
  country: "Namibia";
  regions: WebsiteRegion[];
  regionalUserSum: number;
  shareDenominator: "sum-of-regional-user-counts";
};
export type WebsiteCallEngagement = {
  fundingCallId: string;
  event: string;
  users: number;
  // Older saved reports contain user counts only, not event counts.
  events?: number;
};
export type BoundedWebsiteRows<T> = {
  rows: T[];
  totalRows: number;
  truncated: boolean;
};
export type WebsiteSelfCheckJourney = {
  viewedUsers: number;
  completedSelfCheckUsers: number;
};
