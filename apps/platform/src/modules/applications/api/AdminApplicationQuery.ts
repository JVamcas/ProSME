import type { AdminApplicationListInput } from "../ApplicationTypes";

export function adminApplicationQuery(
  input: Omit<AdminApplicationListInput, "limit">,
) {
  const query = new URLSearchParams();
  for (const key of [
    "status",
    "fundingCallId",
    "search",
    "stage",
    "ageMin",
    "ageMax",
    "gender",
    "region",
    "sector",
    "submittedFrom",
    "submittedTo",
    "submittedAfter",
    "submittedBefore",
  ] as const) {
    const value = input[key];
    if (Array.isArray(value)) {
      for (const selected of value) query.append(key, selected);
    } else if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  return query;
}

export function parseAdminApplicationQuery(query: URLSearchParams) {
  const input: Record<string, string | string[]> = Object.fromEntries(query);
  for (const key of [
    "fundingCallId",
    "status",
    "gender",
    "region",
    "sector",
    "stage",
  ]) {
    const values = query.getAll(key);
    if (values.length > 1) input[key] = values;
  }
  return input;
}
