"use client";

import Link from "next/link";
import { Bell, ChevronRight, FileWarning, RefreshCw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const trend = [
  { day: "01 May", applications: 7 }, { day: "05 May", applications: 15 }, { day: "08 May", applications: 11 },
  { day: "12 May", applications: 24 }, { day: "15 May", applications: 17 }, { day: "18 May", applications: 26 },
  { day: "22 May", applications: 12 }, { day: "25 May", applications: 21 }, { day: "29 May", applications: 29 },
];

const sectors = [
  { name: "Energy", value: 35, fill: "#1677c8" },
  { name: "Agriculture", value: 25, fill: "#16a34a" },
  { name: "Mining", value: 20, fill: "#d5a51e" },
  { name: "Tourism", value: 10, fill: "#ff6f00" },
  { name: "Others", value: 10, fill: "#8b6c55" },
];

const recent = [
  ["APP-2024-0015", "Green Hydrogen Project", "30 May 2024", "In Review"],
  ["APP-2024-0014", "Agri Processing Plant", "29 May 2024", "In Review"],
  ["APP-2024-0013", "Wind Farm Development", "28 May 2024", "Submitted"],
  ["APP-2024-0012", "Solar Power Project", "12 May 2024", "In Review"],
];

export function AdminDashboard() {
  return <div className="mx-auto max-w-[1240px] p-4 sm:p-7 lg:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1><p className="mt-1 text-xs text-slate-400">Overview of platform activities</p></div><div className="flex items-center gap-4"><Bell className="size-5 text-slate-500"/><select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none"><option>01 May 2024 - 31 May 2024</option></select></div></div>

    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["128","Total Applications"],["45","In Review"],["32","Approved"],["12","Rejected"]].map(([value,label])=><article key={label} className="rounded-lg border border-slate-200 bg-white px-5 py-6 text-center shadow-sm"><p className="text-3xl font-bold text-navy">{value}</p><p className="mt-2 text-xs text-slate-500">{label}</p></article>)}</div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_.75fr]">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold text-navy">Applications Overview</h2><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{top:10,right:10,left:-22,bottom:0}}><defs><linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6baed6" stopOpacity={0.28}/><stop offset="100%" stopColor="#6baed6" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0f3" vertical={true}/><XAxis dataKey="day" axisLine={false} tickLine={false} interval={1} tick={{fontSize:10,fill:"#94a3b8"}}/><YAxis domain={[0,30]} ticks={[0,10,20,30]} axisLine={false} tickLine={false} tick={{fontSize:10,fill:"#94a3b8"}}/><Tooltip contentStyle={{borderRadius:8,borderColor:"#e2e8f0",fontSize:11}}/><Area type="linear" dataKey="applications" stroke="#2b82be" strokeWidth={2} fill="url(#overviewFill)"/></AreaChart></ResponsiveContainer></div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold text-navy">By Sector</h2><div className="mt-3 h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sectors} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={1}>{sectors.map(item=><Cell key={item.name} fill={item.fill}/>)}</Pie><Tooltip contentStyle={{borderRadius:8,borderColor:"#e2e8f0",fontSize:11}}/></PieChart></ResponsiveContainer></div><div className="mt-2 grid gap-2">{sectors.map(item=><div key={item.name} className="flex items-center gap-2 text-[10px]"><span className="size-2 rounded-full" style={{background:item.fill}}/><span className="flex-1 text-slate-500">{item.name}</span><strong className="text-slate-600">{item.value}%</strong></div>)}</div></section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_.75fr]">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-navy">Recent Applications</h2><Link href="/admin/applications" className="text-[10px] font-bold text-sky">View All</Link></div><div className="divide-y divide-slate-100">{recent.map(([id,project,date,status])=><div key={id} className="grid grid-cols-[1fr_1.5fr_1fr_.7fr] gap-3 px-5 py-4 text-[10px] text-slate-500"><span>{id}</span><strong className="font-semibold text-slate-700">{project}</strong><span>{date}</span><span>{status}</span></div>)}</div></section>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-bold text-navy">System Alerts</h2></div><div className="grid gap-5 p-5">{[{icon:Bell,text:"3 applications require attention"},{icon:FileWarning,text:"2 documents expiring soon"},{icon:RefreshCw,text:"1 system update available"}].map(({icon:Icon,text})=><div key={text} className="flex items-center gap-3 text-xs text-slate-600"><Icon className="size-5 shrink-0 text-navy"/><span>{text}</span></div>)}</div><div className="flex justify-end px-5 pb-4"><button className="inline-flex items-center gap-1 text-[10px] font-bold text-sky">View All <ChevronRight className="size-3"/></button></div></section>
    </div>
  </div>;
}
