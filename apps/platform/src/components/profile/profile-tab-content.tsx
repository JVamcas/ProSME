import { ContactProfileForm } from "./contact-profile-form";
import { PersonalProfileForm } from "./personal-profile-form";
import { ProfilePageHeader } from "./profile-page-header";
import { ProfilePasswordPanel } from "./profile-password-panel";
import type { ProfileTabId } from "./profile-workspace";

export function ProfileTabContent({
  canUpdateApplicant,
  email,
  tab,
}: {
  canUpdateApplicant: boolean;
  email: string;
  tab: ProfileTabId;
}) {
  if (tab === "contact") {
    return (
      <>
        <ProfilePageHeader
          eyebrow="Contact details"
          title="Contact details"
          description="Keep your contact and address details updated."
        />
        <ContactProfileForm readOnly={!canUpdateApplicant} />
      </>
    );
  }

  if (tab === "password") {
    return <ProfilePasswordPanel email={email} />;
  }

  return (
    <>
      <ProfilePageHeader
        eyebrow="Personal information"
        title="Personal information"
        description="Maintain the personal details linked to your account."
      />
      <PersonalProfileForm readOnly={!canUpdateApplicant} />
    </>
  );
}
