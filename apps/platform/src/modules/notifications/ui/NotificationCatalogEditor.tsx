"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import {
  notificationCatalogUpdateSchema,
  type NotificationCatalogUpdate,
} from "../api/NotificationAdministrationSchemas";
import { useNotificationCatalog, useUpdateNotificationCatalog } from "./useNotificationAdministration";

export function NotificationCatalogEditor({
  canUpdate,
  catalogKey,
}: {
  canUpdate: boolean;
  catalogKey: string;
}) {
  const query = useNotificationCatalog(catalogKey);
  const mutation = useUpdateNotificationCatalog(catalogKey);
  const form = useForm<NotificationCatalogUpdate>({
    resolver: zodResolver(notificationCatalogUpdateSchema),
  });
  useEffect(() => {
    if (query.data) {
      form.reset({
        description: query.data.description,
        displayName: query.data.displayName,
        expectedUpdatedAt: query.data.updatedAt,
        isEnabled: query.data.isEnabled,
        sortOrder: query.data.sortOrder,
      });
    }
  }, [form, query.data]);
  if (query.isPending) return <p>Loading event catalog…</p>;
  if (query.error || !query.data) return <p className="text-sm text-red-700" role="alert">{query.error?.message ?? "Event catalog not found."}</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
      <FormProvider {...form}>
        <form
          className="space-y-5 rounded-2xl border border-brand-navy/10 bg-white p-6"
          onSubmit={form.handleSubmit((values) => mutation.mutateAsync(values).then(() => undefined))}
        >
          <div>
            <p className="text-xs font-bold uppercase text-brand-navy/50">Immutable catalog key</p>
            <p className="font-mono text-sm text-brand-navy">{catalogKey}</p>
          </div>
          <FormInput disabled={!canUpdate} label="Display name" name="displayName" required />
          <FormTextarea disabled={!canUpdate} label="Description" name="description" required />
          <FormInput disabled={!canUpdate} label="Sort order" name="sortOrder" type="number" required />
          <label className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <Checkbox disabled={!canUpdate} {...form.register("isEnabled")} /> Enabled
          </label>
          {mutation.error ? <p className="text-sm text-red-700" role="alert">{mutation.error.message}</p> : null}
          {canUpdate ? (
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save catalog"}
            </GeneralButton>
          ) : null}
        </form>
      </FormProvider>
      <section className="rounded-2xl border border-brand-navy/10 bg-white p-6">
        <h2 className="font-bold text-brand-navy">Catalog membership</h2>
        <p className="mt-1 text-sm text-brand-navy/60">Event keys and membership are read-only.</p>
        <ul className="mt-4 space-y-3">
          {query.data.events.map((event) => (
            <li className="rounded-xl bg-slate-50 p-3" key={event.eventKey}>
              <p className="font-semibold text-brand-navy">{event.displayName}</p>
              <p className="font-mono text-xs text-brand-navy/60">{event.eventKey}</p>
              <p className="mt-1 text-xs text-brand-navy/65">{event.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
