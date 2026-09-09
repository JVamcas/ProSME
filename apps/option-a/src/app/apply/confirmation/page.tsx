import type { Metadata } from "next";
import { ConfirmationView } from "@/components/application/confirmation-view";

export const metadata: Metadata = { title: "Application received" };
export default function ConfirmationPage() { return <section className="section bg-slate-50"><div className="container max-w-4xl"><ConfirmationView /></div></section>; }
