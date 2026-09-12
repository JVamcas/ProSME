"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

export function NewsletterForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, consent: values.consent === "on" }) });
      const result = await response.json() as { error?: string; message?: string };
      setMessage(result.message ?? result.error ?? "Please try again.");
      if (response.ok) form.reset();
    } catch {
      setMessage("Subscription is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="mt-4">
    <label className="hidden" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
    <div className="flex rounded-full bg-white p-1"><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="Your email address" className="min-w-0 flex-1 bg-transparent px-4 text-sm text-navy outline-none placeholder:text-slate-500" /><button disabled={pending} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-brand-navy px-5 text-xs font-bold text-brand-white disabled:opacity-60" aria-label="Subscribe">{pending ? "Submitting…" : "Subscribe"}<ArrowRight className="size-4" /></button></div>
    <label className="mt-3 flex gap-2 text-[11px] leading-4 text-white/80"><input name="consent" type="checkbox" required className="mt-0.5 accent-navy" /><span>I agree to receive SME Fund updates and accept the <a href="/privacy" className="underline">privacy policy</a>.</span></label>
    <p className="mt-2 min-h-4 text-xs text-white" role="status">{pending ? "Submitting…" : message}</p>
  </form>;
}
