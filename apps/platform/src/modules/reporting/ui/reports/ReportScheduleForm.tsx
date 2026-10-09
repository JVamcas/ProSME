"use client";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormInput } from "@/components/ui/form-fields";
import { FormDateInput } from "@/shared/ui/FormDateInput";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import { GeneralButton } from "@/components/ui/button";
import { toast } from "@/shared/ui/Toast";
import {
  reportScheduleInputSchema,
  type ReportSchedule,
  type ReportScheduleInput,
} from "../../domain/ReportSchedule";
import { useSaveReportSchedule } from "./useReportAutomation";

export function ReportScheduleForm({
  reportId,
  timezone,
  schedule,
  onSaved,
}: {
  reportId: string;
  timezone: string;
  schedule?: ReportSchedule;
  onSaved: () => void;
}) {
  const save = useSaveReportSchedule(reportId);
  const form = useForm<ReportScheduleInput>({
    resolver: zodResolver(reportScheduleInputSchema),
    defaultValues: schedule
      ? {
          frequencyDays: schedule.frequencyDays,
          timezone: schedule.timezone,
          anchor: schedule.anchor,
          sendTime: schedule.sendTime,
          enabled: schedule.enabled,
          rowVersion: schedule.rowVersion,
        }
      : {
          frequencyDays: 14,
          timezone,
          anchor: "",
          sendTime: "09:00",
          enabled: false,
        },
  });
  return (
    <FormProvider {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(
          (input) => {
            void save
              .mutateAsync({ input, scheduleId: schedule?.id })
              .then(onSaved)
              .catch(() => undefined);
          },
          () => toast.error("Check the highlighted schedule fields."),
        )}
      >
        <fieldset
          disabled={Boolean(schedule) || save.isPending}
          className="space-y-4"
        >
          <FormDateInput name="anchor" label="Anchor date" required />
          <FormInput
            name="frequencyDays"
            label="Frequency (days)"
            type="number"
            min={1}
            max={366}
            required
            registrationOptions={{ valueAsNumber: true }}
          />
          <p className="text-sm text-slate-600">
            Counting starts from the anchor date. The first report is due after
            this many days, then repeats at the same interval.
          </p>
          <FormInput name="timezone" label="Timezone" required />
          <FormInput
            name="sendTime"
            label="Generation time"
            type="time"
            required
          />
        </fieldset>
        {schedule ? (
          <p className="text-sm text-slate-600">
            Create a new schedule to change period settings. This schedule keeps
            its cursor and pending run.
          </p>
        ) : null}
        <label className="flex items-center gap-3">
          <Checkbox {...form.register("enabled")} disabled={save.isPending} />
          Enabled
        </label>
        <div className="flex justify-end gap-3">
          <GeneralButton
            type="button"
            variant="outline"
            onClick={onSaved}
            disabled={save.isPending}
          >
            Cancel
          </GeneralButton>
          <GeneralButton type="submit" disabled={save.isPending}>
            Save schedule
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
