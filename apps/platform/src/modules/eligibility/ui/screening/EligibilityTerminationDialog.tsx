"use client";

import { useEffect, useState } from "react";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";

export function EligibilityTerminationDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(30);

  useEffect(() => {
    const deadline = Date.now() + 30_000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        onConfirm();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [onConfirm]);

  return (
    <ConfirmationDialog
      confirmLabel="Continue"
      isOpen
      message={
        <>
          The eligibility ruleset found a hard failure. The application will be
          terminated in{" "}
          <span className="text-red-600">{remainingSeconds} seconds</span>.
          Continue terminates it immediately. Cancel to correct your captured
          results and run eligibility again.
        </>
      }
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Confirm application termination"
    />
  );
}
