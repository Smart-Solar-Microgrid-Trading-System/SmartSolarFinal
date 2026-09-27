import {
  CalendarDays,
  Clock3,
  FileText,
  Network,
  UserRound,
  Zap
} from "lucide-react";

export function ReservationSummary({ prosumer, node, slot, energyAmount }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="grid size-11 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <FileText size={21} />
        </span>
        <div>
          <h2 className="font-bold text-slate-900">Reservation Summary</h2>
          <p className="mt-1 text-sm text-slate-500">Review the selected details before creating the reservation.</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <SummaryRow
          icon={UserRound}
          label="Prosumer"
          value={prosumer ? `${prosumer.fullName} (${prosumer.id})` : "Not selected"}
          badge={prosumer?.accountStatus}
        />
        <SummaryRow icon={Network} label="Station" value={node?.name ?? "Not selected"} />
        <SummaryRow icon={Network} label="Node capacity" value={node ? `${node.capacityKw} kW` : "-"} />
        <SummaryRow
          icon={CalendarDays}
          label="Scheduled time"
          value={slot ? `${formatUtc(slot.startTime)} - ${formatUtc(slot.endTime)}` : "Not selected"}
        />
        <SummaryRow icon={Clock3} label="Slot availability" value={slot?.status ?? "-"} />
        <SummaryRow
          icon={Zap}
          label="Energy amount"
          value={energyAmount ? `${energyAmount} kWh` : "Not entered"}
        />
        <SummaryRow icon={FileText} label="Initial status" value="Pending" status />
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, badge, status = false }) {
  return (
    <div className="grid grid-cols-[24px_110px_1fr] items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
      <Icon className="text-slate-600" size={18} />
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center justify-end gap-2 text-right">
        <span className={status
          ? "rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-700"
          : "font-medium text-slate-800"}
        >
          {value}
        </span>
        {badge && (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

export function formatUtc(value) {
  if (!value) {
    return "-";
  }

  return `${new Date(value).toLocaleString(undefined, {
    timeZone: "UTC"
  })} UTC`;
}
