"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { GeneralButton } from "@/shared/ui/Button";
import { eventRecordingSearchSchema } from "../../api/EventRecordingSchemas";

export function EventRecordingSearch({
  search,
  category,
  categories,
}: {
  search: string;
  category: string;
  categories: string[];
}) {
  const router = useRouter();
  const element = useRef<HTMLFormElement>(null);
  const form = useForm({
    resolver: zodResolver(eventRecordingSearchSchema),
    defaultValues: { search, category },
  });
  const submit = form.handleSubmit((values) => {
    const parameters = new URLSearchParams(window.location.search);
    parameters.delete("recordingPage");
    parameters.delete("recordingSearch");
    parameters.delete("category");
    if (values.search) parameters.set("recordingSearch", values.search);
    if (values.category) parameters.set("category", values.category);
    router.push(`/events?${parameters}#recordings`);
  });
  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_200px]"
        onSubmit={submit}
        ref={element}
      >
        <FormInput
          name="search"
          label={<span className="sr-only">Search recordings</span>}
          placeholder="Search recordings…"
        />
        <FormSelect
          name="category"
          label={<span className="sr-only">Recording category</span>}
          items={[
            { label: "All categories", value: "" },
            ...categories.map((value) => ({ label: value, value })),
          ]}
          onChange={(event) => {
            form.setValue("category", event.target.value);
            element.current?.requestSubmit();
          }}
        />
        <GeneralButton type="submit" className="sr-only">
          Search recordings
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
