import { CircleAlert } from "lucide-react";

export function PlaceholderPage({ title }) {
  return (
    <section className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Smart Solar Microgrid</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <div className="mt-6 flex gap-3 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm text-slate-700">
        <CircleAlert className="mt-0.5 shrink-0 text-brand-600" size={18} aria-hidden="true" />
        <p>This shared screen shell is ready for the team to connect to approved Web API endpoints.</p>
      </div>
    </section>
  );
}
