import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ApplicantJourney } from "@/modules/content/ui/public/ApplicantJourney";
import { HowToApplyNavigation } from "@/modules/content/ui/public/HowToApplyNavigation";
import { findPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";
import { PublicFundingCallDetails } from "@/modules/funding-calls/ui/public/PublicFundingCallDetails";
import { PublicFundingCallNextStep } from "@/modules/funding-calls/ui/public/PublicFundingCallNextStep";
import { publicFundingHref } from "@/modules/funding-calls/ui/public/PublicFundingCallLinks";
import { Breadcrumbs } from "@/shared/ui/navigation/Breadcrumbs";

type Props = { params: Promise<{ fundingCallId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const call = await findPublicFundingCallById((await params).fundingCallId);
  return call ? { description: call.summary, title: call.title } : {};
}

export default async function FundingCallPage({ params }: Props) {
  const call = await findPublicFundingCallById((await params).fundingCallId);
  if (!call) notFound();
  return (
    <>
      <HowToApplyNavigation active="funding" />
      <div className="container py-8 sm:py-10">
        <Breadcrumbs
          items={[
            { href: "/how-to-apply", label: "How to Apply" },
            { href: publicFundingHref, label: "Funding calls" },
            { label: call.title },
          ]}
        />
        <h1 className="display text-3xl font-bold text-brand-navy sm:text-5xl">
          {call.title}
        </h1>
        <ApplicantJourney step={1} />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <PublicFundingCallDetails call={call} />
          <PublicFundingCallNextStep call={call} />
        </div>
      </div>
    </>
  );
}
