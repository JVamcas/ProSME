export type ApplicationAppealSummary = {
  id: string;
  reference: string;
  applicationId: string;
  applicationReference: string;
  name: string;
  state: "NEW" | "IN_PROGRESS" | "RESOLVED";
  assignedTo: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
};
export type ApplicationAppeal = ApplicationAppealSummary & {
  email: string;
  phone: string;
  grounds: string;
  details: string;
  resolutionNote: string | null;
};
export type AppealCursor = { after: string; afterId: string };
export type AppealQueue = {
  items: ApplicationAppealSummary[];
  nextCursor: AppealCursor | null;
};
