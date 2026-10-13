// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BusinessForm } from "@/modules/businesses/ui/BusinessForm";

const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/modules/businesses/BusinessHooks", () => ({
  useBusiness: () => ({ data: undefined }),
  useCreateBusiness: () => ({ mutateAsync: mocks.save }),
  useUpdateBusiness: () => ({ mutateAsync: mocks.save }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
const values = {
  applicantPosition: "Director",
  members: [
    {
      fullName: "Synthetic Person",
      idNumber: "TEST-123",
      role: "Principal" as const,
    },
  ],
  businessType: "Company",
  employeeCount: "1",
  establishedYear: "2020",
  legalName: "Synthetic Company",
  physicalAddress: "Test address",
  region: "Khomas",
  registrationNumber: "TEST-REG",
  sector: "Blue economy",
  tradingName: "Synthetic",
};
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function click(text: string) {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === text,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
it("validates details before entering members", async () => {
  await act(async () => root.render(<BusinessForm />));
  await click("Next");
  expect(
    container.querySelector('input[name="applicantPosition"]'),
  ).not.toBeNull();
  expect(container.querySelector("table")).toBeNull();
  expect(mocks.save).not.toHaveBeenCalled();
});
it("keeps both steps' values and saves complete member rows", async () => {
  await act(async () => root.render(<BusinessForm initialValues={values} />));
  await click("Next");
  expect(container.querySelector("table")).not.toBeNull();
  expect(
    container.querySelector<HTMLInputElement>(
      'input[name="members.0.idNumber"]',
    )?.value,
  ).toBe("TEST-123");
  await click("Back");
  expect(
    container.querySelector<HTMLInputElement>('input[name="applicantPosition"]')
      ?.value,
  ).toBe("Director");
  await click("Next");
  await click("Add business");
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining(values));
});
it("rejects an empty members table and incomplete added rows", async () => {
  await act(async () => root.render(<BusinessForm initialValues={values} />));
  await click("Next");
  await click("Remove");
  await click("Add business");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(container.textContent).toContain(
    "Add at least one principal or founding member.",
  );
  await click("Add member");
  await click("Add business");
  expect(mocks.save).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Full name is required");
  expect(container.textContent).toContain("ID number is required");
});
