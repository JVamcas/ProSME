import type { ApplicationUser } from "@/db/schema";

export type AuthenticatedUser = ApplicationUser & {
  identitySubject: string;
  capabilities: ReadonlySet<string>;
  roleCodes: ReadonlySet<string>;
};
