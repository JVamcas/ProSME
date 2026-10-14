import type { AdminApplicationFilterOptions } from "../../ApplicationTypes";
import {
  useController,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import type { z } from "zod";

import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { businessSectors } from "@/modules/businesses/domain/BusinessSectors";
import {
  applicantGenders,
  namibianRegions,
  selectItems,
} from "@/modules/profiles/ProfileOptions";
import type { adminApplicationFormSchema } from "../../api/AdminApplicationSchemas";
import { FormDateInput } from "@/shared/ui/FormDateInput";

type FilterInput = z.input<typeof adminApplicationFormSchema>;

const statusOptions = [
  { value: "submitted", label: "Submitted" },
  { value: "under-review", label: "Under review" },
  { value: "action-required", label: "Action required" },
  { value: "outcome-available", label: "Outcome available" },
  { value: "closed", label: "Closed" },
  { value: "pending-decision", label: "Pending decision" },
];

export function ApplicationFilterFields({
  register,
  control,
  options,
  optionsPending = false,
}: {
  options?: AdminApplicationFilterOptions;
  optionsPending?: boolean;
  register: UseFormRegister<FilterInput>;
  control: Control<
    FilterInput,
    unknown,
    z.output<typeof adminApplicationFormSchema>
  >;
}) {
  return (
    <div className="col-span-full grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FormInput
        id="application-search"
        label="Search"
        {...register("search")}
        placeholder="Reference, applicant, business or funding call"
      />
      <ApplicationMultiSelect
        id="application-funding-call"
        label="Funding call"
        name="fundingCallId"
        control={control}
        items={(options?.fundingCalls ?? []).map((call) => ({
          value: call.id,
          label: call.label,
        }))}
        placeholder="All funding calls"
        disabled={optionsPending}
      />
      <ApplicationMultiSelect
        id="application-status"
        label="Status"
        name="status"
        control={control}
        placeholder="All statuses"
        items={statusOptions}
      />
      <ApplicationMultiSelect
        id="application-gender"
        label="Gender"
        name="gender"
        control={control}
        items={selectItems(applicantGenders)}
        placeholder="All genders"
      />
      <ApplicationMultiSelect
        id="application-region"
        label="Business region"
        name="region"
        control={control}
        items={selectItems(namibianRegions)}
        placeholder="All regions"
      />
      <FormInput
        id="application-age-min"
        label="Minimum age at submission"
        {...register("ageMin")}
        type="number"
        min={0}
        max={150}
      />
      <FormInput
        id="application-age-max"
        label="Maximum age at submission"
        {...register("ageMax")}
        type="number"
        min={0}
        max={150}
      />
      <ApplicationMultiSelect
        id="application-sector"
        label="Business sector"
        name="sector"
        control={control}
        items={selectItems(businessSectors)}
        placeholder="All sectors"
      />
      <ApplicationMultiSelect
        id="application-stage"
        label="Workflow stage"
        name="stage"
        control={control}
        items={(options?.stages ?? []).map((stage) => ({
          value: stage.id,
          label: stage.label,
        }))}
        placeholder="All stages"
        disabled={optionsPending}
      />
      <div
        aria-label="Submission date range"
        className="grid w-full max-w-lg gap-4 sm:col-span-2 sm:grid-cols-2"
        role="group"
      >
        <FormDateInput
          label="Submission start date"
          {...register("submittedFrom")}
        />
        <FormDateInput
          label="Submission end date"
          {...register("submittedTo")}
        />
      </div>
    </div>
  );
}

function ApplicationMultiSelect({
  control,
  name,
  ...props
}: {
  control: Control<
    FilterInput,
    unknown,
    z.output<typeof adminApplicationFormSchema>
  >;
  name: "fundingCallId" | "status" | "gender" | "region" | "sector" | "stage";
  id: string;
  label: string;
  items: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  const { field, fieldState } = useController({ control, name });
  const values = Array.isArray(field.value)
    ? field.value
    : field.value
      ? [field.value]
      : [];
  return (
    <FormSelect
      {...props}
      name={name}
      multiple
      value={values.filter((value) => value !== "all")}
      onMultipleChange={field.onChange}
      onMultipleBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}
