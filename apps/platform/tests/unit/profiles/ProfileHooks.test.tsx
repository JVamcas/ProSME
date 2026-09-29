// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useUpdateApplicantProfile } from "@/modules/profiles/ProfileHooks";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateApplicantProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/modules/profiles/ClientProfileService", () => ({
  clientProfileService: {
    updateApplicantProfile: mocks.updateApplicantProfile,
  },
}));

const profile = {
  dateOfBirth: "",
  email: "maria@example.test",
  firstName: "Maria",
  nationality: "Namibian",
  phoneNumber: "+264810000000",
  position: "Director",
  postalAddress: "",
  region: "Zambezi",
  surname: "Amutenya",
  updatedAt: "2026-09-29T08:00:00.000Z",
};

function Harness({ section }: { section: "contact" | "personal" }) {
  const mutation = useUpdateApplicantProfile();
  const input = section === "personal"
    ? {
        section,
        data: {
          dateOfBirth: profile.dateOfBirth,
          firstName: profile.firstName,
          nationality: profile.nationality,
          position: profile.position,
          region: profile.region,
          surname: profile.surname,
        },
      } as const
    : {
        section,
        data: {
          phoneNumber: profile.phoneNumber,
          postalAddress: profile.postalAddress,
        },
      } as const;

  return (
    <button onClick={() => mutation.mutate(input)} type="button">
      Save
    </button>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mocks.refresh.mockReset();
  mocks.updateApplicantProfile.mockReset().mockResolvedValue(profile);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function save(section: "contact" | "personal") {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Harness section={section} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    container.querySelector("button")?.click();
    await Promise.resolve();
  });
}

describe("applicant profile updates", () => {
  it("refreshes the portal shell after a personal-name update", async () => {
    await save("personal");

    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh the portal shell for contact-only changes", async () => {
    await save("contact");

    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
