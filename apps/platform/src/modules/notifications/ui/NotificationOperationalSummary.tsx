"use client";

import {
  CircleCheck,
  CircleX,
  Clock3,
  LoaderCircle,
  RefreshCcw,
} from "lucide-react";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { DashboardMetricCard } from "@/shared/ui/DashboardMetricCard";
import { useNotificationSummary } from "./useNotificationAdministration";

export function NotificationOperationalSummary() {
  const query = useNotificationSummary();
  if (query.isPending) {
    return <PortalLoadingState description="Just a moment..." title="" />;
  }
  if (query.error || !query.data) {
    return (
      <PortalErrorState
        description={query.error.message}
        title={query.error.name}
      />
    );
  }
  const counts = [
    {
      count: query.data.pending,
      icon: Clock3,
      label: "Pending",
      supportingText: "Queued for delivery",
    },
    {
      count: query.data.processing,
      icon: LoaderCircle,
      label: "Processing",
      supportingText: "Currently being delivered",
    },
    {
      count: query.data.retrying,
      icon: RefreshCcw,
      label: "Retrying",
      supportingText: "Scheduled for another attempt",
    },
    {
      count: query.data.sent,
      icon: CircleCheck,
      label: "Sent",
      supportingText: "Delivered successfully",
    },
    {
      count: query.data.failed,
      icon: CircleX,
      label: "Failed",
      supportingText: "Terminal delivery failures",
    },
    {
      count: query.data.deadLetter,
      icon: CircleX,
      label: "Dead letter",
      supportingText: "Automatic attempts exhausted",
    },
  ] as const;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {counts.map(({ count, icon, label, supportingText }) => (
          <DashboardMetricCard
            icon={icon}
            key={label}
            label={label}
            supportingText={supportingText}
            value={count.toLocaleString("en-NA")}
          />
        ))}
      </div>
    </div>
  );
}
