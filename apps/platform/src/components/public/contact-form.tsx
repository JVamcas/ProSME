"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

type Status = { kind: "idle" | "success" | "error"; message?: string };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/contact", {
      body: JSON.stringify({ ...values, consent: values.consent === "on" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const result = await response.json() as { error?: string; message?: string };
    setStatus({ kind: response.ok ? "success" : "error", message: result.message ?? result.error });
    if (response.ok) form.reset();
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-brand-blue/25 bg-brand-white p-6 shadow-[0_12px_35px_rgba(10,24,59,0.08)] sm:grid-cols-2" aria-describedby="contact-status">
      <Field label="Name" name="name" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" />
      <Field label="Subject" name="subject" required />
      <label className="hidden" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-brand-navy">Message</span><textarea name="message" required minLength={10} rows={6} className="w-full rounded-xl border border-brand-blue/40 bg-brand-white px-4 py-3 text-base text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" /></label>
      <label className="sm:col-span-2 flex gap-3 text-sm leading-5 text-brand-navy/75"><input name="consent" type="checkbox" required className="mt-1 size-4 accent-brand-orange" /><span>I consent to the SME Fund using this information to respond to my enquiry. See the <a href="/privacy" className="font-bold text-brand-orange underline">privacy policy</a>.</span></label>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-4"><button disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-orange px-7 text-sm font-bold text-brand-white shadow-[0_8px_20px_rgba(10,24,59,0.18)] transition-colors hover:bg-brand-navy disabled:opacity-60">{pending ? "Sending…" : "Send message"}<Send className="size-4" /></button><p id="contact-status" role="status" className={status.kind === "error" ? "text-sm text-brand-orange" : "text-sm text-brand-green"}>{status.message}</p></div>
    </form>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return <label><span className="mb-2 block text-sm font-bold text-brand-navy">{label}</span><input {...inputProps} className="h-12 w-full rounded-xl border border-brand-blue/40 bg-brand-white px-4 text-base text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20" /></label>;
}
