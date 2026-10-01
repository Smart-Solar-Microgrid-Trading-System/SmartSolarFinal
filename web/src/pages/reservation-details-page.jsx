import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { CancelReservationDialog } from "@/components/reservations/cancel-reservation-dialog";
import { formatUtc } from "@/components/reservations/reservation-summary";
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

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand-600">Reservations / {reservationId}</p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Reservation details</h1>
          {reservation && <Badge>{reservation.status}</Badge>}
        </div>
      </div>

      {location.state?.operation && (
        <FeedbackAlert variant="success">Reservation successfully {location.state.operation}.</FeedbackAlert>
      )}
      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      {reservation && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Prosumer details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Row label="Name" value={reservation.prosumerName || "—"} />
              <Row label="NIC" value={reservation.prosumerNic} />
              <Row label="Account status" value={reservation.prosumerStatus || "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reservation information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Row label="Reservation ID" value={reservation.id} />
              <Row label="Microgrid node" value={reservation.nodeName || reservation.nodeId} />
              <Row label="Booking slot" value={reservation.slotId} />
              <Row label="Scheduled start" value={formatUtc(reservation.startTime)} />
              <Row label="Scheduled end" value={formatUtc(reservation.endTime)} />
              <Row label="Energy amount" value={`${reservation.energyAmountKw} kWh`} />
              <Row label="Status" value={reservation.status} />
              <Row label="Created" value={formatUtc(reservation.createdAt)} />
              <Row label="Last updated" value={formatUtc(reservation.updatedAt)} />
              {reservation.cancelledAt && <Row label="Cancelled" value={formatUtc(reservation.cancelledAt)} />}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-between gap-3">
            <Button asChild variant="outline">
              <Link to="/reservations">
                <ArrowLeft size={16} />
                Back to reservations
              </Link>
            </Button>

            <div className="flex gap-2">
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

function Row({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}