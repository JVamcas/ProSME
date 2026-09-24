"use client";

import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CloneButton,
  EditButton,
  PublishButton,
  RetireButton,
} from "@/components/ui/action-buttons";
import { GeneralButtonLink } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import type { EligibilityRuleSetStatus } from "../domain/EligibilityRuleSet";
import {
  useEligibilityRuleSetBuilder,
  useEligibilityRuleSetLifecycle,
} from "../EligibilityRuleSetHooks";
import { validateEligibilityPublicationPreview } from "./EligibilityPublicationValidation";

export function EligibilityRuleSetHeaderActions({
  canPublish,
  canRetire,
  canUpdate,
  id,
  initialName,
  initialStatus,
  initialVersionNumber,
  versionId,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  id: string;
  initialName: string;
  initialStatus: EligibilityRuleSetStatus;
  initialVersionNumber: number;
  versionId?: string;
}) {
  const query = useEligibilityRuleSetBuilder(id, versionId);
  const lifecycle = useEligibilityRuleSetLifecycle(id);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const editor = query.data;
  const status = editor?.version.status ?? initialStatus;
  const isDraft = status === "DRAFT";
  const publicationReady = editor
    ? validateEligibilityPublicationPreview({
        fields: editor.conditionFields,
        registryIssues: editor.registryIssues,
        rules: editor.rules,
      }).ready
    : false;

  async function runLifecycle(action: "CLONE" | "PUBLISH" | "RETIRE") {
    if (!editor) return;
    try {
      if (action === "CLONE") {
        await lifecycle.mutateAsync({
          action,
          sourceVersionId: editor.version.id,
        });
      } else {
        await lifecycle.mutateAsync({
          action,
          expectedRowVersion: editor.version.rowVersion,
          versionId: editor.version.id,
        });
      }
      if (action === "PUBLISH") setConfirmingPublish(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update the version.",
      );
    }
  }

  return (
    <>
      <StatusBadge status={status} />
      <EditButton
        disabled={!isDraft || !canUpdate}
        onClick={() => document.getElementById("eligibility-rules")
          ?.scrollIntoView({ behavior: "smooth" })}
        title="Edit eligibility rules"
      />
      <CloneButton
        disabled={isDraft || !canUpdate || !editor}
        isLoading={lifecycle.isPending}
        onClick={() => void runLifecycle("CLONE")}
        title="Clone ruleset version"
      />
      <PublishButton
        disabled={!isDraft || !canPublish || !publicationReady}
        isLoading={lifecycle.isPending}
        onClick={() => setConfirmingPublish(true)}
        title="Publish ruleset version"
      />
      {status === "PUBLISHED" ? (
        <RetireButton
          disabled={!canRetire || !editor}
          isLoading={lifecycle.isPending}
          onClick={() => void runLifecycle("RETIRE")}
          title="Retire ruleset version"
        />
      ) : null}
      <GeneralButtonLink
        href={versionId
          ? `/admin/settings/eligibility-rulesets/${id}/test?versionId=${versionId}`
          : `/admin/settings/eligibility-rulesets/${id}/test`}
        size="compact"
        variant="outlineOrange"
      >
        <FlaskConical className="size-4" />
        Test ruleset
      </GeneralButtonLink>
      <ConfirmationDialog
        confirmText="Publish version"
        errorMessage={lifecycle.error?.message}
        isLoading={lifecycle.isPending}
        isOpen={confirmingPublish}
        loadingText="Publishing…"
        message={`Publish ${editor?.definition.name ?? initialName} version ${editor?.version.versionNumber ?? initialVersionNumber}? It will become available for use by its funding call.`}
        onCancel={() => setConfirmingPublish(false)}
        onConfirm={() => void runLifecycle("PUBLISH")}
        title="Publish eligibility ruleset"
      />
    </>
  );
}
