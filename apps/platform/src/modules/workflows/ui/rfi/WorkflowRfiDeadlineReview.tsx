import type { WorkflowRfiDeadlineConfiguration } from "../../domain/actions/WorkflowRequestInformationDeadline";

export function WorkflowRfiDeadlineReview({
  configuration,
}: {
  configuration: WorkflowRfiDeadlineConfiguration;
}) {
  const settings = [
    {
      key: "deadlineDays" as const,
      label: "Response deadline",
      value: `${configuration.deadlineDays} days`,
    },
    {
      key: "expiryAction" as const,
      label: "On expiry",
      value:
        configuration.expiryAction === "CLOSE_REQUEST"
          ? "Close request"
          : configuration.expiryAction === "RETURN"
            ? "Return"
            : "Escalate",
    },
    {
      key: "reminderDayOffsets" as const,
      label: "Reminder day offsets",
      value: configuration.reminderDayOffsets.join(", ") || "No reminders",
    },
  ];

  return (
    <section aria-label="Response settings">
      <h3 className="text-sm font-bold text-brand-navy">Response settings</h3>
      <dl className="mt-3 grid gap-4 rounded-xl border border-brand-navy/10 p-4 sm:grid-cols-2">
        {settings.map((setting) => (
          <div key={setting.key}>
            <dt className="text-sm font-semibold text-brand-navy">
              {setting.label}
            </dt>
            <dd className="mt-1 text-sm text-brand-navy/60">
              {setting.value}. Runtime override{" "}
              {configuration.runtimeOverrides?.[setting.key]
                ? "allowed"
                : "disabled"}
              .
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
