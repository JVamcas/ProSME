// @vitest-environment happy-dom
import { zodResolver } from "@hookform/resolvers/zod";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FormProvider, useForm } from "react-hook-form";
import { afterEach, describe, expect, it } from "vitest";
import {
  businessProfileSchema,
  type BusinessProfileInput,
} from "@/modules/businesses/BusinessSchemas";
import { BusinessSectorFields } from "@/modules/businesses/ui/BusinessSectorFields";
import { businessSectors } from "@/modules/businesses/domain/BusinessSectors";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
function Fields() {
  const form = useForm<BusinessProfileInput>({
    defaultValues: {
      sector: "",
      secondarySector: "",
      sectorOther: "",
      secondarySectorOther: "",
    },
    resolver: zodResolver(businessProfileSchema),
  });
  return (
    <FormProvider {...form}>
      <BusinessSectorFields />
    </FormProvider>
  );
}
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
});
describe("business sector selections", () => {
  it("offers both dropdowns, makes secondary optional, and reveals each Other field only when selected", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<Fields />));
    const primary = container.querySelector<HTMLSelectElement>(
      'select[name="sector"]',
    )!;
    const secondary = container.querySelector<HTMLSelectElement>(
      'select[name="secondarySector"]',
    )!;
    expect(primary.required).toBe(true);
    expect(secondary.required).toBe(false);
    expect(
      [...primary.options].slice(1).map((item) => item.textContent),
    ).toEqual([...businessSectors, "Other (please specify)"]);
    expect(container.querySelector('input[name="sectorOther"]')).toBeNull();
    expect(
      container.querySelector('input[name="secondarySectorOther"]'),
    ).toBeNull();
    await act(async () => {
      primary.value = "OTHER";
      primary.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      container.querySelector<HTMLInputElement>('input[name="sectorOther"]')
        ?.required,
    ).toBe(true);
    expect(
      container.querySelector('input[name="secondarySectorOther"]'),
    ).toBeNull();
    await act(async () => {
      secondary.value = "OTHER";
      secondary.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(
      container.querySelector<HTMLInputElement>(
        'input[name="secondarySectorOther"]',
      )?.required,
    ).toBe(true);
    await act(async () => {
      secondary.value = "";
      secondary.dispatchEvent(new Event("change", { bubbles: true }));
      primary.value = "Blue economy";
      primary.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector('input[name="sectorOther"]')).toBeNull();
    expect(
      container.querySelector('input[name="secondarySectorOther"]'),
    ).toBeNull();
  });
});
