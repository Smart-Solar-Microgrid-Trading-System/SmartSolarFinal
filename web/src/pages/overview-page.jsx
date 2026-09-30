import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, Gauge } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const overviewCards = [
  { key: "pendingReservations", title: "Pending reservations", icon: Clock3, tone: "text-amber-600 bg-amber-50" },
  { key: "approvedFutureReservations", title: "Approved future", icon: CalendarCheck, tone: "text-brand-600 bg-brand-50" },
  { key: "currentBookings", title: "Current bookings", icon: Gauge, tone: "text-violet-600 bg-violet-50" },
  { key: "completedToday", title: "Completed today", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" }
];

export function OverviewPage() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api.getOperationsDashboard(session.token)
      .then((data) => {
        if (active) {
          setDashboard(data);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
        }
      });

    return () => {
      active = false;
    };
  }, [session.token]);

  const isBackoffice = session.role === "Backoffice";
  const description = isBackoffice
    ? "Reservation activity across the microgrid network."
    : "Live booking activity for your operational work."
  const eyebrow = isBackoffice ? "Backoffice" : "Grid Operator";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title="Overview"
        description={description}
        icon={Gauge}
      />

      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      {!dashboard && !error && (
        <p className="text-sm text-slate-500">Loading overview...</p>
      )}

      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overviewCards.map(({ key, title, icon: Icon, tone }) => (
            <Card key={key}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">{title}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{dashboard[key]}</p>
                </div>
                <div className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                  <Icon size={21} aria-hidden="true" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
