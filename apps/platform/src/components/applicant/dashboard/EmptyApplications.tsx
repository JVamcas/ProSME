import { FileText } from "lucide-react";
import Link from "next/link";

import { GeneralButton } from "@/components/ui/button";

export function EmptyApplications() {
  return (
    <div className="card mt-8 p-10 text-center">
      <FileText className="mx-auto size-10 text-brand-orange" />
      <h2 className="display mt-4 text-2xl font-semibold text-navy">
        No submitted application yet
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Start an application to see its progress here.
      </p>
      <GeneralButton asChild variant="primary" className="mt-6">
        <Link href="/portal/applications/new">Start application</Link>
      </GeneralButton>
    </div>
  );
}
