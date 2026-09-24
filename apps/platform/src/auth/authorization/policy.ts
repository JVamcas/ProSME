import type { AuthenticatedUser } from "../types";

export function can(
  user: AuthenticatedUser | null,
  capability: string,
): boolean {
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

export function requireAuthenticatedUser(user: AuthenticatedUser | null) {
  if (!user) {
    throw new AuthenticationRequiredError();
  }
  return user;
}

export function requirePermission(
  user: AuthenticatedUser | null,
  capability: string,
) {
  const actor = requireAuthenticatedUser(user);

  if (!can(actor, capability)) {
    throw new PermissionDeniedError(capability);
  }

  return actor;
}

export function requireAnyPermission(
  user: AuthenticatedUser | null,
  capabilityCodes: readonly string[],
) {
  if (!user) {
    throw new AuthenticationRequiredError();
  }

  if (!capabilityCodes.some((capability) => can(user, capability))) {
    throw new PermissionDeniedError(capabilityCodes.join(" or "));
  }

  return user;
}
