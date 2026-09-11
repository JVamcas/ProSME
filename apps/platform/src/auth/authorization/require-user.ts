import type { AuthenticatedUser } from "../types";
import { AuthenticationRequiredError } from "./policy";

export function requireUser(user: AuthenticatedUser | null) {
  if (!user) throw new AuthenticationRequiredError();
  return user;
}
