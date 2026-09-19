import type { FormSection } from "@/modules/forms/FormTypes";

export type FormColumnCount = 1 | 2 | 3;

export function formColumnCount(
  sections: readonly Pick<FormSection, "columnSpan">[],
): FormColumnCount {
  return sections.reduce<FormColumnCount>(
    (maximum, section) => (
      Math.max(maximum, section.columnSpan) as FormColumnCount
    ),
    1,
  );
}

export function formGridClass(columnCount: FormColumnCount) {
  if (columnCount === 1) return "grid-cols-1";
  if (columnCount === 2) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
}

export function previewPanelClass(columnCount: FormColumnCount) {
  if (columnCount === 1) return "w-full max-w-xl sm:w-fit";
  if (columnCount === 2) return "w-full max-w-4xl sm:w-fit";
  return "w-full max-w-6xl sm:w-fit";
}
