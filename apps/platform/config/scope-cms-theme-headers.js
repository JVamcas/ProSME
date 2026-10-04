const themeHint = "sec-ch-prefers-color-scheme";
const hintHeaderNames = new Set(["accept-ch", "critical-ch", "vary"]);

// Payload's critical theme hint restarts first Chromium document requests.
// Only the embedded CMS needs that negotiation; platform pages have their own theme.
export function scopeCmsThemeHeaders(rules) {
  return rules.flatMap((rule) => {
    if (rule.source !== "/:path*") return [rule];
    const platformHeaders = [];
    const cmsHeaders = [];
    for (const header of rule.headers) {
      const tokens = header.value.split(",").map((token) => token.trim());
      const isThemeHeader =
        hintHeaderNames.has(header.key.toLowerCase()) &&
        tokens.some((token) => token.toLowerCase() === themeHint);
      if (!isThemeHeader) {
        platformHeaders.push(header);
        continue;
      }
      cmsHeaders.push({ ...header, value: "Sec-CH-Prefers-Color-Scheme" });
      const otherTokens = tokens.filter(
        (token) => token.toLowerCase() !== themeHint,
      );
      if (otherTokens.length) {
        platformHeaders.push({ ...header, value: otherTokens.join(", ") });
      }
    }
    if (!cmsHeaders.length) return [rule];
    return [
      ...(platformHeaders.length
        ? [{ ...rule, headers: platformHeaders }]
        : []),
      { source: "/cms/:path*", headers: cmsHeaders },
    ];
  });
}
