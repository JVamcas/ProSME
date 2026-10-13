// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { expect, it } from "vitest";
import { ApplicantProfileFields } from "@/modules/profiles/ui/applicant/ApplicantProfileFields";
import type { ApplicantPersonalProfileInput } from "@/modules/profiles/ProfileSchemas";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const form = useForm<ApplicantPersonalProfileInput>();
  return (
    <FormProvider {...form}>
      <ApplicantProfileFields
        email="synthetic@example.test"
        section="personal"
      />
    </FormProvider>
  );
}
it("marks all six personal fields as required and excludes business position", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Harness />));
    for (const name of [
      "firstName",
      "surname",
      "dateOfBirth",
      "gender",
      "nationality",
      "region",
    ]) {
      const input = container.querySelector<
        HTMLInputElement | HTMLSelectElement
      >(name === "dateOfBirth" ? "#dateOfBirth" : `[name="${name}"]`);
      expect(input, name).not.toBeNull();
      expect(input?.required, name).toBe(true);
    }
    expect(container.querySelector('[name="position"]')).toBeNull();
    expect(container.textContent).not.toContain("optional");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
