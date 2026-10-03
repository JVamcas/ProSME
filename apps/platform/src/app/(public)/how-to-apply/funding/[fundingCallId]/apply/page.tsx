import { notFound, redirect } from "next/navigation";

import { authNavigationHref } from "@/platform/auth/AuthNavigation";
import { getCurrentUser } from "@/auth/authorization/current-user";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

export default async function StartApplicationPage({ params }: {
  params: Promise<{ fundingCallId: string }>;
}) {
  const { fundingCallId } = await params;
  const [call, user] = await Promise.all([
    findPublicFundingCallById(fundingCallId),
    getCurrentUser(),
  ]);
  if (!call) notFound();
  const destination = `/portal/applications/new?fundingOpportunityId=${encodeURIComponent(call.id)}`;
  redirect(user ? destination : authNavigationHref("/sign-in", destination));
}
