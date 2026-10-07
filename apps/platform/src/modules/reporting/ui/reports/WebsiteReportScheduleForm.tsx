"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import { FormDateInput } from "@/shared/ui/FormDateInput";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import {
  websiteScheduleUpdateSchema,
  type WebsiteScheduleUpdateInput,
} from "../../api/WebsiteReportSchemas";
import type { WebsiteReportSchedule } from "../../domain/WebsiteReport";
import { useUpdateWebsiteReportSchedule } from "./useWebsiteReports";

export function WebsiteReportScheduleForm({
  schedule,
  canUpdate,
  collectionStart,
  propertyTimezone,
}: {
  schedule: WebsiteReportSchedule;
  canUpdate: boolean;
  collectionStart: string | null;
  propertyTimezone: string | null;
}) {
  const mutation = useUpdateWebsiteReportSchedule(schedule.id);
  const form = useForm<WebsiteScheduleUpdateInput>({
    resolver: zodResolver(websiteScheduleUpdateSchema),
  });
  useEffect(() => {
    form.reset({
      expectedVersion: schedule.version,
      enabled: schedule.enabled,
      anchorDate: schedule.anchorDate ?? "",
      sendTime: schedule.sendTime,
      finalizationDelayHours: schedule.finalizationDelayHours,
    });
  }, [form, schedule]);
  const prefix = `website-schedule-${schedule.id}`;
  const disabled = !canUpdate || !propertyTimezone || mutation.isPending;
  return (
    <FormProvider {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await mutation.mutateAsync(values);
            toast.success("Schedule saved.");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to save schedule.",
            );
          }
        })}
      >
        <fieldset className="grid gap-4 sm:grid-cols-3" disabled={disabled}>
          <legend className="mb-4 font-semibold text-brand-navy">
            Period and delivery time
          </legend>
          <FormDateInput
            label="First period start"
            name="anchorDate"
            minValue={collectionStart ?? undefined}
            disabled={disabled}
          />
          <FormInput
            id={`${prefix}-time`}
            label="Local send time"
            name="sendTime"
            type="time"
            disabled={disabled}
          />
          <FormInput
            id={`${prefix}-delay`}
            label="Source finalization delay (hours)"
            name="finalizationDelayHours"
            type="number"
            min={24}
            max={168}
            registrationOptions={{ valueAsNumber: true }}
            disabled={disabled}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <Checkbox {...form.register("enabled")} /> Enable scheduled reports
          </label>
        </fieldset>
        <p className="text-sm text-brand-navy/65">
          Timezone:{" "}
          {propertyTimezone ?? "Configure the GA property timezone first"}.
          {schedule.frequency === "BIWEEKLY"
            ? " Each period covers 14 days from the first period start."
            : " Periods cover full calendar months; choose the first day of a month."}
        </p>
        <p className="text-sm text-brand-navy/65">
          Next due: {schedule.nextDueAt ?? "Not configured"}. Generation waits
          for completed sources and designated recipients.
        </p>
        {canUpdate ? (
          <GeneralButton type="submit" disabled={disabled}>
            Save
          </GeneralButton>
        ) : null}
      </form>
    </FormProvider>
  );
}
