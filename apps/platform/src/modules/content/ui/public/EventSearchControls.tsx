"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/shared/ui/Button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import {
  eventSearchFormSchema,
  type EventSearchForm,
} from "../../api/EventContentSchemas";
import { eventTypeOptions } from "../../domain/EventMetadata";

export function EventSearchControls({
  eventType,
  search,
}: {
  eventType?: string;
  search: string;
}) {
  const router = useRouter();
  const formElement = useRef<HTMLFormElement>(null);
  const form = useForm<EventSearchForm>({
    defaultValues: { eventType: eventType ?? "", search },
    resolver: zodResolver(eventSearchFormSchema),
  });
  const submit = form.handleSubmit((values) => {
    const parameters = new URLSearchParams();
    if (values.search) parameters.set("search", values.search);
    if (values.eventType) parameters.set("eventType", values.eventType);
    const suffix = parameters.toString();
    router.push(suffix ? `/events?${suffix}` : "/events");
  });

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 sm:grid-cols-[minmax(240px,1fr)_200px]"
        onSubmit={submit}
        ref={formElement}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-brand-navy/60"
            aria-hidden="true"
          />
          <FormInput
            className="rounded-lg pl-12"
            label={<span className="sr-only">Search events</span>}
            name="search"
            placeholder="Search events…"
          />
        </div>
        <FormSelect
          className="rounded-lg"
          items={[{ label: "All event types", value: "" }, ...eventTypeOptions]}
          label={<span className="sr-only">Event type</span>}
          name="eventType"
          onChange={(event) => {
            form.setValue("eventType", event.target.value);
            formElement.current?.requestSubmit();
          }}
        />
        <GeneralButton className="sr-only" type="submit">
          Apply event filters
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
