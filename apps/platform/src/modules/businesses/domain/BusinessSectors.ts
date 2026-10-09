import type { BusinessProfileInput } from "../BusinessSchemas";

export const businessSectors = [
  "Agriculture and agro-processing",
  "Tourism and hospitality",
  "Information and Communication Technology (ICT)",
  "Manufacturing and value addition",
  "Export-oriented enterprises",
  "Artisanal mining",
  "Blue economy",
  "Circular economy",
  "Culture & creative industries",
  "Financial services",
  "Health, wellness & grooming",
  "Renewable energy & green technologies",
] as const;

export const otherBusinessSector = "OTHER";

export const businessSectorOptions = [
  ...businessSectors.map((sector) => ({ label: sector, value: sector })),
  { label: "Other (please specify)", value: otherBusinessSector },
];

export function isBusinessSectorChoice(value: string) {
  return businessSectorOptions.some((option) => option.value === value);
}

export function businessSectorInput(value: string | null | undefined) {
  if (!value) return { selection: "", other: "" };
  if (businessSectors.some((sector) => sector === value)) {
    return { selection: value, other: "" };
  }
  return { selection: otherBusinessSector, other: value };
}

export function businessSectorFormValues(input: BusinessProfileInput) {
  const primary = businessSectorInput(input.sector);
  const secondary = businessSectorInput(input.secondarySector);
  return {
    ...input,
    sector: primary.selection,
    sectorOther: primary.other,
    secondarySector: secondary.selection,
    secondarySectorOther: secondary.other,
  };
}

export function resolvedBusinessSector(selection?: string, other?: string) {
  return selection === otherBusinessSector
    ? (other ?? "").trim()
    : (selection ?? "");
}
