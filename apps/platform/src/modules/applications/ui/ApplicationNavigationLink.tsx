"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { ArrowLink } from "@/components/ui/links";
import { NavigationPendingIndicator } from "@/shared/ui/portal/NavigationPendingIndicator";
import { useApplicationNavigation } from "./useApplicationNavigation";

type Props = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  applicationId: string;
  audience: "staff" | "applicant";
  arrow?: boolean;
};

export function ApplicationNavigationLink({
  applicationId,
  audience,
  arrow,
  children,
  ...props
}: Props) {
  const prepare = useApplicationNavigation(applicationId, audience);
  const href = `${audience === "staff" ? "/admin" : "/portal"}/applications/${applicationId}`;
  const Component = arrow ? ArrowLink : Link;
  return (
    <Component {...props} href={href} onNavigate={prepare}>
      {children}
      <NavigationPendingIndicator />
    </Component>
  );
}
