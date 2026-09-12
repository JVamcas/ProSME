"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  applicationDocuments,
  applicationStepFields,
} from "@/data/application-form";
import {
  applicationSchema,
  demoApplication,
  type ApplicationValues,
} from "@/data/application-schema";
import { useApplicationStore } from "@/store/application-store";
import { applicationStepCount } from "./application-progress";

function formDefaults(values: Partial<ApplicationValues>) {
  return {
    ...values,
    declaration: values.declaration ?? false,
    consent: values.consent ?? false,
  };
}

export function useApplicationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const store = useApplicationStore();
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: formDefaults(store.application),
    mode: "onTouched",
  });

  useEffect(() => {
    void useApplicationStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    form.reset(formDefaults(store.application));
  }, [form, store.application]);

  async function next() {
    if (!(await form.trigger(applicationStepFields[step]))) {
      toast.error("Please complete the highlighted fields");
      return;
    }

    store.saveApplication(form.getValues());
    setStep((value) => Math.min(value + 1, applicationStepCount - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fillDemo() {
    form.reset(demoApplication);
    store.saveApplication(demoApplication);
    applicationDocuments.forEach(([key, label]) => {
      const fileName = `${label.replaceAll(" ", "-").toLowerCase()}.pdf`;
      store.saveDocument(key, fileName);
    });
    toast.success("Demo application filled");
  }

  function submit(values: ApplicationValues) {
    store.submitApplication(values);
    toast.success("Application submitted");
    router.push("/portal/applications/new/confirmation");
  }

  return { fillDemo, form, next, setStep, step, store, submit };
}
