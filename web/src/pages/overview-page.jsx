import { useEffect, useState } from "react";
import { AlertCircle, CalendarCheck, CheckCircle2, Clock3, Gauge, ShieldCheck } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const overviewCards = [
  { key: "pendingReservations", title: "Pending reservations", icon: Clock3, tone: "text-amber-600 bg-amber-50" },
  { key: "approvedFutureReservations", title: "Upcoming reservations", icon: CalendarCheck, tone: "text-brand-600 bg-brand-50" },
  { key: "currentBookings", title: "Transfers in progress", icon: Gauge, tone: "text-violet-600 bg-violet-50" },
  { key: "completedToday", title: "Completed today", icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" }
];

function getAttentionItems(dashboard, isBackoffice) {
  const items = [];

  if (dashboard.pendingReservations > 0) {
    items.push(
      isBackoffice
        ? `${dashboard.pendingReservations} reservation${dashboard.pendingReservations === 1 ? " is" : "s are"} awaiting review.`
        : `${dashboard.pendingReservations} reservation${dashboard.pendingReservations === 1 ? " is" : "s are"} still pending. Monitor the related station availability.`
    );
  }

  if (dashboard.currentBookings > 0) {
    items.push(
      isBackoffice
        ? `${dashboard.currentBookings} energy transfer${dashboard.currentBookings === 1 ? " is" : "s are"} currently in progress.`
        : `${dashboard.currentBookings} energy transfer${dashboard.currentBookings === 1 ? " is" : "s are"} in progress. Finalize transfers after QR verification.`
    );
  }

  if (dashboard.approvedFutureReservations > 0) {
    items.push(
      isBackoffice
        ? `${dashboard.approvedFutureReservations} approved reservation${dashboard.approvedFutureReservations === 1 ? " is" : "s are"} scheduled ahead.`
        : `${dashboard.approvedFutureReservations} approved reservation${dashboard.approvedFutureReservations === 1 ? " is" : "s are"} coming up. Prepare the assigned station.`
    );
  }

  return items;
}

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
  const attentionItems = dashboard ? getAttentionItems(dashboard, isBackoffice) : [];

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
        <div className="space-y-6">
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

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  {attentionItems.length > 0 ? <AlertCircle size={20} aria-hidden="true" /> : <ShieldCheck size={20} aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">Operational attention</p>
                  {attentionItems.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-600">No reservation items require attention at this time.</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm text-slate-600">
                      {attentionItems.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
