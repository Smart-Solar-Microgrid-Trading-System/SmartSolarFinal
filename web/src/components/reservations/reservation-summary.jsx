import {
  Activity,
  CalendarClock,
  RadioTower,
  ShieldCheck,
  UserRound,
  Zap
} from "lucide-react";

export function ReservationSummary({ prosumer, node, slot, energyAmount }) {
  const completedItems = [prosumer, node, slot, Number(energyAmount) > 0].filter(Boolean).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <div className="bg-gradient-to-r from-brand-700 to-emerald-700 p-5 text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Live preview</p>
            <h2 className="mt-1 text-xl font-bold">Reservation summary</h2>
          </div>
          <span className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Zap className="text-amber-300" size={22} />
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-emerald-300 transition-all"
            style={{ width: `${completedItems * 25}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-200">{completedItems} of 4 reservation details completed</p>
      </div>

      <div className="space-y-1 p-4">
        <SummaryRow
          icon={UserRound}
          label="Prosumer"
          value={prosumer ? prosumer.fullName : "Not selected"}
          detail={prosumer ? `NIC ${prosumer.id} • ${prosumer.accountStatus}` : "Choose an active account"}
        />
        <SummaryRow
          icon={RadioTower}
          label="Station"
          value={node?.name ?? "Not selected"}
          detail={node ? `${node.capacityKw} kW node capacity` : "Choose a microgrid node"}
        />
        <SummaryRow
          icon={CalendarClock}
          label="Scheduled time"
          value={slot ? formatUtc(slot.startTime) : "Not selected"}
          detail={slot ? `Ends ${formatUtc(slot.endTime)}` : "Choose an available slot"}
        />
        <SummaryRow
          icon={Activity}
          label="Energy amount"
          value={energyAmount ? `${energyAmount} kWh` : "Not entered"}
          detail={slot ? `Slot capacity ${slot.capacityKw} kW` : "Enter the requested amount"}
        />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 bg-amber-50 px-5 py-4">
        <ShieldCheck className="shrink-0 text-amber-600" size={20} />
        <div>
          <p className="text-sm font-bold text-amber-900">Initial status: Pending</p>
          <p className="text-xs text-amber-700">The operations team can review it after creation.</p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, detail }) {
  return (
    <div className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-0.5 break-words text-sm font-bold text-slate-800">{value}</p>
        <p className="mt-0.5 break-words text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

export function formatUtc(value) {
  if (!value) {
    return "—";
  }

  return `${new Date(value).toLocaleString(undefined, {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short"
  })} UTC`;
}
