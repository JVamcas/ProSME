export const applicantSnapshotFields = [
  ["displayName", "Name"],
  ["email", "Email"],
  ["phoneNumber", "Phone"],
  ["dateOfBirth", "Date of birth"],
  ["nationality", "Nationality"],
  ["position", "Position"],
  ["postalAddress", "Postal address"],
  ["region", "Region"],
] as const;

export const businessSnapshotFields = [
  ["legalName", "Legal name"],
  ["tradingName", "Trading name"],
  ["registrationNumber", "Registration number"],
  ["businessType", "Business type"],
  ["sector", "Sector"],
  ["physicalAddress", "Physical address"],
  ["region", "Region"],
  ["employeeCount", "Employees"],
  ["establishedYear", "Established"],
] as const;

export function selectedSnapshotDetails(
  source: Record<string, unknown>,
  fields: readonly (readonly [string, string])[],
) {
  return fields.flatMap(([key, label]) => {
    const value = source[key];
    if (typeof value !== "string" && typeof value !== "number") return [];
    if (String(value).trim() === "") return [];
    return [{ label, value: String(value) }];
  });
}
