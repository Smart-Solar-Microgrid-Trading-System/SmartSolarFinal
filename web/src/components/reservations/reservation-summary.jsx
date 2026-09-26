export function ReservationSummary({ prosumer, node, slot, energyAmount }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-900">Reservation summary</h2>

      <div className="space-y-3 text-sm">
        <SummaryRow
          label="Prosumer"
          value={prosumer ? `${prosumer.fullName} (${prosumer.id})` : "Not selected"}
        />
        <SummaryRow label="Account status" value={prosumer?.accountStatus ?? "-"} />
        <SummaryRow label="Station" value={node?.name ?? "Not selected"} />
        <SummaryRow label="Node capacity" value={node ? `${node.capacityKw} kW` : "-"} />
        <SummaryRow
          label="Scheduled time"
          value={slot ? `${formatUtc(slot.startTime)} - ${formatUtc(slot.endTime)}` : "Not selected"}
        />
        <SummaryRow label="Slot availability" value={slot?.status ?? "-"} />
        <SummaryRow
          label="Energy amount"
          value={energyAmount ? `${energyAmount} kWh` : "Not entered"}
        />
        <SummaryRow label="Initial status" value="Pending" />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
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
