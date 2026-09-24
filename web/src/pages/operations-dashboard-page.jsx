import { useEffect, useState } from "react";
import {
    CalendarCheck,
    CheckCircle2,
    Clock3,
    RefreshCw
} from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
            const [dashboardData, pendingData] =
                await Promise.all([
                    api.getOperationsDashboard(
                        session.token
                    ),

                    api.getPendingReservations(
                        session.token
                    )
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
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                        Operations
                    </p>

                    <h1 className="text-2xl font-bold text-slate-900">
                        Operational Dashboard
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Live reservation information from the Web API.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={loadDashboard}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </Button>
            </div>

            {error && (
                <FeedbackAlert>
                    {error}
                </FeedbackAlert>
            )}

            {loading ? (
                <p className="text-sm text-slate-500">
                    Loading dashboard...
                </p>
            ) : dashboard ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DashboardCard
                            title="Pending Reservations"
                            value={dashboard.pendingReservations}
                            icon={Clock3}
                        />

                        <DashboardCard
                            title="Approved Future"
                            value={dashboard.approvedFutureReservations}
                            icon={CalendarCheck}
                        />

                        <DashboardCard
                            title="Current Bookings"
                            value={dashboard.currentBookings}
                            icon={CalendarCheck}
                        />

                        <DashboardCard
                            title="Completed Today"
                            value={dashboard.completedToday}
                            icon={CheckCircle2}
                        />
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                Pending reservations
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            {pending.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    There are no pending reservations.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[750px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Reservation
                                                </TableHead>

                                                <TableHead>
                                                    Prosumer
                                                </TableHead>

                                                <TableHead>
                                                    Station
                                                </TableHead>

                                                <TableHead>
                                                    Start time
                                                </TableHead>

                                                <TableHead>
                                                    Status
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {pending
                                                .slice(0, 5)
                                                .map((reservation) => (
                                                    <TableRow
                                                        key={reservation.id}
                                                    >
                                                        <TableCell className="font-medium">
                                                            {reservation.id}
                                                        </TableCell>

                                                        <TableCell>
                                                            {reservation.prosumerNic}
                                                        </TableCell>

                                                        <TableCell>
                                                            {reservation.nodeName ||
                                                                reservation.nodeId}
                                                        </TableCell>

                                                        <TableCell>
                                                            {new Date(
                                                                reservation.startTime
                                                            ).toLocaleString()}
                                                        </TableCell>

                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {reservation.status}
                                                            </Badge>
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
            ) : null}
        </section>
    );
}

function DashboardCard({
    title,
    value,
    icon: Icon
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-5">
                <div>
                    <p className="text-sm text-slate-500">
                        {title}
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        {value}
                    </p>
                </div>

                <div className="grid size-11 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon size={22} />
                </div>
            </CardContent>
        </Card>
    );
}