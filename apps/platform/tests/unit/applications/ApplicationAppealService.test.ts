import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/applications/infrastructure/ApplicationAppealRepository",
  () => ({
    appealTransaction: (operation: (transaction: unknown) => unknown) =>
      operation({}),
    findAppealApplication: vi.fn(),
    createApplicationAppeal: vi.fn(),
    auditApplicationAppeal: vi.fn(),
    listApplicationAppeals: vi.fn().mockResolvedValue([]),
    readApplicationAppeal: vi.fn(),
    updateApplicationAppeal: vi.fn(),
  }),
);
vi.mock(
  "@/modules/applications/infrastructure/ApplicationAppealStaffRepository",
  () => ({
    appealAssigneeCanRead: vi.fn(),
    listAppealAssignees: vi.fn(),
  }),
);
vi.mock(
  "@/modules/notifications/application/ApplicationAppealNotifications",
  () => ({
    captureApplicationAppealNotifications: vi.fn(),
  }),
);
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
import { applicationAppealSchema } from "@/modules/applications/api/ApplicationAppealSchemas";
import {
  submitApplicationAppeal,
  getApplicationAppeals,
  getApplicationAppeal,
  assignApplicationAppeal,
  resolveApplicationAppeal,
} from "@/modules/applications/application/ServerApplicationAppealService";
import {
  findAppealApplication,
  createApplicationAppeal,
  listApplicationAppeals,
  readApplicationAppeal,
  updateApplicationAppeal,
} from "@/modules/applications/infrastructure/ApplicationAppealRepository";
import { appealAssigneeCanRead } from "@/modules/applications/infrastructure/ApplicationAppealStaffRepository";
import { captureApplicationAppealNotifications } from "@/modules/notifications/application/ApplicationAppealNotifications";
import { permissionCodes as codes } from "@/auth/authorization/permissions";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { POST } from "@/app/api/public/application-appeals/route";
import { GET } from "@/app/api/application-appeals/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { canAccessOperationsPortal } from "@/auth/authorization/portal-access";
const input = {
  applicationReference: "CALL-2026-000001",
  grounds: "<p>Grounds for review</p>",
  details: "<p>Decision details</p>",
  consent: true,
  company: "",
};
const applicantContact = {
  name: "Application owner",
  email: "owner@example.test",
  phone: "+264000000000",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findAppealApplication).mockResolvedValue({
    id: chatbotId(10),
    reference: input.applicationReference,
    ...applicantContact,
  });
  vi.mocked(createApplicationAppeal).mockResolvedValue({
    id: chatbotId(20),
    reference: "APL-000001",
  });
});
describe("application appeal intake", () => {
  it("accepts the application reference without contact fields and rejects supplied contact overrides", async () => {
    expect(applicationAppealSchema.safeParse(input).success).toBe(true);
    await expect(
      submitApplicationAppeal({ ...input, ...applicantContact }),
    ).rejects.toThrow();
    expect(findAppealApplication).not.toHaveBeenCalled();
    expect(createApplicationAppeal).not.toHaveBeenCalled();
  });
  it("counts text rather than formatting and enforces 1000 characters on both fields", () => {
    for (const field of ["grounds", "details"]) {
      expect(
        applicationAppealSchema.safeParse({
          ...input,
          [field]: `<p><strong>${"a".repeat(1000)}</strong></p>`,
        }).success,
      ).toBe(true);
      expect(
        applicationAppealSchema.safeParse({
          ...input,
          [field]: `<p>${"a".repeat(1001)}</p>`,
        }).success,
      ).toBe(false);
      expect(
        applicationAppealSchema.safeParse({ ...input, [field]: "<p><br></p>" })
          .success,
      ).toBe(false);
      expect(
        applicationAppealSchema.safeParse({
          ...input,
          [field]: `<p>${"&#65;".repeat(1001)}</p>`,
        }).success,
      ).toBe(false);
    }
  });
  it("rejects unknown application references before storing or acknowledging", async () => {
    vi.mocked(findAppealApplication).mockResolvedValue(undefined);
    await expect(submitApplicationAppeal(input)).rejects.toThrow(
      "No application was found",
    );
    expect(createApplicationAppeal).not.toHaveBeenCalled();
    expect(captureApplicationAppealNotifications).not.toHaveBeenCalled();
  });
  it("sanitizes markup and captures both notifications with the accepted appeal", async () => {
    expect(
      await submitApplicationAppeal({
        ...input,
        grounds: '<p onclick="bad()">Grounds</p><script>alert(1)</script>',
      }),
    ).toEqual({ reference: "APL-000001" });
    expect(createApplicationAppeal).toHaveBeenCalledWith(
      {},
      chatbotId(10),
      expect.objectContaining({
        grounds: "<p>Grounds</p>",
        ...applicantContact,
      }),
    );
    expect(captureApplicationAppealNotifications).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        appealId: chatbotId(20),
        applicationId: chatbotId(10),
      }),
      { name: applicantContact.name, email: applicantContact.email },
    );
  });
  it("rejects text that is empty after sanitization", async () => {
    await expect(
      submitApplicationAppeal({
        ...input,
        grounds: "<script>alert(1)</script>",
      }),
    ).rejects.toThrow();
    expect(findAppealApplication).not.toHaveBeenCalled();
  });
  it("accepts public submissions without resolving a logged-in user", async () => {
    const response = await POST(
      new Request("https://example.test/api/public/application-appeals", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(resolveUserFromHeaders).not.toHaveBeenCalled();
  });
  it("returns a validation error for an invalid reference", async () => {
    vi.mocked(findAppealApplication).mockResolvedValue(undefined);
    const response = await POST(
      new Request("https://example.test/api/public/application-appeals", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(400);
  });
});
describe("appeal staff permissions", () => {
  it("allows staff with appeal read permission to enter Operations", () => {
    expect(
      canAccessOperationsPortal(chatbotActor([codes.applicationAppealReadAll])),
    ).toBe(true);
    expect(canAccessOperationsPortal(chatbotActor([]))).toBe(false);
  });
  it("denies queue and detail reads without the appeal permission", async () => {
    await expect(getApplicationAppeals(chatbotActor([]), {})).rejects.toThrow();
    await expect(
      getApplicationAppeal(chatbotActor([]), chatbotId(20)),
    ).rejects.toThrow();
    expect(listApplicationAppeals).not.toHaveBeenCalled();
    expect(readApplicationAppeal).not.toHaveBeenCalled();
  });
  it("denies assignment and resolution to read-only staff", async () => {
    const actor = chatbotActor([codes.applicationAppealReadAll]);
    await expect(
      assignApplicationAppeal(actor, chatbotId(20), {
        assignedTo: chatbotId(1),
        expectedRowVersion: 1,
      }),
    ).rejects.toThrow();
    await expect(
      resolveApplicationAppeal(actor, chatbotId(20), {
        resolutionNote: "Reviewed",
        expectedRowVersion: 1,
      }),
    ).rejects.toThrow();
    expect(updateApplicationAppeal).not.toHaveBeenCalled();
  });
  it("rejects an assignee who cannot read appeals", async () => {
    vi.mocked(appealAssigneeCanRead).mockResolvedValue(false);
    await expect(
      assignApplicationAppeal(
        chatbotActor([
          codes.applicationAppealReadAll,
          codes.applicationAppealAssignAll,
        ]),
        chatbotId(20),
        { assignedTo: chatbotId(1), expectedRowVersion: 1 },
      ),
    ).rejects.toThrow("authorized");
    expect(updateApplicationAppeal).not.toHaveBeenCalled();
  });
  it("requires a note and resolves with the expected row version", async () => {
    const actor = chatbotActor([
      codes.applicationAppealReadAll,
      codes.applicationAppealResolveAll,
    ]);
    await expect(
      resolveApplicationAppeal(actor, chatbotId(20), {
        resolutionNote: " ",
        expectedRowVersion: 1,
      }),
    ).rejects.toThrow();
    await resolveApplicationAppeal(actor, chatbotId(20), {
      resolutionNote: "Reviewed",
      expectedRowVersion: 1,
    });
    expect(updateApplicationAppeal).toHaveBeenCalledWith(
      {},
      chatbotId(20),
      1,
      expect.objectContaining({ resolutionNote: "Reviewed" }),
    );
  });
  it("returns 403 from the queue route for an unauthorized actor", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(chatbotActor([]));
    expect(
      (await GET(new Request("https://example.test/api/application-appeals")))
        .status,
    ).toBe(403);
  });
});
