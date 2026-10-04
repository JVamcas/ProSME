import type {
  AdminApplicationListInput,
  ApplicationListInput,
} from "../ApplicationTypes";

export const applicationQueryKeys = {
  all: ["applications"] as const,
  own: ["portal", "applications"] as const,
  list: (input: ApplicationListInput) =>
    ["portal", "applications", "list", input] as const,
  readView: (id: string) =>
    ["portal", "applications", id, "read-view"] as const,
  detail: (id: string) => ["portal", "applications", id] as const,
  status: (id: string) => ["portal", "applications", id, "status"] as const,
  statusHistory: (id: string) =>
    ["portal", "applications", id, "status-history"] as const,
  admin: ["admin", "applications"] as const,
  adminDetail: (id: string) => ["admin", "applications", "detail", id] as const,
  adminList: (input: AdminApplicationListInput) =>
    ["admin", "applications", input] as const,
};
