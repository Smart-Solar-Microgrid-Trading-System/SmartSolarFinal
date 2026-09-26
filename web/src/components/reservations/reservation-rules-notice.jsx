import { CalendarRange, Clock3, Info } from "lucide-react";

export function ReservationRulesNotice({ edit = false }) {
  if (edit) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <Clock3 className="mt-0.5 shrink-0 text-amber-600" size={19} />
        <div>
          <p className="font-bold">12-hour change window</p>
          <p className="mt-1 text-amber-800">Reservations cannot be modified or cancelled when fewer than 12 hours remain before the scheduled start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:grid-cols-2">
      <Rule icon={CalendarRange} title="Seven-day booking window" text="The selected slot must begin within the next seven days." />
      <Rule icon={Clock3} title="12 hours' notice" text="Changes and cancellations close 12 hours before the scheduled start." />
    </div>
  );
}

function Rule({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 shadow-sm">
        <Icon size={16} />
      </span>
      <div>
        <p className="flex items-center gap-1 font-bold">{title}<Info size={13} className="text-blue-500" /></p>
        <p className="mt-1 text-xs leading-relaxed text-blue-800">{text}</p>
      </div>
    </div>
  );
}
