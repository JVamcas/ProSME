import { authEyebrowClassName } from "./auth-styles";

export function AuthCard({
  eyebrow = "",
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
    <main className="min-h-[75vh] bg-brand-blue/5 py-16">
      <div className="container">
        <div className="mx-auto max-w-md rounded-3xl border border-brand-blue/20 bg-brand-white p-7 shadow-xl shadow-brand-navy/5 sm:p-10">
          <p className={authEyebrowClassName}>{eyebrow}</p>
          <h1 className="display mt-3 text-3xl font-bold text-brand-navy">
            {title}
          </h1>
          <p className="mb-8 mt-3 text-sm leading-6 text-brand-navy/70">
            {description}
          </p>
          {children}
        </div>
      </div>
    </main>
  );
}
