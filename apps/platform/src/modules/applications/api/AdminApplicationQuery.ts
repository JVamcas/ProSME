import type { AdminApplicationListInput } from "../ApplicationTypes";

export function adminApplicationQuery(
  input: Omit<AdminApplicationListInput, "limit">,
) {
  const query = new URLSearchParams({ status: input.status });
  for (const key of [
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
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return query;
}
