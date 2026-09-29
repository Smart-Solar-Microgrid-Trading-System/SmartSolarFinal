import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Eye,
  FileText,
  MapPin,
  UserRound,
  Zap
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ReservationSummaryPage() {
  // Load the completed operation and show a clear summary to the staff member.
  const { reservationId } = useParams();
  const { session } = useAuth();
  const location = useLocation();

  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Retrieve the saved values so the confirmation reflects the database record.
    api
      .getReservationById(session.token, reservationId)
      .then(setReservation)
      .catch((err) => setError(err.message));
  }, [reservationId, session.token]);

  const operation = location.state?.operation || "processed";
  const copy = getOperationCopy(operation);

  function copyReservationId() {
    // Copy the reservation identifier when clipboard access is available.
    navigator.clipboard?.writeText(reservation.id);
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 py-4">
      <div className="text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <span className="grid size-14 place-items-center rounded-full border-2 border-emerald-600">
            <Check size={32} strokeWidth={2.5} />
          </span>
        </span>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">{copy.title}</h1>
        <p className="mt-1 text-slate-500">{copy.description}</p>
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {reservation && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-slate-100">
            <CardTitle className="text-2xl">Reservation summary</CardTitle>
            <StatusPill status={reservation.status} />
          </CardHeader>
          <CardContent className="grid gap-x-8 px-6 py-2 md:grid-cols-2">
            <SummaryRow
              icon={FileText}
              label="Reservation ID"
              value={reservation.id}
              action={(
                <button
                  type="button"
                  className="rounded p-1 text-brand-600 hover:bg-brand-50"
                  onClick={copyReservationId}
                  aria-label="Copy reservation ID"
                  title="Copy reservation ID"
                >
                  <Copy size={17} />
                </button>
              )}
            />
            <SummaryRow
              icon={UserRound}
              label="Prosumer"
              value={`${reservation.prosumerName || "Prosumer"} (${reservation.prosumerNic})`}
            />
            <SummaryRow icon={MapPin} label="Station" value={reservation.nodeName || reservation.nodeId} />
            <SummaryRow icon={CalendarDays} label="Start time" value={formatUtc(reservation.startTime)} />
            <SummaryRow icon={CalendarDays} label="End time" value={formatUtc(reservation.endTime)} />
            <SummaryRow icon={Zap} label="Energy amount" value={`${reservation.energyAmountKw} kWh`} />
          </CardContent>
          <p className="px-6 pb-5 text-xs text-slate-500">Times are shown in UTC.</p>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link to={`/reservations/${reservationId}`}>
            <Eye size={16} />
            View reservation
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/reservations">
            <ArrowLeft size={16} />
            Back to reservations
          </Link>
        </Button>
      </div>
    </section>
  );
}

function SummaryRow({ icon: Icon, label, value, action }) {
  // Display one saved reservation value in the confirmation card.
  return (
    <div className="grid min-h-24 grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 py-4">
      <span className="grid size-11 place-items-center rounded-full bg-slate-50 text-slate-700">
        <Icon size={21} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ status }) {
  // Use a local pill so the shared badge gradient does not alter the status colour.
  const tone = getStatusTone(status);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${tone}`}>
      <Clock3 size={17} />
      {status}
    </span>
  );
}

function getOperationCopy(operation) {
  // Match the heading and description to the operation that just completed.
  const messages = {
    created: {
      title: "Reservation created successfully",
      description: "The reservation has been created for the selected Prosumer."
    },
    updated: {
      title: "Reservation updated successfully",
      description: "The reservation changes have been saved."
    },
    cancelled: {
      title: "Reservation cancelled successfully",
      description: "The reservation has been marked as Cancelled and was not deleted."
    }
  };

  return messages[operation] || {
    title: "Operation successful",
    description: "The reservation operation was completed successfully."
  };
}

function getStatusTone(status) {
  // Keep each reservation status visually distinct on the success page.
  const tones = {
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Completed: "border-slate-200 bg-slate-100 text-slate-700",
    Cancelled: "border-red-200 bg-red-50 text-red-700",
    Rejected: "border-red-200 bg-red-50 text-red-700"
  };

  return tones[status] || "border-brand-200 bg-brand-50 text-brand-700";
}
