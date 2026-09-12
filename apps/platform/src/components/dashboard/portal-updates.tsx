import { AlertCircle, Bell, Check, ChevronRight, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PortalUpdates({ reference }: { reference: string }) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy">Next action</h2>
          <Clock3 className="size-4 text-orange" />
        </div>
        <div className="mt-4 flex gap-3 rounded-2xl bg-orange-pale p-4">
          <Check className="mt-0.5 size-4 shrink-0 text-navy" />
          <p className="text-xs leading-5 text-slate-600">
            <strong className="block text-navy">No action required</strong>
            The programme team is reviewing your application for completeness.
          </p>
        </div>
      </section>
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy">Latest notification</h2>
          <AlertCircle className="size-4 text-gold-dark" />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 h-auto w-full justify-start rounded-2xl bg-amber-50 p-4 text-left hover:bg-amber-100"
        >
          <span className="grid size-9 place-items-center rounded-full bg-white">
            <Bell className="size-4 text-amber-700" />
          </span>
          <span className="flex-1 text-xs leading-5 text-slate-600">
            <strong className="block text-navy">Application received</strong>
            Your reference is {reference}
          </span>
          <ChevronRight className="size-4 text-slate-400" />
        </Button>
      </section>
    </div>
  );
}
