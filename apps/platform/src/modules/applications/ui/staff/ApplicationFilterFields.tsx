import type { AdminApplicationFilterOptions } from "../../ApplicationTypes";
import { useWatch, type Control, type UseFormRegister } from "react-hook-form";
import type { z } from "zod";

import { Input, Label, Select } from "@/shared/ui/FormPrimitives";
import { businessSectors } from "@/modules/businesses/domain/BusinessSectors";
import {
  applicantGenders,
  namibianRegions,
} from "@/modules/profiles/ProfileOptions";
import type { adminApplicationFormSchema } from "../../api/AdminApplicationSchemas";

type FilterInput = z.input<typeof adminApplicationFormSchema>;

const statusOptions = [
  { value: "all", label: "All statuses" },
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
  const [fundingCallId, stage] = useWatch({
    control,
    name: ["fundingCallId", "stage"],
  });
  return (
    <div className="col-span-full grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <Label htmlFor="application-search">Search</Label>
        <Input
          id="application-search"
          placeholder="Reference, applicant, business or funding call"
          {...register("search")}
        />
      </div>
      <div>
        <Label htmlFor="application-funding-call">Funding call</Label>
        <Select
          id="application-funding-call"
          disabled={optionsPending}
          {...register("fundingCallId")}
          value={fundingCallId ?? ""}
        >
          <option value="">All funding calls</option>
          {options?.fundingCalls.map((call) => (
            <option key={call.id} value={call.id}>
              {call.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="application-status">Status</Label>
        <Select id="application-status" {...register("status")}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="application-gender">Gender</Label>
        <Select id="application-gender" {...register("gender")}>
          <option value="">All genders</option>
          {applicantGenders.map((gender) => (
            <option key={gender} value={gender}>
              {gender}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="application-region">Business region</Label>
        <Select id="application-region" {...register("region")}>
          <option value="">All regions</option>
          {namibianRegions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="application-age-min">Minimum age at submission</Label>
        <Input
          id="application-age-min"
          type="number"
          min={0}
          max={150}
          {...register("ageMin")}
        />
      </div>
      <div>
        <Label htmlFor="application-age-max">Maximum age at submission</Label>
        <Input
          id="application-age-max"
          type="number"
          min={0}
          max={150}
          {...register("ageMax")}
        />
      </div>
      <div>
        <Label htmlFor="application-sector">Business sector</Label>
        <Select id="application-sector" {...register("sector")}>
          <option value="">All sectors</option>
          {businessSectors.map((sector) => (
            <option key={sector} value={sector}>
              {sector}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="application-stage">Workflow stage</Label>
        <Select
          id="application-stage"
          disabled={optionsPending}
          {...register("stage")}
          value={stage ?? ""}
        >
          <option value="">All stages</option>
          {options?.stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.label}
            </option>
          ))}
        </Select>
      </div>
      <div
        aria-label="Submission date range"
        className="grid w-full max-w-lg gap-4 sm:col-span-2 sm:grid-cols-2"
        role="group"
      >
        <div>
          <Label htmlFor="application-submitted-from">
            Submission start date
          </Label>
          <Input
            id="application-submitted-from"
            type="date"
            {...register("submittedFrom")}
          />
        </div>
        <div>
          <Label htmlFor="application-submitted-to">Submission end date</Label>
          <Input
            id="application-submitted-to"
            type="date"
            {...register("submittedTo")}
          />
        </div>
      </div>
    </div>
  );
}
