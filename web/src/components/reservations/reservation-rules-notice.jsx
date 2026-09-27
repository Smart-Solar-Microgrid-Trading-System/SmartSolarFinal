import { Info } from "lucide-react";

export function ReservationRulesNotice({ edit = false }) {
  const message = edit
    ? "Reservations cannot be modified or cancelled when fewer than 12 hours remain before the scheduled start."
    : "Reservations can be scheduled up to 7 days ahead. Changes and cancellations require at least 12 hours' notice.";

  return (
    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
      <Info className="mt-0.5 shrink-0" size={17} />
      <p>{message}</p>
    </div>
  );
}
