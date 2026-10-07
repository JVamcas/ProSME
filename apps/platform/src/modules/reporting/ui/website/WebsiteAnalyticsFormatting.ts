export function analyticsCount(value: number | null | undefined) {
  return value === null || value === undefined
    ? "Unavailable"
    : new Intl.NumberFormat("en-NA").format(value);
}

export function analyticsPercent(value: number | null | undefined) {
  return value === null || value === undefined
    ? "Unavailable"
    : new Intl.NumberFormat("en-NA", {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}

export function analyticsDuration(value: number | null | undefined) {
  if (value === null || value === undefined) return "Unavailable";
  const seconds = Math.round(value);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
