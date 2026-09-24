import type { AuthenticatedUser } from "../types";
import { requirePermission as enforceCapability } from "./policy";

export function requireCapability(user: AuthenticatedUser | null, capability: string) {
  return enforceCapability(user, capability);
}
