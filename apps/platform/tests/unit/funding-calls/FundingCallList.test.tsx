import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { FundingCallList } from "@/modules/funding-calls/ui/FundingCallList";

const query = vi.hoisted(() => ({
  data: {
    items: [
      {
        id: "call",
        title: "Growth Fund",
        status: "LIVE",
        opensAt: "2026-09-16T00:00:00.000Z",
        closesAt: "2026-10-23T00:00:00.000Z",
        publicInteractionEnabled: undefined as boolean | undefined,
      },
    ],
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  },
  isPending: false,
  isFetching: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/modules/funding-calls/FundingCallHooks", () => ({
  useFundingCalls: () => query,
  useCloneFundingCall: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteFundingCall: () => ({ mutate: vi.fn(), isPending: false }),
  useFundingCallPublicInteraction: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/modules/funding-calls/ui/FundingCallListActions", () => ({
  FundingCallListActions: () => null,
}));

describe("funding call list status", () => {
  it.each([
    { enabled: true, label: "enabled" },
    { enabled: false, label: "disabled" },
    { enabled: undefined, label: "enabled" },
  ])("shows lifecycle and public interaction $label for $enabled", ({
    enabled,
    label,
  }) => {
    query.data.items[0].publicInteractionEnabled = enabled;

    const markup = renderToStaticMarkup(
      <FundingCallList canCreate={false} canDelete={false} />,
    );
    const statusCell = markup
      .split("</td>")
      .find((cell) => cell.includes("Public interaction"));

    expect(statusCell).toContain(">Live<");
    expect(statusCell).toContain(`Public interaction ${label}`);
    expect(statusCell).not.toContain(
      `Public interaction ${label === "enabled" ? "disabled" : "enabled"}`,
    );
  });
});
