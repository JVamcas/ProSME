import { ContactProfileForm } from "./ContactProfileForm";
import { PersonalProfileForm } from "./PersonalProfileForm";
import { ProfilePageHeader } from "./ProfilePageHeader";
import { ProfilePasswordPanel } from "./ProfilePasswordPanel";
import type { ProfileTabId } from "./ProfileWorkspace";

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
