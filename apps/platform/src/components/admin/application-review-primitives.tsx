export function SectionTitle({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-5 text-brand-orange" />
      <h2 className="font-bold text-navy">{children}</h2>
    </div>
  );
}

export function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex gap-3">
      {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-brand-orange" />}
      <div>
        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-semibold text-slate-700">{value}</dd>
      </div>
    </div>
  );
}
