import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, RefreshCw, Search, Trash2, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CancelReservationDialog } from "@/components/reservations/cancel-reservation-dialog";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
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

const emptyFilters = {
    search: "",
    status: "",
    nodeId: "",
    from: "",
    to: ""
};

export function ReservationsPage() {
    const { session } = useAuth();

    const [reservations, setReservations] = useState([]);
    const [nodes, setNodes] = useState([]);

    const [filters, setFilters] = useState(emptyFilters);
    const [view, setView] = useState("current");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelling, setCancelling] = useState(false);

    async function loadNodes() {
        try {
            const data = await api.getNodes(session.token);
            setNodes(data);
        } catch {
            setNodes([]);
        }
    }

    async function loadReservations(selectedView = view) {
        setLoading(true);
        setError("");

        try {
            let data;

            if (selectedView === "pending") {
                data = await api.getPendingReservations(
                    session.token
                );
            } else if (selectedView === "history") {
                data = await api.getReservationHistory(
                    session.token
                );
            } else if (selectedView === "all") {
                data = await api.getReservations(
                    session.token,
                    filters
                );
            } else {
                data = await api.getCurrentReservations(
                    session.token
                );
            }

            setReservations(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNodes();
        loadReservations("current");
    }, []);

    function changeView(nextView) {
        setView(nextView);
        loadReservations(nextView);
    }

    function changeFilter(event) {
        setFilters({
            ...filters,
            [event.target.name]: event.target.value
        });
    }

    function clearFilters() {
        setFilters(emptyFilters);
        setView("current");
        loadReservations("current");
    }

    async function search(event) {
        event.preventDefault();

        setView("all");

        setLoading(true);
        setError("");

        try {
            const data = await api.getReservations(
                session.token,
                filters
            );

            setReservations(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function cancelReservation() {
        setCancelling(true);
        setError("");
        try {
            await api.cancelReservation(session.token, cancelTarget.id);
            setCancelTarget(null);
            await loadReservations(view);
        } catch (err) {
            setError(err.message);
            setCancelTarget(null);
        } finally {
            setCancelling(false);
        }
    }

    return (
        <section className="space-y-6">
            <PageHeader
                eyebrow="Operations"
                title="Energy Reservations"
                description="View current, pending and previous bookings."
                icon={Zap}
                actions={(
                    <>
                        <Button variant="outline" onClick={() => loadReservations()} disabled={loading}><RefreshCw size={16} />Refresh</Button>
                        <Button asChild><Link to="/reservations/new"><Plus size={16} />Create reservation</Link></Button>
                    </>
                )}
            />

            {error && (
                <FeedbackAlert>
                    {error}
                </FeedbackAlert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>
                        Search bookings
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <form
                        className="grid gap-3 md:grid-cols-5"
                        onSubmit={search}
                    >
                        <Input
                            name="search"
                            placeholder="ID, NIC, node or slot"
                            value={filters.search}
                            onChange={changeFilter}
                        />

                        <Select
                            value={filters.status || "all"}
                            onValueChange={(value) =>
                                setFilters({
                                    ...filters,
                                    status: value === "all" ? "" : value
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All statuses
                                </SelectItem>

                                <SelectItem value="Pending">
                                    Pending
                                </SelectItem>

                                <SelectItem value="Approved">
                                    Approved
                                </SelectItem>

                                <SelectItem value="Completed">
                                    Completed
                                </SelectItem>

                                <SelectItem value="Cancelled">
                                    Cancelled
                                </SelectItem>

                                <SelectItem value="Rejected">
                                    Rejected
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.nodeId || "all"}
                            onValueChange={(value) =>
                                setFilters({
                                    ...filters,
                                    nodeId: value === "all" ? "" : value
                                })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Station" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All stations
                                </SelectItem>

                                {nodes.map((node) => (
                                    <SelectItem
                                        key={node.id}
                                        value={node.id}
                                    >
                                        {node.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            name="from"
                            type="date"
                            value={filters.from}
                            onChange={changeFilter}
                        />

                        <Input
                            name="to"
                            type="date"
                            value={filters.to}
                            onChange={changeFilter}
                        />

                        <div className="flex gap-2 md:col-span-5">
                            <Button type="submit">
                                <Search size={16} />
                                Search
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearFilters}
                            >
                                Clear
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={view === "current" ? "default" : "outline"}
                    onClick={() => changeView("current")}
                >
                    Current
                </Button>

                <Button
                    variant={view === "pending" ? "default" : "outline"}
                    onClick={() => changeView("pending")}
                >
                    Pending
                </Button>

                <Button
                    variant={view === "history" ? "default" : "outline"}
                    onClick={() => changeView("history")}
                >
                    History
                </Button>

                {view === "all" && (
                    <Button variant="default">
                        Search results
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {getTitle(view)}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500">
                            Loading reservations...
                        </p>
                    ) : reservations.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No reservations found.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[900px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reservation</TableHead>
                                        <TableHead>Prosumer NIC</TableHead>
                                        <TableHead>Station</TableHead>
                                        <TableHead>Start</TableHead>
                                        <TableHead>End</TableHead>
                                        <TableHead>Energy</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {reservations.map((reservation) => (
                                        <TableRow key={reservation.id}>
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
                                                {formatDate(
                                                    reservation.startTime
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {formatDate(
                                                    reservation.endTime
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {reservation.energyAmountKw} kW
                                            </TableCell>

                                            <TableCell>
                                                <StatusBadge status={reservation.status} />
                                            </TableCell>

                                            <TableCell><div className="flex gap-1"><Button asChild size="icon" variant="ghost" title="View"><Link to={`/reservations/${reservation.id}`}><Eye size={16} /></Link></Button><Button asChild size="icon" variant="ghost" disabled={["Cancelled", "Completed"].includes(reservation.status)} title="Edit"><Link to={`/reservations/${reservation.id}/edit`}><Pencil size={16} /></Link></Button><Button size="icon" variant="ghost" className="text-red-600" disabled={["Cancelled", "Completed"].includes(reservation.status)} title="Cancel" onClick={() => setCancelTarget(reservation)}><Trash2 size={16} /></Button></div></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <CancelReservationDialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)} reservation={cancelTarget} busy={cancelling} onConfirm={cancelReservation} />
        </section>
    );
}

function getTitle(view) {
    if (view === "pending") {
        return "Pending reservations";
    }

    if (view === "history") {
        return "Booking history";
    }

    if (view === "all") {
        return "Search results";
    }

    return "Current bookings";
}

function formatDate(value) {
    return new Date(value).toLocaleString();
}