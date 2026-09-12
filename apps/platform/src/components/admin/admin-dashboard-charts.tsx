"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const trend = [
  { day: "01 May", applications: 7 },
  { day: "05 May", applications: 15 },
  { day: "08 May", applications: 11 },
  { day: "12 May", applications: 24 },
  { day: "15 May", applications: 17 },
  { day: "18 May", applications: 26 },
  { day: "22 May", applications: 12 },
  { day: "25 May", applications: 21 },
  { day: "29 May", applications: 29 },
];

const sectors = [
  { name: "Energy", value: 35, fill: "#ff6f00" },
  { name: "Agriculture", value: 25, fill: "#16a34a" },
  { name: "Mining", value: 20, fill: "#d5a51e" },
  { name: "Tourism", value: 10, fill: "#ff6f00" },
  { name: "Others", value: 10, fill: "#8b6c55" },
];

const tooltipStyle = {
  borderRadius: 8,
  borderColor: "#e2e8f0",
  fontSize: 11,
};

function ApplicationsTrendChart() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-navy">Applications Overview</h2>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trend}
            margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
          >
            <defs>
              <linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6f00" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#ff6f00" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#edf0f3" vertical />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              interval={1}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <YAxis
              domain={[0, 30]}
              ticks={[0, 10, 20, 30]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="linear"
              dataKey="applications"
              stroke="#d95e00"
              strokeWidth={2}
              fill="url(#overviewFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function SectorChart() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-navy">By Sector</h2>
      <div className="mt-3 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sectors}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={1}
            >
              {sectors.map((item) => (
                <Cell key={item.name} fill={item.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 grid gap-2">
        {sectors.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-2 text-[10px]"
          >
            <span
              className="size-2 rounded-full"
              style={{ background: item.fill }}
            />
            <span className="flex-1 text-slate-500">{item.name}</span>
            <strong className="text-slate-600">{item.value}%</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminDashboardCharts() {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_.75fr]">
      <ApplicationsTrendChart />
      <SectorChart />
    </div>
  );
}
