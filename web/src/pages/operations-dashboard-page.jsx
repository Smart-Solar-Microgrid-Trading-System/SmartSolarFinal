import { useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, Gauge, RefreshCw } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const cardColors = {
    brand: "from-brand-50 to-brand-100 text-brand-600",
    amber: "from-amber-50 to-amber-100 text-amber-600",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-600",
    violet: "from-violet-50 to-violet-100 text-violet-600"
};

export function OperationsDashboardPage() {
    const { session } = useAuth();

    const [dashboard, setDashboard] = useState(null);
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadDashboard() {
        setLoading(true);
        setError("");

        try {
            const [dashboardData, pendingData] = await Promise.all([
                api.getOperationsDashboard(session.token),
                api.getPendingReservations(session.token)
            ]);

            setDashboard(dashboardData);
            setPending(pendingData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDashboard();
    }, []);

    return (
        <section className="space-y-6">
            <PageHeader
                eyebrow="Operations"
                title="Operational Dashboard"
                description="Live reservation information from the Web API."
                icon={Gauge}
                actions={
                    <Button variant="outline" onClick={loadDashboard} disabled={loading}>
                        <RefreshCw size={16} />
                        Refresh
                    </Button>
                }
            />

            {error && <FeedbackAlert>{error}</FeedbackAlert>}

            {loading && <p className="text-sm text-slate-500">Loading dashboard...</p>}

            {!loading && dashboard && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DashboardCard
                            title="Pending Reservations"
                            value={dashboard.pendingReservations}
                            icon={Clock3}
                            tone="amber"
                        />
                        <DashboardCard
                            title="Approved Future"
                            value={dashboard.approvedFutureReservations}
                            icon={CalendarCheck}
                            tone="brand"
                        />
                        <DashboardCard
                            title="Current Bookings"
                            value={dashboard.currentBookings}
                            icon={CalendarCheck}
                            tone="violet"
                        />
                        <DashboardCard
                            title="Completed Today"
                            value={dashboard.completedToday}
                            icon={CheckCircle2}
                            tone="emerald"
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Pending reservations</CardTitle>
                        </CardHeader>

                        <CardContent>
                            {pending.length === 0 ? (
                                <p className="text-sm text-slate-500">There are no pending reservations.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[750px]">
                                        <TableHeader>
                                            <TableRow>
                                                    <TableHead>Reservation</TableHead>
                                                    <TableHead>Prosumer</TableHead>
                                                    <TableHead>Station</TableHead>
                                                    <TableHead>Start time</TableHead>
                                                    <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                                {/* only show the first 5 here */}
                                                {pending.slice(0, 5).map((reservation) => (
                                                    <TableRow key={reservation.id}>
                                                        <TableCell className="font-medium">{reservation.id}</TableCell>
                                                        <TableCell>{reservation.prosumerNic}</TableCell>
                                                        <TableCell>{reservation.nodeName || reservation.nodeId}</TableCell>
                                                        <TableCell>{new Date(reservation.startTime).toLocaleString()}</TableCell>
                                                        <TableCell>
                                                        <StatusBadge status={reservation.status} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </section>
    );
}

function DashboardCard({ title, value, icon: Icon, tone = "brand" }) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-sm text-slate-500">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                </div>

                <div className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br ${cardColors[tone]}`}>
                    <Icon size={22} />
                </div>
            </CardContent>
        </Card>
    );
}