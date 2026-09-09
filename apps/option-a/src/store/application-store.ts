"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApplicationValues } from "@/data/application-schema";

type ApplicationState = {
  application: Partial<ApplicationValues>;
  documents: Record<string, string>;
  reference: string | null;
  submittedAt: string | null;
  saveApplication: (values: Partial<ApplicationValues>) => void;
  saveDocument: (key: string, fileName: string) => void;
  submitApplication: (values: ApplicationValues) => void;
  resetApplication: () => void;
};

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set) => ({
      application: {},
      documents: {},
      reference: null,
      submittedAt: null,
      saveApplication: (values) => set((state) => ({ application: { ...state.application, ...values } })),
      saveDocument: (key, fileName) => set((state) => ({ documents: { ...state.documents, [key]: fileName } })),
      submitApplication: (values) => set({ application: values, reference: "SMEF-2026-00017", submittedAt: new Date().toISOString() }),
      resetApplication: () => set({ application: {}, documents: {}, reference: null, submittedAt: null }),
    }),
    { name: "sme-fund-demo-application", skipHydration: true },
  ),
);
