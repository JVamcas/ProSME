export const namibianRegions = [
  "Erongo",
  "Hardap",
  "Kavango East",
  "Kavango West",
  "ǁKaras",
  "Khomas",
  "Kunene",
  "Ohangwena",
  "Omaheke",
  "Omusati",
  "Oshana",
  "Oshikoto",
  "Otjozondjupa",
  "Zambezi",
] as const;

export const businessTypes = [
  "Close corporation",
  "Company",
  "Co-operative",
  "Partnership",
  "Sole proprietor",
  "Other",
] as const;

export const selectItems = (values: readonly string[]) =>
  values.map((value) => ({ label: value, value }));
