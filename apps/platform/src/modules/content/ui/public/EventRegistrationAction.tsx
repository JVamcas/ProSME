"use client";

import { useId, useState } from "react";

import { GeneralButton } from "@/shared/ui/Button";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import { EventRegistrationForm } from "./EventRegistrationForm";

export function EventRegistrationAction({
  eventId,
  eventTitle,
  registrationAvailable,
}: {
  eventId: number;
  eventTitle: string;
  registrationAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const noteId = useId();

  return (
    <div>
      <GeneralButton
        aria-describedby={registrationAvailable ? undefined : noteId}
        className="rounded-lg"
        disabled={!registrationAvailable}
        onClick={() => setOpen(true)}
        type="button"
      >
        Register
      </GeneralButton>
      {!registrationAvailable ? (
        <p className="mt-2 text-xs text-brand-navy/70" id={noteId}>
          Registration is not available yet.
        </p>
      ) : null}
      <RightDrawer
        description={`Secure your spot for ${eventTitle}.`}
        onClose={() => setOpen(false)}
        open={open && registrationAvailable}
        size="lg"
        title="Register for this session"
      >
        <EventRegistrationForm
          eventId={eventId}
          eventTitle={eventTitle}
          showHeading={false}
        />
      </RightDrawer>
    </div>
  );
}
