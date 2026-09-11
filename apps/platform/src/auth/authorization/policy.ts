import type { AuthenticatedUser } from "../types";

export function can(user: AuthenticatedUser | null, capability: string): boolean {
  return user?.status === "active" && user.capabilities.has(capability);
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class PermissionDeniedError extends Error {
  constructor(capability: string) {
    super(`Missing required capability: ${capability}`);
    this.name = "PermissionDeniedError";
  }
}

export function requireCapability(user: AuthenticatedUser | null, capability: string) {
  if (!user) throw new AuthenticationRequiredError();
  if (!can(user, capability)) throw new PermissionDeniedError(capability);
  return user;
}
