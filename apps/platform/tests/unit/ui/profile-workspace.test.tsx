import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  profileTabs,
  ProfileWorkspace,
} from "@/components/applicant/profile/ProfileWorkspace";
import { ProfileFormActions } from "@/components/applicant/profile/ProfileFormActions";

describe("P3.1 profile workspace", () => {
  it("renders the accepted profile sections as horizontal tabs", () => {
    const markup = renderToStaticMarkup(
      <ProfileWorkspace
        allowedTabIds={profileTabs.map((item) => item.id)}
        defaultTabId="personal"
      >
        {profileTabs.map((item) => (
          <p key={item.id}>{item.label} panel</p>
        ))}
      </ProfileWorkspace>,
    );

    expect(markup).toContain('aria-label="Profile sections"');
    expect(markup).toContain("Personal information");
    expect(markup).toContain("Contact details");
    expect(markup).toContain("Change password");
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-orientation="horizontal"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).not.toContain("href=");
    expect(markup).toContain("Personal information panel");
    expect(markup).not.toContain("Business information");
  });

  it("renders only capability-filtered tabs and a view-only form state", () => {
    const personalTabs = profileTabs;
    const tabsMarkup = renderToStaticMarkup(
      <ProfileWorkspace
        allowedTabIds={personalTabs.map((item) => item.id)}
        defaultTabId="personal"
      >
        {personalTabs.map((item) => (
          <p key={item.id}>{item.label} panel</p>
        ))}
      </ProfileWorkspace>,
    );
    const actionsMarkup = renderToStaticMarkup(
      <ProfileFormActions
        error={false}
        pending={false}
        readOnly
        saveLabel="Save"
      />,
    );

    expect(tabsMarkup).not.toContain("Business information");
    expect(actionsMarkup).toContain("view-only access");
    expect(actionsMarkup).not.toContain('type="submit"');
  });
});
