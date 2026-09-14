"use client";

import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import {
  defaultTaskConfiguration,
  formatTaskConfiguration,
} from "@/modules/workflows/WorkflowTaskConfiguration";
import {
  taskTypeCodes,
  type WorkflowEditorView,
  type WorkflowStageInput,
  type WorkflowTaskInput,
} from "@/modules/workflows/WorkflowTypes";
import {
  parseTaskConfiguration,
  taskAssignmentDefaults,
  type WorkflowTaskFormValues,
  workflowTaskFormSchema,
} from "./WorkflowTaskFormSchema";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { CheckboxField } from "@/components/ui/form-field";
import { GeneralButton } from "@/components/ui/button";

type Props = {
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
  task?: WorkflowTaskInput;
};

export function WorkflowTaskDialog({
  editor,
  isOpen,
  onClose,
  stage,
  task,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const initialType = task?.type ?? "CHECKLIST";
  const form = useForm<WorkflowTaskFormValues>({
    defaultValues: {
      ...taskAssignmentDefaults(task),
      code: task?.code ?? "",
      configJson: formatTaskConfiguration(
        task?.config ?? defaultTaskConfiguration(initialType),
      ),
      name: task?.name ?? "",
      required: task?.required ?? true,
      type: initialType,
    },
    resolver: zodResolver(workflowTaskFormSchema),
  });
  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
  });
  const taskType = useWatch({ control: form.control, name: "type" });
  const previousAssignmentMode = useRef(assignmentMode);
  const previousType = useRef(taskType);

  useEffect(() => {
    if (previousAssignmentMode.current === assignmentMode) return;
    previousAssignmentMode.current = assignmentMode;
    form.setValue("assignmentTarget", "", { shouldValidate: true });
  }, [assignmentMode, form]);

  useEffect(() => {
    if (previousType.current === taskType) return;
    previousType.current = taskType;
    form.setValue(
      "configJson",
      formatTaskConfiguration(defaultTaskConfiguration(taskType)),
      { shouldValidate: true },
    );
  }, [form, taskType]);

  const submit = form.handleSubmit(async (values) => {
    const duplicate = stage.tasks.some(
      (item) => item.code === values.code && item.code !== task?.code,
    );
    if (duplicate) {
      form.setError("code", {
        message: "Task code must be unique in this stage.",
      });
      return;
    }
    const nextTask: WorkflowTaskInput = {
      ...(task?.id ? { id: task.id } : {}),
      assignmentRoleId:
        values.assignmentMode === "ROLE" ? values.assignmentTarget : null,
      assignmentUserId:
        values.assignmentMode === "USER" ? values.assignmentTarget : null,
      code: values.code,
      config: parseTaskConfiguration(values.configJson),
      name: values.name,
      required: values.required,
      sequence: task?.sequence ?? stage.tasks.length + 1,
      type: values.type,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.code === stage.code
          ? {
              ...item,
              tasks: task
                ? item.tasks.map((current) =>
                    current.code === task.code ? nextTask : current,
                  )
                : [...item.tasks, nextTask],
            }
          : item,
      ),
      transitions: task
        ? editor.graph.transitions.map((transition) => ({
            ...transition,
            condition:
              transition.condition?.type === "TASK_RESULT_EQUALS" &&
              transition.fromStageCode === stage.code &&
              transition.condition.taskCode === task.code
                ? { ...transition.condition, taskCode: values.code }
                : transition.condition,
          }))
        : editor.graph.transitions,
    });
    onClose();
  });

  const options = editor.assignmentOptions ?? { roles: [], users: [] };
  const assignmentItems = (
    assignmentMode === "ROLE" ? options.roles : options.users
  ).map((item) => ({ label: item.label, value: item.id }));

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={task ? "Edit workflow task" : "Add workflow task"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 grid-cols-1" onSubmit={submit}>
          <div className="grid gap-4 grid-cols-2">
            <FormInput
              label="Task code"
              name="code"
              placeholder="DOCUMENT_CHECK"
            />
            <FormInput
              label="Task name"
              name="name"
              placeholder="Review documents"
            />
          </div>

          <FormSelect
            items={taskTypeCodes.map((type) => ({
              label: type.replaceAll("_", " "),
              value: type,
            }))}
            label="Task type"
            name="type"
          />
          <div className="grid gap-4 grid-cols-2">
            <FormSelect
              items={[
                { label: "Configured role", value: "ROLE" },
                { label: "Specific user", value: "USER" },
              ]}
              label="Assignment source"
              name="assignmentMode"
            />
            <FormSelect
              items={assignmentItems}
              label={
                assignmentMode === "ROLE" ? "Assigned role" : "Assigned user"
              }
              name="assignmentTarget"
              placeholder={`Select ${assignmentMode === "ROLE" ? "a role" : "a user"}`}
            />
          </div>
          <CheckboxField
            containerClassName="mt-8 text-sm font-semibold text-brand-navy"
            label="Required before the stage can complete"
            name="required"
          />
          {mutation.error ? (
            <p className="md:col-span-2 text-sm text-red-700" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end md:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : task ? "Save task" : "Add task"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
