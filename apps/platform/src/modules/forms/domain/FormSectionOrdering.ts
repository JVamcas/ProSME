import type { FormSection } from "./FormDefinition";

export function formSectionIdentity(section: FormSection) {
  return `section:${section.id ?? section.key}`;
}

export function moveFormSection(
  sections: FormSection[],
  activeId: string,
  overId: string,
) {
  const oldIndex = sections.findIndex(
    (section) => formSectionIdentity(section) === activeId,
  );
  const newIndex = sections.findIndex(
    (section) => formSectionIdentity(section) === overId,
  );
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return sections;
  const reordered = [...sections];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);
  return reordered.map((section, index) => ({
    ...section,
    order: index + 1,
  }));
}
