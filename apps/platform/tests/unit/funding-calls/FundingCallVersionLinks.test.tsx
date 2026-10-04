import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/funding-calls/infrastructure/FundingCallDetailRepository", () => ({
  readFundingCallDetail: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { readFundingCallDetail } from "@/modules/funding-calls/infrastructure/FundingCallDetailRepository";
import { getFundingCall } from "@/modules/funding-calls/application/ServerFundingCallService";
import { FundingCallReadOnlyReview } from "@/modules/funding-calls/ui/FundingCallReadOnlyReview";
import { callId, stored, user } from "../../support/FundingCallServiceFixture";

const detail = {
  call: stored,
  formDefinitionId: "20000000-0000-4000-8000-000000000002",
  eligibilityRuleSetId: "30000000-0000-4000-8000-000000000002",
  workflowDefinitionId: "40000000-0000-4000-8000-000000000002",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFundingCallDetail).mockResolvedValue(detail as never);
});

describe("funding call attached version links", () => {
  it("links each displayed ID to its exact attached version and owning definition", async () => {
    const call = await getFundingCall(user([permissionCodes.fundingCallRead]), callId);
    expect(call.versionLinks).toEqual({
      applicationForm: `/admin/settings/forms/${detail.formDefinitionId}?versionId=${stored.formVersionId}`,
      eligibilityRuleSet: `/admin/settings/eligibility-rulesets/${detail.eligibilityRuleSetId}?versionId=${stored.eligibilityRuleSetVersionId}`,
      workflowTemplate: `/admin/workflows/${detail.workflowDefinitionId}?versionId=${stored.workflowTemplateVersionId}`,
    });
    const markup = renderToStaticMarkup(<FundingCallReadOnlyReview call={call} />);
    for (const href of Object.values(call.versionLinks!)) {
      expect(markup).toContain(`href="${href}"`);
    }
    expect(markup).toContain(`>${stored.formVersionId}</a>`);
    expect(markup).toContain(`>${stored.eligibilityRuleSetVersionId}</a>`);
    expect(markup).toContain(`>${stored.workflowTemplateVersionId}</a>`);
  });

  it("leaves missing attachments as plain Not provided values", async () => {
    vi.mocked(readFundingCallDetail).mockResolvedValue({
      ...detail,
      call: {
        ...stored,
        formVersionId: null,
        eligibilityRuleSetVersionId: null,
        workflowTemplateVersionId: null,
      },
      formDefinitionId: null,
      eligibilityRuleSetId: null,
      workflowDefinitionId: null,
    } as never);
    const call = await getFundingCall(user([permissionCodes.fundingCallRead]), callId);
    const markup = renderToStaticMarkup(<FundingCallReadOnlyReview call={call} />);
    expect(markup).not.toContain("<a ");
    expect(markup).toContain("Not provided");
  });

  it("checks funding-call read permission before loading links", async () => {
    await expect(getFundingCall(user([]), callId)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readFundingCallDetail).not.toHaveBeenCalled();
  });

  it("returns Not Found for an absent call", async () => {
    vi.mocked(readFundingCallDetail).mockResolvedValue(null);
    await expect(getFundingCall(user([permissionCodes.fundingCallRead]), callId))
      .rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
