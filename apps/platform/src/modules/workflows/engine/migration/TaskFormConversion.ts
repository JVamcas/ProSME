import type {
  FormField,
  FormSection,
  FormRuntimeSchema,
} from "@/modules/forms/FormTypes";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "../../domain/definitions/WorkflowTypes";
import { taskSectionOrder } from "../../domain/definitions/WorkflowTaskSectionOrder";
import { uniqueStableKeyFromLabel } from "../../domain/WorkflowStableKey";

export type ConvertedTaskForm = Pick<
  FormRuntimeSchema,
  "fields" | "sections"
> & {
  sourceKeys: Record<string, string>;
};

export function convertTaskForm(
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
  source?: Pick<FormRuntimeSchema, "fields" | "sections"> | null,
  newId: () => string = () => crypto.randomUUID(),
): ConvertedTaskForm {
  const fields: FormField[] = [];
  const sections: FormSection[] = [];
  const sourceKeys: Record<string, string> = {};
  const keys = (source?.fields ?? []).map((field) => field.key);
  const sectionKeys = (source?.sections ?? []).map((section) => section.key);
  const addSection = (title: string) => {
    const key = uniqueStableKeyFromLabel(title, sectionKeys, "SECTION");
    sectionKeys.push(key);
    const section = {
      id: newId(),
      key,
      title,
      description: "",
      order: sections.length + 1,
      columnSpan: 1 as const,
      showContainer: true,
    };
    sections.push(section);
    return section.id;
  };
  const add = (
    sectionId: string,
    sourceKey: string,
    input: Pick<FormField, "label" | "type" | "required"> & Partial<FormField>,
  ) => {
    const key = uniqueStableKeyFromLabel(sourceKey, keys, "FIELD");
    keys.push(key);
    sourceKeys[sourceKey] = key;
    fields.push({
      ...input,
      id: newId(),
      key,
      sectionId,
      columnSpan: 1,
      order: fields.filter((field) => field.sectionId === sectionId).length + 1,
    });
    return key;
  };
  const checklist = stage.checklistItems.filter(
    (item) => item.taskStableKey === task.stableKey,
  );
  const documents = stage.documentRequirements.filter(
    (item) => item.taskStableKey === task.stableKey,
  );
  const scoring = stage.scoring?.find(
    (item) => item.taskStableKey === task.stableKey,
  );
  const comments = (stage.commentFields ?? []).filter(
    (item) => item.taskStableKey === task.stableKey,
  );
  for (const kind of taskSectionOrder(task.config)) {
    if (kind === "form" && source) {
      for (const section of [...source.sections].sort(
        (a, b) => a.order - b.order,
      )) {
        const id = newId();
        sections.push({ ...section, id, order: sections.length + 1 });
        fields.push(
          ...source.fields
            .filter((field) => field.sectionId === section.id)
            .map((field) => ({ ...field, id: newId(), sectionId: id })),
        );
      }
    }
    if (kind === "checklist" && checklist.length) {
      const id = addSection("Checklist");
      for (const item of [...checklist].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      )) {
        add(id, `CHECK_${item.key}`, {
          label: item.text,
          type: "CHECKBOX",
          required: item.mandatory,
          helpText: item.notes,
        });
        if (item.responseType !== "YES_NO") {
          add(id, `ANSWER_${item.key}`, {
            label: `${item.text} — response`,
            type: item.responseType,
            required: false,
          });
        }
        add(id, `EVIDENCE_${item.key}`, {
          label: "Notes / evidence",
          type: "TEXTAREA",
          required: false,
          helpText:
            item.evidenceRequirement === "REQUIRED"
              ? "Provide the required supporting evidence."
              : "",
          maxLength: 1000,
        });
      }
    }
    if (kind === "documents" && documents.length) {
      const id = addSection("Documents");
      for (const document of documents) {
        const {
          id: previousId,
          taskStableKey,
          name,
          mandatory,
          ...settings
        } = document;
        void previousId;
        void taskStableKey;
        add(id, `DOCUMENT_${document.stableKey}`, {
          label: name,
          type: "DOCUMENT",
          required: mandatory,
          workflowDocument: settings,
        });
      }
    }
    if (kind === "scoring" && scoring?.criteria.length) {
      const id = addSection("Scoring");
      const sources = scoring.criteria.map((criterion) => {
        const fieldKey = add(id, `SCORE_${criterion.stableKey}`, {
          label: criterion.criterion,
          type: "SCORE",
          required: true,
          minimum: criterion.scaleMinimum,
          maximum: criterion.scaleMaximum,
          helpText: criterion.description,
        });
        add(id, `SCORE_COMMENT_${criterion.stableKey}`, {
          label: `${criterion.criterion} — comment`,
          type: "COMMENT",
          required: criterion.mandatoryComment,
          maxLength: 1000,
        });
        return { fieldKey, weight: criterion.weight };
      });
      add(id, "SCORING_TOTAL", {
        label: "Overall assessment",
        type: "SCORING_AGGREGATE",
        required: true,
        scoringAggregate: {
          sources,
          method: scoring.aggregation,
          normalization: "RAW",
          missing: "REQUIRE_ALL",
          precision: 2,
        },
      });
    }
    if (kind === "comments" && comments.length) {
      const id = addSection("Comments & Recommendations");
      for (const field of [...comments].sort(
        (a, b) => a.displayOrder - b.displayOrder,
      )) {
        add(id, `COMMENT_${field.key}`, {
          label: field.label,
          type: "COMMENT",
          required: field.mandatory,
          helpText: field.helpText,
          maxLength: 4000,
        });
      }
    }
  }
  return { fields, sections, sourceKeys };
}
