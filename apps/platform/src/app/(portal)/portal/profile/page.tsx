import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { capabilities } from "@/auth/authorization/capabilities";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { can } from "@/auth/authorization/policy";
import { ProfilePageHeader } from "@/components/profile/profile-page-header";
import { ProfileTabContent } from "@/components/profile/profile-tab-content";
import {
  type ProfileTabId,
  ProfileWorkspace,
} from "@/components/profile/profile-workspace";

export const metadata: Metadata = { title: "My profile" };

type ApplicantProfilePageProps = {
  searchParams: Promise<{ tab?: string }>;
};

const profileTabIds: readonly ProfileTabId[] = [
  "personal",
  "contact",
  "password",
];

function parseProfileTab(value: string): ProfileTabId {
  return profileTabIds.includes(value as ProfileTabId)
    ? (value as ProfileTabId)
    : "personal";
}

function availableProfileTabs(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
): ProfileTabId[] {
  const tabs: ProfileTabId[] = [];

  if (can(user, capabilities.profileReadOwn)) {
    tabs.push("personal", "contact", "password");
  }

  return tabs;
}

export default async function ApplicantProfilePage({
  searchParams,
}: ApplicantProfilePageProps) {
  const user = await getCurrentUser();
  const requestedTab = (await searchParams).tab;
  const availableTabs = user ? availableProfileTabs(user) : [];
  const tab = requestedTab
    ? parseProfileTab(requestedTab)
    : (availableTabs[0] ?? "personal");

  if (!user || availableTabs.length === 0) {
    redirect("/unauthorized");
  }

  if (!requestedTab || requestedTab !== tab) {
    redirect(`/portal/profile?tab=${tab}`);
  }

  if (!availableTabs.includes(tab)) {
    redirect("/unauthorized");
  }

  return (
    <section>
      <ProfilePageHeader
        className="lg:hidden"
        title="My profile"
        description="Manage your personal, contact, and account information."
      />
      <ProfileWorkspace
        allowedTabIds={availableTabs}
        defaultTabId={tab}
      >
        {availableTabs.map((availableTab) => (
          <ProfileTabContent
            canUpdateApplicant={can(user, capabilities.profileUpdateOwn)}
            email={user.email}
            key={availableTab}
            tab={availableTab}
          />
        ))}
      </ProfileWorkspace>
    </section>
  );
}
