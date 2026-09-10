"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eligibilityRules } from "@/data/eligibility-rules";

type Answer = "yes" | "no";

export function EligibilityChecker() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const complete = index >= eligibilityRules.length;
  const rule = eligibilityRules[index];
  const progress = complete ? 100 : (index / eligibilityRules.length) * 100;

  const result = useMemo(() => {
    const hardFailures = eligibilityRules.filter(r => r.hardStop && answers[r.id] === "no");
    const actions = eligibilityRules.filter(r => !r.hardStop && answers[r.id] === "no");
    if (hardFailures.length) return { type: "not-eligible" as const, items: hardFailures };
    if (actions.length) return { type: "action" as const, items: actions };
    return { type: "eligible" as const, items: [] };
  }, [answers]);

  function answer(value: Answer) {
    setAnswers(current => ({ ...current, [rule.id]: value }));
    setIndex(current => current + 1);
  }

  function reset() { setAnswers({}); setIndex(0); }

  if (complete) {
    const eligible = result.type === "eligible";
    const action = result.type === "action";
    return <div className="card overflow-hidden">
      <div className={`p-8 sm:p-10 ${eligible ? "bg-emerald-50" : action ? "bg-amber-50" : "bg-red-50"}`}>
        <div className={`grid size-14 place-items-center rounded-full ${eligible ? "bg-emerald-600" : action ? "bg-amber-500" : "bg-red-600"} text-white`}>{eligible ? <CheckCircle2 /> : <AlertCircle />}</div>
        <p className="eyebrow mt-7">Your result</p>
        <h2 className="display mt-2 text-4xl font-semibold text-navy">{eligible ? "You appear eligible to apply" : action ? "A few actions are required" : "You are not currently eligible"}</h2>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">{eligible ? "Based on your responses, you meet the initial requirements. Final eligibility is subject to document verification and assessment." : action ? "You meet the core requirements, but should resolve the items below before submitting a complete application." : "One or more core programme requirements are not currently met. Review the items below before proceeding."}</p>
      </div>
      {result.items.length > 0 && <div className="border-t border-slate-200 p-8 sm:p-10"><h3 className="font-bold text-navy">Items to review</h3><ul className="mt-4 grid gap-3">{result.items.map(item => <li key={item.id} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><X className="mt-0.5 size-4 shrink-0 text-red-500" /><span><strong className="block text-slate-900">{item.question.replace("?", "")}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{item.help}</span></span></li>)}</ul></div>}
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-6 sm:flex-row sm:justify-between"><Button variant="ghost" onClick={reset}><RotateCcw className="size-4" />Start again</Button>{result.type !== "not-eligible" && <Button asChild variant="gold"><Link href="/apply">Start application <ArrowRight className="size-4" /></Link></Button>}</div>
    </div>;
  }

  return <div className="card overflow-hidden">
    <div className="border-b border-slate-200 px-6 py-5 sm:px-9"><div className="flex items-center justify-between text-xs font-bold"><span className="text-navy">Question {index + 1} of {eligibilityRules.length}</span><span className="text-slate-400">{Math.round(progress)}% complete</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange transition-all duration-300" style={{ width: `${progress}%` }} /></div></div>
    <div className="p-7 sm:p-10"><p className="eyebrow">Initial eligibility</p><h2 className="display mt-3 text-3xl font-semibold leading-tight text-navy sm:text-4xl">{rule.question}</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">{rule.help}</p><div className="mt-9 grid gap-3 sm:grid-cols-2"><button onClick={() => answer("yes")} className="group flex items-center gap-4 rounded-2xl border-2 border-slate-200 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-50"><span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-5" /></span><span><strong className="block text-navy">Yes</strong><span className="text-xs text-slate-500">This applies to my business</span></span></button><button onClick={() => answer("no")} className="group flex items-center gap-4 rounded-2xl border-2 border-slate-200 p-5 text-left transition hover:border-red-400 hover:bg-red-50"><span className="grid size-10 place-items-center rounded-full bg-red-100 text-red-600"><X className="size-5" /></span><span><strong className="block text-navy">No</strong><span className="text-xs text-slate-500">Not yet or not applicable</span></span></button></div></div>
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 sm:px-9"><Button variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft className="size-4" />Previous</Button><p className="text-xs text-slate-400">Your answers stay on this device</p></div>
  </div>;
}
