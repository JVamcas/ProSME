"use client";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { FormInput } from "@/components/ui/form-fields";
import { CheckboxField, HoneypotField } from "@/shared/ui/FormField";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import { GeneralButton } from "@/shared/ui/Button";
import { richTextToPlainText } from "@/shared/utils/RichText";
import {
  applicationAppealSchema,
  appealTextLimit,
  type ApplicationAppealInput,
} from "../../api/ApplicationAppealSchemas";
import { useSubmitApplicationAppeal } from "./useApplicationAppeals";

function AppealRichText({
  name,
  label,
}: {
  name: "grounds" | "details";
  label: string;
}) {
  const value = useWatch<ApplicationAppealInput, "grounds" | "details">({ name });
  const count = richTextToPlainText(value ?? "").length;
  return (
    <div className="sm:col-span-2">
      <FormRichTextField name={name} label={label} required />
      <p
        className={
          count > appealTextLimit
            ? "mt-1 text-sm text-red-600"
            : "mt-1 text-sm text-slate-500"
        }
      >
        {count.toLocaleString()} / 1,000 characters
      </p>
    </div>
  );
}
export function PublicApplicationAppealForm() {
  const form = useForm<ApplicationAppealInput>({
    resolver: zodResolver(applicationAppealSchema),
    mode: "onChange",
    defaultValues: {
      applicationReference: "",
      grounds: "",
      details: "",
      consent: false,
      company: "",
    },
  });
  const mutation = useSubmitApplicationAppeal();
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      form.reset();
    } catch {
      // Keep entered text and show the server response in the status region.
    }
  });
  return (
    <FormProvider {...form}>
      <form
        className="grid gap-5 rounded-2xl border border-brand-blue/25 bg-white p-6 sm:grid-cols-2"
        onSubmit={submit}
        noValidate
      >
        <FormInput
          name="applicationReference"
          label="Application reference"
          required
          containerClassName="sm:col-span-2"
        />
        <HoneypotField />
        <AppealRichText name="grounds" label="Appeal grounds" />
        <AppealRichText name="details" label="Appeal details" />
        <CheckboxField
          name="consent"
          label={
            <>
              I consent to my information being used to respond to this appeal.
              See the{" "}
              <Link href="/privacy" className="underline">
                privacy policy
              </Link>
              .
            </>
          }
        />
        <div className="sm:col-span-2">
          <GeneralButton
            type="submit"
            variant="primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Submitting…" : "Submit appeal"}
          </GeneralButton>
          <p
            role="status"
            className={
              mutation.isError ? "mt-3 text-red-600" : "mt-3 text-green-700"
            }
          >
            {mutation.error?.message ??
              (mutation.data
                ? `Appeal received. Reference ${mutation.data.reference}. An acknowledgement will be sent to the email linked to your application.`
                : "")}
          </p>
        </div>
      </form>
    </FormProvider>
  );
}
