import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";

import { formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// shown after a reservation is created, updated or cancelled
export function ReservationSummaryPage() {
  const { reservationId } = useParams();
  const { session } = useAuth();
  const location = useLocation();

  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getReservationById(session.token, reservationId)
      .then(setReservation)
      .catch((err) => setError(err.message));
  }, [reservationId, session.token]);

  const operation = location.state?.operation || "processed";

  return (
    <section className="mx-auto max-w-2xl space-y-5 text-center">
      <CheckCircle2 className="mx-auto text-emerald-600" size={64} />

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Operation successful</h1>
        <p className="text-slate-500">The reservation was successfully {operation}.</p>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {reservation && (
        <Card className="text-left">
          <CardContent className="space-y-3 pt-6">
            <Row label="Reservation ID" value={reservation.id} />
            <Row label="Prosumer" value={`${reservation.prosumerName || "Prosumer"} (${reservation.prosumerNic})`} />
            <Row label="Station" value={reservation.nodeName || reservation.nodeId} />
            <Row
              label="Scheduled time"
              value={`${formatUtc(reservation.startTime)} – ${formatUtc(reservation.endTime)}`}
            />
            <Row label="Energy amount" value={`${reservation.energyAmountKw} kWh`} />
            <Row label="Current status" value={reservation.status} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Button asChild>
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

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}