export const csrfCookieName = "smefund_csrf";

export function getSessionCookieName() {
  return process.env.NODE_ENV === "production" ? "__Host-smefund_session" : "smefund_session";
}

export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(";")) {
    const [key, ...value] = item.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }

  return null;
}
