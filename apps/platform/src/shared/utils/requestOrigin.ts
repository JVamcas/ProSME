export function isSameOriginRequest(headers: Headers, requestUrl: string) {
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") {
    return false;
  }

  try {
    const url = new URL(requestUrl);
    // Standalone Next.js uses its internal bind address in request.url.
    // Host preserves the browser-facing authority. The deployment's TLS
    // proxy must overwrite X-Forwarded-Proto with the original protocol.
    const host = headers.get("host") ?? url.host;
    const protocol =
      headers.get("x-forwarded-proto") ?? url.protocol.slice(0, -1);
    if (protocol !== "http" && protocol !== "https") {
      return false;
    }

    const expected = new URL(`${protocol}://${host}`);
    if (
      expected.username ||
      expected.password ||
      expected.pathname !== "/" ||
      expected.search ||
      expected.hash
    ) {
      return false;
    }
    return headers.get("origin") === expected.origin;
  } catch {
    return false;
  }
}
