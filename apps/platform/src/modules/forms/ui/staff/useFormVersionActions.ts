"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCloneForm,
  useFormEditor,
  useFormLifecycle,
} from "@/modules/forms/FormHooks";
import type { FormVersionSummary } from "@/modules/forms/FormTypes";
import type { FormVersionPendingAction } from "./FormVersionActions";

export function useFormVersionActions() {
  const router = useRouter();
  const [previewing, setPreviewing] = useState<FormVersionSummary>();
  const preview = useFormEditor(
    previewing?.formDefinitionId ?? "",
    previewing?.id,
  );
  const clone = useCloneForm();
  const publish = useFormLifecycle("publish");
  const retire = useFormLifecycle("retire");

  let pendingAction: FormVersionPendingAction | undefined;
  if (preview.isPending && previewing) {
    pendingAction = { action: "preview", versionId: previewing.id };
  } else if (publish.isPending && publish.variables) {
    pendingAction = {
      action: "publish",
      versionId: publish.variables.versionId,
    };
  } else if (retire.isPending && retire.variables) {
    pendingAction = { action: "retire", versionId: retire.variables.versionId };
  } else if (clone.isPending && clone.variables) {
    pendingAction = {
      action: "clone",
      versionId: clone.variables.sourceVersionId,
    };
  }

  function resetActions() {
    setPreviewing(undefined);
    clone.reset();
    publish.reset();
    retire.reset();
  }

  function runLifecycle(action: typeof publish, version: FormVersionSummary) {
    resetActions();
    action.mutate({
      definitionId: version.formDefinitionId,
      expectedRowVersion: version.rowVersion,
      versionId: version.id,
    });
  }

  return {
    pendingAction,
    errorMessage:
      preview.error?.message ??
      publish.error?.message ??
      retire.error?.message ??
      clone.error?.message,
    preview: previewing ? preview.data : undefined,
    closePreview: () => setPreviewing(undefined),
    onPreview: (version: FormVersionSummary) => {
      resetActions();
      setPreviewing(version);
    },
    onPublish: (version: FormVersionSummary) => runLifecycle(publish, version),
    onRetire: (version: FormVersionSummary) => runLifecycle(retire, version),
    onClone: (version: FormVersionSummary) => {
      resetActions();
      clone.mutate(
        { definitionId: version.formDefinitionId, sourceVersionId: version.id },
        {
          onSuccess: (view) => {
            router.push(
              `/admin/settings/forms/${view.definition.id}?versionId=${view.version.id}`,
            );
          },
        },
      );
    },
  };
}
