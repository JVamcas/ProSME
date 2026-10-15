import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/ui/RightDrawer", () => ({
  RightDrawer: ({
    children,
    title,
    headerActions,
  }: {
    children: ReactNode;
    title: string;
    headerActions: ReactNode;
  }) => (
    <aside>
      <h2>{title}</h2>
      {headerActions}
      {children}
    </aside>
  ),
}));
vi.mock("@/modules/applications/ui/appeals/useApplicationAppeals", () => ({
  useApplicationAppeal: vi.fn(),
}));
vi.mock("@/shared/ui/portal/capability-context", () => ({
  useCapabilities: vi.fn(),
}));
vi.mock("@/modules/applications/ui/appeals/ApplicationAppealManagement", () => ({
  AppealAssignmentForm: () => <form aria-label="Assign appeal" />,
  AppealResolutionForm: () => <form aria-label="Resolve appeal" />,
}));

import { ApplicationAppealDetail } from "@/modules/applications/ui/appeals/ApplicationAppealDetail";
import { useApplicationAppeal } from "@/modules/applications/ui/appeals/useApplicationAppeals";
import { useCapabilities } from "@/shared/ui/portal/capability-context";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ApplicationAppeal } from "@/modules/applications/domain/ApplicationAppeal";

const appeal: ApplicationAppeal = {
  id: "appeal-id",
  reference: "APL-000001",
  applicationId: "application-id",
  applicationReference: "FIRST-CALL-FOR-APPLICATIONS-2026-000001",
  name: "Applicant contact",
  email: "applicant@example.test",
  phone: "+264000000000",
  state: "RESOLVED",
  assignedTo: null,
  assigneeName: null,
  createdAt: "2026-10-15T10:00:00Z",
  updatedAt: "2026-10-15T10:00:00Z",
  rowVersion: 1,
  grounds: "<p><strong>Review grounds</strong></p>",
  details: "<p>Supporting details</p>",
  resolutionNote: "Reviewed the appeal.\nResponse recorded.",
};

function show(data: ApplicationAppeal = appeal) {
  vi.mocked(useApplicationAppeal).mockReturnValue({
    data,
    isError: false,
    isFetching: false,
  } as never);
  return renderToStaticMarkup(
    <ApplicationAppealDetail id={data.id} onClose={() => undefined} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useCapabilities).mockReturnValue(new Set());
});

describe("appeal detail card", () => {
  it("shows the linked application, rich text and resolution without applicant contact", () => {
    const markup = show();

    expect(markup).toContain("APL-000001");
    expect(markup).toContain("Resolved");
    expect(markup).toContain(appeal.applicationReference);
    expect(markup).toContain('href="/admin/applications/application-id"');
    expect(markup).toContain("View application");
    expect(markup).toContain('aria-label="Appeal submission"');
    expect(markup).toContain('aria-label="Appeal grounds"');
    expect(markup).toContain("<strong>Review grounds</strong>");
    expect(markup).toContain('aria-label="Appeal details"');
    expect(markup).toContain("Supporting details");
    expect(markup).toContain('aria-label="Resolution"');
    expect(markup).toContain(appeal.resolutionNote);
    expect(markup).not.toContain(appeal.name);
    expect(markup).not.toContain(appeal.email);
    expect(markup).not.toContain(appeal.phone);
    expect(markup).not.toContain("Submitter");
    expect(markup).not.toContain("Appeal management");
  });

  it("keeps open-appeal controls scoped to the staff permissions", () => {
    const openAppeal = {
      ...appeal,
      state: "IN_PROGRESS" as const,
      resolutionNote: null,
    };
    const readOnly = show(openAppeal);
    expect(readOnly).toContain("In progress");
    expect(readOnly).not.toContain("Appeal management");
    expect(readOnly).not.toContain('aria-label="Resolution"');

    vi.mocked(useCapabilities).mockReturnValue(
      new Set([permissionCodes.applicationAppealAssignAll]),
    );
    const assignOnly = show(openAppeal);
    expect(assignOnly).toContain('aria-label="Assign appeal"');
    expect(assignOnly).not.toContain('aria-label="Resolve appeal"');

    vi.mocked(useCapabilities).mockReturnValue(
      new Set([permissionCodes.applicationAppealResolveAll]),
    );
    const resolveOnly = show(openAppeal);
    expect(resolveOnly).toContain('aria-label="Resolve appeal"');
    expect(resolveOnly).not.toContain('aria-label="Assign appeal"');
  });

  it("hides management controls on resolved appeals even for authorized staff", () => {
    vi.mocked(useCapabilities).mockReturnValue(
      new Set([
        permissionCodes.applicationAppealAssignAll,
        permissionCodes.applicationAppealResolveAll,
      ]),
    );

    expect(show()).not.toContain("Appeal management");
  });
});
