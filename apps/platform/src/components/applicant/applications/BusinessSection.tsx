import { FormInput, FormSelect } from "@/components/ui/form-fields";
import {
  annualTurnoverItems,
  exportReadinessItems,
  regionItems,
  sectorItems,
  yearsOperatingItems,
} from "@/data/application-form";

export function BusinessSection() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormInput
        label="Registered business name"
        name="businessName"
      />
      <FormInput
        label="Registration number"
        name="registrationNumber"
      />
      <FormInput
        label="Your position"
        name="position"
        placeholder="e.g. Managing member"
      />
      <FormSelect
        label="Years in operation"
        name="yearsOperating"
        items={yearsOperatingItems}
        placeholder="Select"
      />
      <FormSelect
        label="Annual turnover"
        name="annualTurnover"
        items={annualTurnoverItems}
        placeholder="Select range"
      />
      <FormInput
        label="Current employees"
        name="employees"
        type="number"
        min="0"
        registrationOptions={{ valueAsNumber: true }}
      />
      <FormSelect
        label="Primary sector"
        name="sector"
        items={sectorItems}
        placeholder="Select sector"
      />
      <FormSelect
        label="Region of operation"
        name="region"
        items={regionItems}
        placeholder="Select region"
      />
      <FormSelect
        containerClassName="sm:col-span-2"
        label="Export or market expansion readiness"
        name="exportReady"
        items={exportReadinessItems}
        placeholder="Select"
      />
    </div>
  );
}
