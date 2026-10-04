import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";

import { authNavigationHref, authRequestPathHeader } from "./AuthNavigation";

export async function redirectToSignIn(): Promise<never> {
  const requestHeaders = await headers();
  const returnTo = requestHeaders.get(authRequestPathHeader) ?? undefined;
  redirect(authNavigationHref("/sign-in", returnTo));
}

export async function getAuthenticatedPageUser() {
  const user = await getCurrentUser();
  if (!user) {
    return redirectToSignIn();
  }
  return user;
}
