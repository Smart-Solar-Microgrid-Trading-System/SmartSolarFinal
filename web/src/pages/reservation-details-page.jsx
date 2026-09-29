import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Clock3,
  FileText,
  History,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  Zap
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { CancelReservationDialog } from "@/components/reservations/cancel-reservation-dialog";
import { formatUtc, formatUtcRange } from "@/components/reservations/reservation-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ReservationDetailsPage() {
  const { reservationId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getReservationById(session.token, reservationId)
      .then(setReservation)
      .catch((err) => setError(err.message));
  }, [reservationId, session.token]);

  async function handleCancel() {
    // Soft-cancel the reservation and show the operation summary returned by the API.
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

  if (!reservation && !error) {
    return <p className="text-sm text-slate-500">Loading reservation...</p>;
  }

  // edit and cancel are disabled once it is cancelled or completed
  const locked = reservation && ["Cancelled", "Completed"].includes(reservation.status);
  const statusStyle = reservation ? getStatusStyle(reservation.status) : null;

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">
          <span className="font-medium text-brand-600">Reservations</span> / Details
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Reservation Details</h1>
        <p className="mt-1 text-sm text-slate-500">
          View the Prosumer, booking schedule and current reservation status.
        </p>
      </header>

      {location.state?.operation && (
        <FeedbackAlert variant="success">Reservation successfully {location.state.operation}.</FeedbackAlert>
      )}
      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      {reservation && (
        <div className="space-y-5">
          <div className={`flex items-start gap-3 rounded-xl border p-4 ${statusStyle.panel}`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${statusStyle.icon}`}>
              <Clock3 size={20} />
            </span>
            <div>
              <p className={`text-lg font-bold ${statusStyle.text}`}>{reservation.status}</p>
              <p className="mt-0.5 text-sm text-slate-600">{statusStyle.message}</p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <UserRound size={20} />
                </span>
                <CardTitle>Prosumer Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-x-8 gap-y-1 pt-4 md:grid-cols-3">
              <DetailItem icon={UserRound} label="Name" value={reservation.prosumerName || "—"} />
              <DetailItem icon={FileText} label="NIC" value={reservation.prosumerNic} />
              <DetailItem
                icon={ShieldCheck}
                label="Account status"
                value={(
                  <Badge className="bg-emerald-50 text-emerald-700">
                    {reservation.prosumerStatus || "—"}
                  </Badge>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CalendarClock size={20} />
                </span>
                <CardTitle>Reservation Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-x-8 gap-y-1 pt-4 md:grid-cols-2">
              <DetailItem icon={FileText} label="Reservation ID" value={reservation.id} />
              <DetailItem icon={MapPin} label="Microgrid node" value={reservation.nodeName || reservation.nodeId} />
              <DetailItem icon={CalendarClock} label="Booking slot" value={formatSlotName(reservation.startTime)} />
              <DetailItem
                icon={Clock3}
                label="Scheduled time (UTC)"
                value={formatUtcRange(reservation.startTime, reservation.endTime)}
              />
              <DetailItem icon={Zap} label="Energy amount" value={`${reservation.energyAmountKw} kWh`} />
              <DetailItem
                icon={ShieldCheck}
                label="Status"
                value={<Badge className={statusStyle.badge}>{reservation.status}</Badge>}
              />
              <DetailItem icon={CalendarDays} label="Created" value={formatUtc(reservation.createdAt)} />
              <DetailItem icon={History} label="Last updated" value={formatUtc(reservation.updatedAt)} />
              {reservation.cancelledAt && (
                <DetailItem icon={Trash2} label="Cancelled" value={formatUtc(reservation.cancelledAt)} />
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                className="border-red-300 text-red-700"
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

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-3 last:border-0">
      <Icon className="mt-0.5 text-slate-500" size={18} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function formatSlotName(value) {
  // Give the booking slot a readable label instead of exposing its database ID.
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

function getStatusStyle(status) {
  // Keep status colours and explanatory text consistent on the details page.
  const styles = {
    Pending: {
      panel: "border-amber-200 bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
      text: "text-amber-800",
      badge: "bg-amber-50 text-amber-700",
      message: "This reservation is awaiting confirmation."
    },
    Approved: {
      panel: "border-emerald-200 bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-800",
      badge: "bg-emerald-50 text-emerald-700",
      message: "This reservation has been approved."
    },
    Completed: {
      panel: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200 text-slate-700",
      text: "text-slate-800",
      badge: "bg-slate-100 text-slate-700",
      message: "This reservation has been completed."
    },
    Cancelled: {
      panel: "border-red-200 bg-red-50",
      icon: "bg-red-100 text-red-700",
      text: "text-red-800",
      badge: "bg-red-50 text-red-700",
      message: "This reservation has been cancelled."
    },
    Rejected: {
      panel: "border-red-200 bg-red-50",
      icon: "bg-red-100 text-red-700",
      text: "text-red-800",
      badge: "bg-red-50 text-red-700",
      message: "This reservation was not approved."
    }
  };

  return styles[status] ?? {
    panel: "border-brand-200 bg-brand-50",
    icon: "bg-brand-100 text-brand-700",
    text: "text-brand-800",
    badge: "bg-brand-50 text-brand-700",
    message: "Current reservation status."
  };
}
