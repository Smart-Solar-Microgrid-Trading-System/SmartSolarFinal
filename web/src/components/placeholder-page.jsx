import { CircleAlert } from "lucide-react";

import { PageHeader } from "@/components/page-header";

export function PlaceholderPage({ title }) {
  return (
    <section className="space-y-6">
      <PageHeader eyebrow="Smart Solar Microgrid" title={title} />

      <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-slate-700">
        <CircleAlert className="mt-0.5 shrink-0 text-brand-600" size={18} aria-hidden="true" />
        <p>This shared screen shell is ready for the team to connect to approved Web API endpoints.</p>
      </div>
    </section>
  );
}