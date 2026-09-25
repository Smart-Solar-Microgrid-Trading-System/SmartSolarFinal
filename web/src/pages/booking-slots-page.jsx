import { useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Pencil, RefreshCw, Trash2 } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const emptyForm = {
    nodeId: "",
    startTime: "",
    endTime: "",
    capacityKw: "",
    status: "Available"
};

function formatDay(value) {
    return new Date(value).toLocaleDateString([], {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatTime(value) {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start, end) {
    const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
    if (minutes <= 0) return "";

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours === 0) return `${rest} min`;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// datetime-local input needs "yyyy-MM-ddTHH:mm" in local time
function formatForInput(value) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
}

function isSameDay(start, end) {
    return new Date(start).toDateString() === new Date(end).toDateString();
}

// shows how long the slot is while the user picks the times
function DurationHint({ start, end }) {
    if (!start || !end) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate) {
        return <p className="text-xs text-rose-600">End time should be after the start time.</p>;
    }

    return (
        <p className="text-xs text-slate-500">
            Duration: <span className="font-medium text-slate-700">{formatDuration(startDate, endDate)}</span>
        </p>
    );
}

export function BookingSlotsPage() {
    const { session } = useAuth();

    const [slots, setSlots] = useState([]);
    const [nodes, setNodes] = useState([]);

    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null); // null means we are creating a new slot
    const [dialogOpen, setDialogOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function loadData() {
        setLoading(true);
        setError("");

        try {
            const [slotData, nodeData] = await Promise.all([
                api.getBookingSlots(session.token),
                api.getNodes(session.token)
            ]);

            setSlots(slotData);
            setNodes(nodeData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setDialogOpen(true);
        setError("");
    }

    function openEdit(slot) {
        setEditingId(slot.id);
        setForm({
            nodeId: slot.nodeId,
            startTime: formatForInput(slot.startTime),
            endTime: formatForInput(slot.endTime),
            capacityKw: slot.capacityKw,
            status: slot.status
        });
        setDialogOpen(true);
        setError("");
    }

    function handleChange(event) {
        setForm({ ...form, [event.target.name]: event.target.value });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const startTime = new Date(form.startTime).toISOString();
            const endTime = new Date(form.endTime).toISOString();
            const capacityKw = Number(form.capacityKw);

            if (editingId) {
                await api.updateBookingSlot(session.token, editingId, {
                    startTime,
                    endTime,
                    capacityKw,
                    status: form.status
                });
                setMessage("Booking slot updated successfully.");
            } else {
                await api.createBookingSlot(session.token, {
                    nodeId: form.nodeId,
                    startTime,
                    endTime,
                    capacityKw
                });
                setMessage("Booking slot created successfully.");
            }

            setDialogOpen(false);
            setForm(emptyForm);
            setEditingId(null);

            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function removeSlot(id) {
        if (!window.confirm("Are you sure you want to remove this booking slot?")) {
            return;
        }

        setError("");
        setMessage("");

        try {
            await api.deleteBookingSlot(session.token, id);
            setMessage("Booking slot removed successfully.");
            await loadData();
        } catch (err) {
            setError(err.message);
        }
    }

    function getNodeName(nodeId) {
        const node = nodes.find((item) => item.id === nodeId);
        return node ? node.name : nodeId;
    }

    return (
        <section className="space-y-6">
            <PageHeader
                eyebrow="Operations"
                title="Booking Slots"
                description="Create and manage available energy booking slots."
                icon={CalendarClock}
                actions={
                    <>
                        <Button variant="outline" onClick={loadData} disabled={loading}>
                            <RefreshCw size={16} />
                            Refresh
                        </Button>

                        <Button onClick={openCreate}>
                            <CalendarPlus size={17} />
                            Create slot
                        </Button>
                    </>
                }
            />

            {error && <FeedbackAlert>{error}</FeedbackAlert>}
            {message && <FeedbackAlert variant="success">{message}</FeedbackAlert>}

            <Card className="overflow-hidden border-brand-100">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle>Booking slots</CardTitle>
                    {!loading && slots.length > 0 && (
                        <span className="text-sm text-slate-500">
                            {slots.length} {slots.length === 1 ? "slot" : "slots"}
                        </span>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <p className="px-6 pb-6 text-sm text-slate-500">Loading booking slots...</p>
                    ) : slots.length === 0 ? (
                            <p className="px-6 pb-6 text-sm text-slate-500">No booking slots are available.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[850px]">
                                <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="pl-6">Station</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead className="pr-10 text-right">Capacity</TableHead>
                                        <TableHead>Status</TableHead>
                                                <TableHead className="pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {slots.map((slot) => (
                                        <TableRow key={slot.id} className="border-slate-100">
                                            <TableCell className="py-3.5 pl-6 font-medium text-slate-900">
                                                {getNodeName(slot.nodeId)}
                                            </TableCell>

                                            <TableCell className="py-3.5 text-slate-700">{formatDay(slot.startTime)}</TableCell>

                                            <TableCell className="py-3.5">
                                                <p className="text-slate-800 tabular-nums">
                                                    {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                                                    {!isSameDay(slot.startTime, slot.endTime) && (
                                                        <span className="ml-1 text-xs text-slate-500">(next day)</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-slate-500">{formatDuration(slot.startTime, slot.endTime)}</p>
                                            </TableCell>

                                            <TableCell className="py-3.5 pr-10 text-right font-medium text-slate-900 tabular-nums">
                                                {slot.capacityKw} kW
                                            </TableCell>

                                            <TableCell className="py-3.5">
                                                <StatusBadge status={slot.status} />
                                            </TableCell>

                                            <TableCell className="py-3.5 pr-6">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="border-slate-200" onClick={() => openEdit(slot)}>
                                                        <Pencil size={14} />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-slate-200 text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                                        onClick={() => removeSlot(slot.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                        Remove
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="gap-0 overflow-hidden border-brand-100 bg-white p-0 sm:max-w-xl">
                    <DialogHeader className="border-b border-slate-100 px-6 pt-6 pb-4">
                        <DialogTitle>{editingId ? "Update booking slot" : "Create booking slot"}</DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? "Change the time window, capacity or status of this slot."
                                : "Choose a node, then set the time window and capacity for the new slot."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-5 px-6 py-5">
                            {/* page level errors are hidden behind the dialog, so show them here too */}
                            {error && <FeedbackAlert>{error}</FeedbackAlert>}

                            <div className="space-y-2">
                                <Label>Microgrid node</Label>

                                {editingId ? (
                                    // node can't be changed after the slot is created
                                    <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                                        <span className="font-medium text-slate-800">{getNodeName(form.nodeId)}</span>
                                        <span className="text-xs text-slate-400">Cannot be changed</span>
                                    </div>
                                ) : (
                                        <Select value={form.nodeId} onValueChange={(value) => setForm({ ...form, nodeId: value })}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a node" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {nodes.map((node) => (
                                                    <SelectItem key={node.id} value={node.id}>
                                                        {node.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="startTime">Start time</Label>
                                        <Input
                                            id="startTime"
                                            name="startTime"
                                            type="datetime-local"
                                            value={form.startTime}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="endTime">End time</Label>
                                        <Input
                                            id="endTime"
                                            name="endTime"
                                            type="datetime-local"
                                            value={form.endTime}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <DurationHint start={form.startTime} end={form.endTime} />
                            </div>

                            <div className={editingId ? "grid gap-4 sm:grid-cols-2" : ""}>
                                <div className="space-y-2">
                                    <Label htmlFor="capacityKw">Capacity</Label>
                                    <div className="relative">
                                        <Input
                                            id="capacityKw"
                                            name="capacityKw"
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={form.capacityKw}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="pr-10"
                                            required
                                        />
                                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                                            kW
                                        </span>
                                    </div>
                                </div>

                                {/* status can only be changed when editing */}
                                {editingId && (
                                    <div className="space-y-2">
                                        <Label>Status</Label>
                                        <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Available">Available</SelectItem>
                                                <SelectItem value="Reserved">Reserved</SelectItem>
                                                <SelectItem value="Unavailable">Unavailable</SelectItem>
                                                <SelectItem value="Completed">Completed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className="border-slate-200">
                                    Cancel
                                </Button>
                            </DialogClose>

                            <Button type="submit" disabled={saving}>
                                {saving ? "Saving..." : editingId ? "Update slot" : "Create slot"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </section>
    );
}