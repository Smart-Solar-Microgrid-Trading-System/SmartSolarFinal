import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BatteryCharging, CalendarDays, Check, Clock3, Pencil, RadioTower, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatUtcDate, formatUtcDateTime, formatUtcTimeRange, groupSlotsByUtcDate, hoursUntil, slotEnd, slotId, slotStart } from "@/lib/reservation-utils";
import { cn } from "@/lib/utils";

export function ReservationDetailsPage() {
  const { reservationId } = useParams();
  const { session } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [nodeId, setNodeId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [energyAmountKwh, setEnergyAmountKwh] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const groupedSlots = useMemo(() => groupSlotsByUtcDate(slots), [slots]);
  const selectedNode = nodes.find((node) => node.id === (editing ? nodeId : reservation?.microgridNodeId));
  const remainingHours = reservation ? hoursUntil(reservation.scheduledStartUtc) : Number.NaN;
  const terminalStatus = ["Cancelled", "Completed"].includes(reservation?.status);
  const changesClosed = Number.isFinite(remainingHours) && remainingHours < 12;
  const canChange = Boolean(reservation && !terminalStatus && !changesClosed);

  async function loadReservation() {
    setLoading(true);
    setError("");
    try {
      const [reservationData, nodesData] = await Promise.all([
        api.getReservation(session.token, reservationId),
        api.getNodes(session.token)
      ]);
      setReservation(reservationData);
      setNodes(nodesData);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadReservation(); }, [reservationId]);

  async function loadSlots(nextNodeId) {
    setLoadingSlots(true);
    setError("");
    try { setSlots(await api.getAvailableSlots(session.token, nextNodeId)); }
    catch (requestError) { setError(`${requestError.message} Available-slot data is provided by the booking-slot service.`); setSlots([]); }
    finally { setLoadingSlots(false); }
  }

  function startEditing() {
    setNodeId(reservation.microgridNodeId);
    setSelectedSlotId(reservation.bookingSlotId);
    setEnergyAmountKwh(String(reservation.energyAmountKwh));
    setNotice("");
    setEditing(true);
    loadSlots(reservation.microgridNodeId);
  }

  async function chooseNode(nextNodeId) {
    setNodeId(nextNodeId);
    setSelectedSlotId("");
    await loadSlots(nextNodeId);
  }

  async function saveChanges() {
    const energy = Number(energyAmountKwh);
    if (!nodeId || !selectedSlotId || !Number.isFinite(energy) || energy <= 0) {
      setError("Select a station and slot, then enter a positive energy amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await api.updateReservation(session.token, reservationId, {
        microgridNodeId: nodeId,
        bookingSlotId: selectedSlotId,
        energyAmountKwh: energy
      });
      setReservation(updated);
      setEditing(false);
      setNotice("Reservation updated successfully.");
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function cancelReservation() {
    setSaving(true);
    setError("");
    try {
      const cancelled = await api.cancelReservation(session.token, reservationId);
      setReservation(cancelled);
      setCancelOpen(false);
      setNotice("Reservation cancelled successfully.");
    } catch (requestError) { setError(requestError.message); setCancelOpen(false); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading reservation...</p>;
  if (!reservation) return <section className="space-y-4">{error && <FeedbackAlert>{error}</FeedbackAlert>}<Button asChild variant="outline"><Link to="/reservations"><ArrowLeft size={16} /> Back to reservations</Link></Button></section>;

  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="ghost"><Link to="/reservations"><ArrowLeft size={17} /> Back to reservations</Link></Button><Button variant="outline" onClick={loadReservation} disabled={loading}><RefreshCw size={16} /> Refresh</Button></div>
    {error && <FeedbackAlert>{error}</FeedbackAlert>}{notice && <FeedbackAlert variant="success">{notice}</FeedbackAlert>}

    <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
      <div className="relative overflow-hidden border-b border-brand-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-6 sm:p-8">
        <div className="absolute -right-8 -top-12 size-48 rounded-full border-[28px] border-amber-200/40" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Reservation ID</p><div className="relative mt-2 flex flex-wrap items-center gap-3"><h1 className="break-all text-2xl font-bold text-slate-950 sm:text-3xl">{reservation.id}</h1><StatusBadge status={reservation.status} /></div><p className="relative mt-2 text-sm text-slate-500">Created {formatUtcDateTime(reservation.createdAtUtc)}</p>
      </div>

      {!editing ? <div className="p-6 sm:p-8">
        <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
          <Detail icon={RadioTower} label="Microgrid station" value={selectedNode?.name ?? reservation.microgridNodeId} subvalue={reservation.microgridNodeId} />
          <Detail icon={CalendarDays} label="Scheduled start" value={formatUtcDateTime(reservation.scheduledStartUtc)} subvalue={`Booking slot: ${reservation.bookingSlotId}`} />
          <Detail icon={BatteryCharging} label="Energy amount" value={`${reservation.energyAmountKwh} kWh`} />
          <Detail icon={Clock3} label="Last updated" value={formatUtcDateTime(reservation.updatedAtUtc)} />
        </div>
        {changesClosed && !terminalStatus && <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Changes are closed.</strong> Fewer than 12 hours remain before the scheduled start.</div>}
        {reservation.status === "Cancelled" && <div className="mt-7 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">Cancelled {formatUtcDateTime(reservation.cancelledAtUtc)}</div>}
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row"><Button onClick={startEditing} disabled={!canChange}><Pencil size={17} /> Modify reservation</Button><Button variant="destructive" onClick={() => setCancelOpen(true)} disabled={!canChange}><Trash2 size={17} /> Cancel reservation</Button></div>
      </div> : <EditReservation nodes={nodes} nodeId={nodeId} chooseNode={chooseNode} currentReservation={reservation} slots={slots} groupedSlots={groupedSlots} loadingSlots={loadingSlots} selectedSlotId={selectedSlotId} setSelectedSlotId={setSelectedSlotId} energyAmountKwh={energyAmountKwh} setEnergyAmountKwh={setEnergyAmountKwh} saveChanges={saveChanges} saving={saving} discard={() => { setEditing(false); setError(""); }} />}
    </div>

    <Dialog open={cancelOpen} onOpenChange={setCancelOpen}><DialogContent><DialogHeader><DialogTitle>Cancel this reservation?</DialogTitle><DialogDescription>This releases the booking slot. A cancelled reservation cannot be modified afterward.</DialogDescription></DialogHeader><div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">{formatUtcDateTime(reservation.scheduledStartUtc)}</p><p>{reservation.energyAmountKwh} kWh at {selectedNode?.name ?? reservation.microgridNodeId}</p></div><DialogFooter><Button variant="outline" onClick={() => setCancelOpen(false)}>Keep reservation</Button><Button variant="destructive" onClick={cancelReservation} disabled={saving}>{saving ? "Cancelling..." : "Yes, cancel reservation"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function EditReservation({ nodes, nodeId, chooseNode, currentReservation, slots, groupedSlots, loadingSlots, selectedSlotId, setSelectedSlotId, energyAmountKwh, setEnergyAmountKwh, saveChanges, saving, discard }) {
  const currentSlotIsSelected = selectedSlotId === currentReservation.bookingSlotId && nodeId === currentReservation.microgridNodeId;
  const currentSlotCanBeSelected = nodeId === currentReservation.microgridNodeId;
  return <div className="space-y-7 p-6 sm:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Modify reservation</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Choose new reservation details</h2><p className="mt-1 text-sm text-slate-500">Changes are permitted until 12 hours before the scheduled start.</p></div>
    <div><Label>Microgrid station</Label><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{nodes.map((node) => <button key={node.id} type="button" onClick={() => chooseNode(node.id)} className={cn("rounded-lg border p-3 text-left text-sm transition", nodeId === node.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300")}><span className="font-semibold">{node.name}</span><span className="mt-1 block text-xs text-slate-500">{node.capacityKw} kW</span></button>)}</div></div>
    <div><Label>Booking slot</Label>{currentSlotCanBeSelected && <button type="button" onClick={() => setSelectedSlotId(currentReservation.bookingSlotId)} className={cn("mt-2 flex w-full max-w-md items-center gap-2 rounded-lg border p-3 text-left text-sm transition", currentSlotIsSelected ? "border-brand-500 bg-brand-50 text-brand-900 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300")}><span className={cn("grid size-6 place-items-center rounded-full border", currentSlotIsSelected ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>{currentSlotIsSelected && <Check size={13} />}</span><span><strong>Current slot</strong><span className="block text-xs">{formatUtcDateTime(currentReservation.scheduledStartUtc)}</span></span></button>}{loadingSlots ? <p className="mt-3 animate-pulse text-sm text-slate-500">Loading available slots...</p> : <div className="mt-3 space-y-4">{Array.from(groupedSlots.entries()).map(([date, dateSlots]) => <div key={date}><p className="mb-2 text-sm font-semibold text-slate-700">{formatUtcDate(`${date}T00:00:00Z`)}</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{dateSlots.map((slot) => <button key={slotId(slot)} type="button" onClick={() => setSelectedSlotId(slotId(slot))} className={cn("rounded-lg border p-3 text-left text-sm transition", selectedSlotId === slotId(slot) ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300")}><span className="font-medium">{formatUtcTimeRange(slotStart(slot), slotEnd(slot))}</span></button>)}</div></div>)}{slots.length === 0 && !currentSlotCanBeSelected && <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">No available slots were returned for this station.</p>}</div>}</div>
    <div className="max-w-sm"><Label htmlFor="editEnergy">Energy amount (kWh)</Label><div className="relative mt-2"><Input id="editEnergy" type="number" min="0.1" step="0.1" value={energyAmountKwh} onChange={(event) => setEnergyAmountKwh(event.target.value)} className="pr-14" /><span className="absolute right-3 top-2.5 text-sm text-slate-500">kWh</span></div></div>
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row"><Button onClick={saveChanges} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button><Button variant="outline" onClick={discard} disabled={saving}>Discard</Button></div>
  </div>;
}

function Detail({ icon: Icon, label, value, subvalue }) { return <div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon size={21} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-900">{value}</p>{subvalue && <p className="mt-1 break-all text-xs text-slate-500">{subvalue}</p>}</div></div>; }
function StatusBadge({ status }) { const style = status === "Cancelled" ? "bg-red-100 text-red-700" : status === "Completed" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"; return <Badge className={style}><ShieldCheck size={13} /> {status}</Badge>; }
