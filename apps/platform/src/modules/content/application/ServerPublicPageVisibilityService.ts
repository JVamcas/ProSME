import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { readPublicPageVisibility } from "../infrastructure/PublicPageVisibilityRepository";
import {
  isPublicPageVisible,
  isPublicPathVisible,
} from "../domain/PublicPageVisibility";

export const getPublicPageVisibility = cache(async () => {
  await connection();
  return readPublicPageVisibility();
});

export async function requirePublicPage(key: string) {
  if (!isPublicPageVisible(await getPublicPageVisibility(), key)) notFound();
}

export async function requirePublicPath(path: string) {
  if (!isPublicPathVisible(await getPublicPageVisibility(), path)) notFound();
}
