import { renderToStaticMarkup } from "react-dom/server";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { Button, IconButton } from "@/components/ui/button";
import { FormDateInput } from "@/components/ui/form-date-input";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";

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

describe("shared form components", () => {
  it("associates input labels and validation errors", () => {
    const markup = renderToStaticMarkup(
      <FormInput id="email" label="Email address" error="Enter a valid email" />,
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
    const brandButton = renderToStaticMarkup(<Button variant="brand">Submit</Button>);
    const iconButton = renderToStaticMarkup(<IconButton label="Copy">C</IconButton>);

    expect(brandButton).toContain("bg-brand-orange");
    expect(iconButton).toContain('aria-label="Copy"');
  });
});
