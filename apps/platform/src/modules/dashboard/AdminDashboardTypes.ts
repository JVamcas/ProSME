export const adminDashboardPeriods = ["7", "30", "90", "all"] as const;

export type AdminDashboardPeriod = (typeof adminDashboardPeriods)[number];

export type AdminDashboardStatus = {
  count: number;
  label: string;
};

export type AdminDashboardActivity = {
  actorName: string;
  applicationId: string;
  applicationReference: string;
  eventCode: string;
  occurredAt: string;
};

export type AdminDashboardView = {
  activities: AdminDashboardActivity[];
  metrics: {
    informationRequests: number;
    pendingDecision: number;
    totalApplications: number;
    underReview: number;
  };
  period: AdminDashboardPeriod;
  submissionWindow?: { from: string | null; to: string };
  statuses: AdminDashboardStatus[];
  visibility: "all" | "assigned" | "none";
};
