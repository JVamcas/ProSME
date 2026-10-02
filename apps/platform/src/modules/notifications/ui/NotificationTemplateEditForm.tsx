"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import {
  notificationTemplateEditSchema,
  type NotificationTemplateEdit,
  type NotificationTemplateVersionSummary,
} from "../api/NotificationTemplateSchemas";
import { useEditNotificationTemplate } from "./useEditNotificationTemplate";

export function NotificationTemplateEditForm({
  channelCode,
  targetId,
  version,
  onSaved,
}: {
  channelCode: string;
  targetId: string;
  version: NotificationTemplateVersionSummary;
  onSaved: () => void;
}) {
  const mutation = useEditNotificationTemplate(channelCode, targetId);
  const form = useForm<NotificationTemplateEdit>({
    defaultValues: { subjectTemplate: version.subjectTemplate },
    resolver: zodResolver(notificationTemplateEditSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    try {
      const saved = await mutation.mutateAsync({ versionId: version.id, input });
      toast.success(`Draft version ${saved.versionNumber} saved. Publish it to use the updated subject.`);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save template.");
    }
  });

  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-brand-navy/65">
          Save a new draft with an updated email subject and the existing email body.
          Publish the draft to apply your changes.
        </p>
        <FormInput label="Email subject" name="subjectTemplate" required />
        <GeneralButton disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Saving…" : "Save draft"}
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
