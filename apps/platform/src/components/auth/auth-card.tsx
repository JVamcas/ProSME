export function AuthCard({
  eyebrow = "Secure applicant portal",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[75vh] bg-slate-50 py-16">
      <div className="container">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="display mt-3 text-3xl font-bold text-navy">{title}</h1>
          <p className="mb-8 mt-3 text-sm leading-6 text-slate-600">{description}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
