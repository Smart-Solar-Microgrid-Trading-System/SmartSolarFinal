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
          value={slot ? (
            <span className="block min-w-0">
              <span className="block font-medium text-slate-800">
                {formatUtcDateRange(slot.startTime, slot.endTime)}
              </span>
              <span className="mt-1 block text-xs font-medium text-slate-600">
                {formatUtcTime(slot.startTime)} – {formatUtcTime(slot.endTime)} UTC
              </span>
            </span>
          ) : "Not selected"}
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
    <div className="grid grid-cols-[20px_100px_minmax(0,1fr)] items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
      <Icon className="text-slate-600" size={18} />
      <span className="text-slate-500">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 break-words text-right">
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

  return `${formatUtcDate(value)} ${formatUtcTime(value)} UTC`;
}

export function formatUtcRange(startValue, endValue) {
  // Keep slot labels short enough for select fields while showing UTC once.
  if (!startValue || !endValue) {
    return "-";
  }

  const startDate = new Date(startValue);
  const endDate = new Date(endValue);
  const startDay = formatUtcShortDate(startDate);
  const endDay = formatUtcShortDate(endDate);

  if (sameUtcDay(startDate, endDate)) {
    return `${startDay}, ${formatUtcTime(startDate)} – ${formatUtcTime(endDate)} UTC`;
  }

  return `${startDay}, ${formatUtcTime(startDate)} – ${endDay}, ${formatUtcTime(endDate)} UTC`;
}

export function formatUtcTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString(undefined, {
    timeZone: "UTC",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatUtcDateRange(startValue, endValue) {
  // Show one date for same-day bookings and both dates for overnight bookings.
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);

  if (sameUtcDay(startDate, endDate)) {
    return formatUtcDate(startDate);
  }

  return `${formatUtcDate(startDate)} – ${formatUtcDate(endDate)}`;
}

function formatUtcDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatUtcShortDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric"
  });
}

function sameUtcDay(firstDate, secondDate) {
  return firstDate.getUTCFullYear() === secondDate.getUTCFullYear() &&
    firstDate.getUTCMonth() === secondDate.getUTCMonth() &&
    firstDate.getUTCDate() === secondDate.getUTCDate();
}
