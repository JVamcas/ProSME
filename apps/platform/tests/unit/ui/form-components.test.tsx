import { renderToStaticMarkup } from "react-dom/server";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { GeneralButton, IconButton } from "@/components/ui/button";
import { FormDateInput } from "@/components/ui/form-date-input";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { MoneyField } from "@/components/ui/money-field";
import { FormRadioGroup } from "@/shared/ui/FormRadioGroup";

function RegisteredInput() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: "" },
    errors: {
      email: {
        message: "Email is already registered",
        type: "server",
      },
    },
  });

  return (
    <FormProvider {...form}>
      <FormInput label="Email address" name="email" />
    </FormProvider>
  );
}

function RegisteredMoneyInput() {
  const form = useForm<{ amount: number }>({
    defaultValues: { amount: 1_234_567.89 },
  });
  return (
    <FormProvider {...form}>
      <MoneyField label="Amount" name="amount" />
    </FormProvider>
  );
}

describe("shared form components", () => {
  it("associates input labels and validation errors", () => {
    const markup = renderToStaticMarkup(
      <FormInput
        id="email"
        label="Email address"
        error="Enter a valid email"
      />,
    );

    expect(markup).toContain('for="email"');
    expect(markup).toContain('aria-describedby="email-error"');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('id="email-error"');
  });

  it("resolves registration and errors from form context", () => {
    const markup = renderToStaticMarkup(<RegisteredInput />);

    expect(markup).toContain('name="email"');
    expect(markup).toContain("Email is already registered");
    expect(markup).toContain('aria-invalid="true"');
  });

  it("renders leading content inside a padded input control", () => {
    const markup = renderToStaticMarkup(
      <FormInput
        label="Search"
        leadingContent={<span aria-hidden="true">Icon</span>}
        name="search"
        type="search"
      />,
    );

    expect(markup).toContain("Icon");
    expect(markup).toContain("pl-12");
    expect(markup).toContain('type="search"');
  });

  it("renders the shared money field with currency and decimal semantics", () => {
    const markup = renderToStaticMarkup(
      <MoneyField label="Amount" name="amount" />,
    );

    expect(markup).toContain("N$");
    expect(markup).toContain('inputMode="decimal"');
    expect(markup).toContain('type="text"');
  });

  it("formats registered money values with thousands separators", () => {
    const markup = renderToStaticMarkup(<RegisteredMoneyInput />);

    expect(markup).toContain('value="1,234,567.89"');
  });

  it("keeps checkbox semantics inside the shared field", () => {
    const markup = renderToStaticMarkup(
      <CheckboxField name="consent" label="I consent" required />,
    );

    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('name="consent"');
    expect(markup).toContain("I consent");
  });

  it("renders select items from data instead of JSX children", () => {
    const markup = renderToStaticMarkup(
      <FormSelect
        label="Region"
        name="region"
        placeholder="Select region"
        items={[
          { label: "Khomas", value: "Khomas" },
          { label: "Oshana", value: "Oshana" },
        ]}
      />,
    );

    expect(markup).toContain("Select region");
    expect(markup).toContain("Khomas");
    expect(markup).toContain("Oshana");
  });

  it("renders a shared controlled radio group", () => {
    const markup = renderToStaticMarkup(
      <FormRadioGroup
        helpText="Choose one answer."
        id="approval"
        label="Approved"
        name="approval"
        onValueChange={() => undefined}
        options={[
          { label: "Yes", value: true },
          { label: "No", value: false },
        ]}
        required
        value={false}
      />,
    );

    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain("Approved");
    expect(markup).toContain("Choose one answer.");
    expect(markup).toContain('checked=""');
  });

  it("renders an ISO-backed React Aria date field", () => {
    const markup = renderToStaticMarkup(
      <FormDateInput
        label="Opening date"
        name="openingDate"
        value="2026-09-12"
      />,
    );

    expect(markup).toContain("Opening date");
    expect(markup).toContain('name="openingDate"');
    expect(markup).toContain('value="2026-09-12"');
  });
});

describe("shared buttons", () => {
  it("applies variants and accessible icon labels", () => {
    const defaultButton = renderToStaticMarkup(<GeneralButton>Continue</GeneralButton>);
    const brandButton = renderToStaticMarkup(
      <GeneralButton variant="primary">Submit</GeneralButton>,
    );
    const iconButton = renderToStaticMarkup(
      <IconButton label="Copy">C</IconButton>,
    );

    expect(defaultButton).toContain("bg-brand-orange");
    expect(brandButton).toContain("bg-brand-orange");
    expect(iconButton).toContain('aria-label="Copy"');
  });
});
