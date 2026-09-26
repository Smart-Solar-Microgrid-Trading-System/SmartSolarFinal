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

function formatDate(value) {
    return new Date(value).toLocaleString();
}

// datetime-local input needs "yyyy-MM-ddTHH:mm" in local time
function formatForInput(value) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
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

            <Card>
                <CardHeader>
                    <CardTitle>Booking slots</CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading booking slots...</p>
                    ) : slots.length === 0 ? (
                            <p className="text-sm text-slate-500">No booking slots are available.</p>
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
                                        <TableRow key={slot.id}>
                                            <TableCell className="font-medium">{getNodeName(slot.nodeId)}</TableCell>
                                            <TableCell>{formatDate(slot.startTime)}</TableCell>
                                            <TableCell>{formatDate(slot.endTime)}</TableCell>
                                            <TableCell>{slot.capacityKw} kW</TableCell>
                                            <TableCell>
                                                <StatusBadge status={slot.status} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => openEdit(slot)}>
                                                        <Pencil size={15} />
                                                        Edit
                                                    </Button>

                                                    <Button size="sm" variant="outline" onClick={() => removeSlot(slot.id)}>
                                                        <Trash2 size={15} />
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Update booking slot" : "Create booking slot"}</DialogTitle>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {/* node can only be picked when creating */}
                        {!editingId && (
                            <div className="space-y-2">
                                <Label>Microgrid node</Label>
                                <Select value={form.nodeId} onValueChange={(value) => setForm({ ...form, nodeId: value })}>
                                    <SelectTrigger>
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
                            </div>

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

                        <div className="space-y-2">
                            <Label htmlFor="capacityKw">Capacity (kW)</Label>
                            <Input
                                id="capacityKw"
                                name="capacityKw"
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={form.capacityKw}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* status can only be changed when editing */}
                        {editingId && (
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                                    <SelectTrigger>
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

                        <DialogFooter className="border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
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