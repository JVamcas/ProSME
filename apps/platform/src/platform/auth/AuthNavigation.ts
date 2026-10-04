export const authRequestPathHeader = "x-platform-request-path";

export type AuthNavigationQuery = {
  returnTo?: string | string[];
  next?: string | string[];
};

export function safeReturnTo(value: string | string[] | null | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return undefined;
  }

  try {
    const decoded = decodeURIComponent(path);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) {
      return undefined;
    }
    const base = "https://platform.invalid";
    if (new URL(path, base).origin !== base) {
      return undefined;
    }
    return path;
  } catch {
    return undefined;
  }
}

export function authReturnTo(query: AuthNavigationQuery) {
  return safeReturnTo(query.returnTo ?? query.next);
}

export function authNavigationHref(path: string, returnTo?: string) {
  const destination = safeReturnTo(returnTo);
  return destination
    ? `${path}?${new URLSearchParams({ returnTo: destination })}`
    : path;
}
