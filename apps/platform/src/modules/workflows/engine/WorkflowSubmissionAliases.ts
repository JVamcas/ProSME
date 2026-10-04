function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Keep a legacy stage value only when exactly one submission supplies it. */
export function mergeUnambiguousSubmissionAliases(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  seen: Set<string>,
  ambiguous: Set<string>,
  prefix = "",
) {
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (ambiguous.has(path)) continue;
    if (isRecord(value)) {
      if (seen.has(path)) {
        delete target[key];
        ambiguous.add(path);
        continue;
      }
      const child = isRecord(target[key]) ? target[key] : {};
      mergeUnambiguousSubmissionAliases(child, value, seen, ambiguous, path);
      if (Object.keys(child).length) target[key] = child;
      else delete target[key];
      continue;
    }
    if (seen.has(path) || Object.hasOwn(target, key)) {
      delete target[key];
      ambiguous.add(path);
    } else {
      target[key] = value;
      seen.add(path);
    }
  }
}
