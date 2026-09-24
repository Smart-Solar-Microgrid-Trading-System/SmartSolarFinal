import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Badge } from "@/components/ui/badge";
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

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                        Operations
                    </p>

                    <h1 className="text-2xl font-bold text-slate-900">
                        Energy Reservations
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        View current, pending and previous bookings.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => loadReservations()}
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