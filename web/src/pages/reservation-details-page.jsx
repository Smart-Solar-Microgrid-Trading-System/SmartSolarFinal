import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Clock3,
  Copy,
  FileText,
  History,
  Info,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
  Zap
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { CancelReservationDialog } from "@/components/reservations/cancel-reservation-dialog";
import { formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ReservationDetailsPage() {
  // Load and manage the reservation selected from the shared reservation list.
  const { reservationId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Retrieve the latest reservation data whenever the route changes.
    api
      .getReservationById(session.token, reservationId)
      .then(setReservation)
      .catch((err) => setError(err.message));
  }, [reservationId, session.token]);

  async function handleCancel() {
    // Soft-cancel the reservation and display the operation summary returned by the API.
    setBusy(true);
    setError("");

    try {
      await api.cancelReservation(session.token, reservationId);
      setCancelOpen(false);
      navigate(`/reservations/${reservationId}/summary`, { state: { operation: "cancelled" } });
    } catch (err) {
      setError(err.message);
      setCancelOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function copyReservationId() {
    // Copy the reservation identifier when the browser supports clipboard access.
    navigator.clipboard?.writeText(reservation.id);
  }

  if (!reservation && !error) {
    return <p className="text-sm text-slate-500">Loading reservation...</p>;
  }

  const locked = reservation && ["Cancelled", "Completed"].includes(reservation.status);

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">
          <Link className="font-medium text-brand-600 hover:text-brand-700" to="/reservations">
            Reservations
          </Link>{" "}
          / Reservation details
        </p>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reservation details</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage this reservation created for a Prosumer.
            </p>
          </div>
          {reservation && <StatusPill status={reservation.status} />}
        </div>
      </header>

      {location.state?.operation && (
        <FeedbackAlert variant="success">Reservation successfully {location.state.operation}.</FeedbackAlert>
      )}
      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      {reservation && (
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Prosumer information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-0 md:grid-cols-[auto_1fr_1fr_1fr] md:items-center">
              <span className="grid size-14 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-800">
                {getInitial(reservation.prosumerName)}
              </span>
              <ProsumerFact label="Prosumer" value={reservation.prosumerName || "—"} />
              <ProsumerFact label="NIC" value={reservation.prosumerNic || "—"} />
              <ProsumerFact
                label="Account status"
                value={<AccountStatus status={reservation.prosumerStatus} />}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Reservation information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0 md:grid-cols-2">
              <DetailTile
                icon={FileText}
                label="Reservation ID"
                value={reservation.id}
                action={(
                  <button
                    type="button"
                    className="rounded p-1 text-slate-500 hover:bg-white hover:text-brand-700"
                    onClick={copyReservationId}
                    aria-label="Copy reservation ID"
                    title="Copy reservation ID"
                  >
                    <Copy size={17} />
                  </button>
                )}
              />
              <DetailTile icon={MapPin} label="Microgrid node" value={reservation.nodeName || reservation.nodeId} />
              <DetailTile icon={CalendarClock} label="Booking slot" value={formatSlotName(reservation.startTime)} />
              <DetailTile icon={Clock3} label="Start time" value={formatUtc(reservation.startTime)} />
              <DetailTile icon={CalendarDays} label="End time" value={formatUtc(reservation.endTime)} />
              <DetailTile icon={Zap} label="Energy amount" value={`${reservation.energyAmountKw} kWh`} />
              <DetailTile icon={CalendarDays} label="Created" value={formatUtc(reservation.createdAt)} />
              <DetailTile icon={History} label="Last updated" value={formatUtc(reservation.updatedAt)} />
              {reservation.cancelledAt && (
                <DetailTile icon={Trash2} label="Cancelled" value={formatUtc(reservation.cancelledAt)} />
              )}
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 text-sm text-slate-500">
            <Info className="mt-0.5 shrink-0 text-brand-600" size={17} />
            <span>Changes and cancellations require at least 12 hours&apos; notice. Times are shown in UTC.</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="outline">
              <Link to="/reservations">
                <ArrowLeft size={16} />
                Back to reservations
              </Link>
            </Button>

            <div className="flex flex-wrap gap-2">
              <Button asChild disabled={locked}>
                <Link to={locked ? "#" : `/reservations/${reservation.id}/edit`}>
                  <Pencil size={16} />
                  Edit reservation
                </Link>
              </Button>
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => setCancelOpen(true)}
                disabled={locked}
              >
                <Trash2 size={16} />
                Cancel reservation
              </Button>
            </div>
          </div>

          <CancelReservationDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            reservation={reservation}
            busy={busy}
            onConfirm={handleCancel}
          />
        </div>
      )}
    </section>
  );
}

function ProsumerFact({ label, value }) {
  // Display one compact item in the Prosumer information row.
  return (
    <div className="min-w-0 border-slate-200 md:border-l md:pl-6">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DetailTile({ icon: Icon, label, value, action }) {
  // Present one reservation value in a readable, compact tile.
  return (
    <div className="grid min-h-16 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <Icon className="text-slate-700" size={21} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">{value || "—"}</p>
      </div>
      {action}
    </div>
  );
}

function StatusPill({ status }) {
  // Apply a plain status pill so shared badge gradients cannot override its colour.
  const tone = getStatusTone(status);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${tone}`}>
      <Clock3 size={17} />
      {status}
    </span>
  );
}

function AccountStatus({ status }) {
  // Show active and inactive account states with clear local colours.
  const active = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      <span className={`size-2 rounded-full ${active ? "bg-emerald-600" : "bg-slate-500"}`} />
      {status || "Unknown"}
    </span>
  );
}

function formatSlotName(value) {
  // Give the booking slot a readable label instead of exposing its database ID.
  if (!value) return "—";

  const date = new Date(value);
  const hour = date.getUTCHours();
  const period = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
  const day = date.toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return `${period} slot · ${day}`;
}

function getInitial(name) {
  // Use the Prosumer's first initial when no profile image is available.
  return name?.trim()?.charAt(0)?.toUpperCase() || <UserRound size={22} />;
}

function getStatusTone(status) {
  // Keep reservation status colours consistent without changing shared components.
  const tones = {
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Completed: "border-slate-200 bg-slate-100 text-slate-700",
    Cancelled: "border-red-200 bg-red-50 text-red-700",
    Rejected: "border-red-200 bg-red-50 text-red-700"
  };

  return tones[status] || "border-brand-200 bg-brand-50 text-brand-700";
}
