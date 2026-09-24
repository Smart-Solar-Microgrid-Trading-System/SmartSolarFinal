import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BatteryCharging, CalendarDays, Check, Clock3, MapPin, RadioTower, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatUtcDate, formatUtcDateTime, formatUtcTimeRange, groupSlotsByUtcDate, slotEnd, slotId, slotStart } from "@/lib/reservation-utils";
import { cn } from "@/lib/utils";

const steps = ["Station", "Slot", "Energy", "Confirm"];

function ReservationStepper({ current }) {
  return <ol className="grid grid-cols-4 gap-2" aria-label="Reservation progress">{steps.map((step, index) => {
    const complete = index < current;
    const active = index === current;
    return <li key={step} className="relative text-center">
      <div className={cn("mx-auto grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition", complete || active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-400")}>{complete ? <Check size={15} /> : index + 1}</div>
      <p className={cn("mt-1 text-xs font-medium", active ? "text-brand-700" : "text-slate-500")}>{step}</p>
      {index < steps.length - 1 && <span className={cn("absolute left-[58%] right-[-42%] top-4 -z-10 h-0.5", complete ? "bg-brand-500" : "bg-slate-200")} />}
    </li>;
  })}</ol>;
}

export function ReservationManagementPage() {
  const { session } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [energyAmountKwh, setEnergyAmountKwh] = useState("20");
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const selectedSlot = slots.find((slot) => slotId(slot) === selectedSlotId);
  const groupedSlots = useMemo(() => groupSlotsByUtcDate(slots), [slots]);
  const energy = Number(energyAmountKwh);
  const formValid = Boolean(selectedNode && selectedSlot && Number.isFinite(energy) && energy > 0);
  const currentStep = success ? 3 : selectedSlot ? 2 : selectedNode ? 1 : 0;

  async function loadNodes() {
    setLoadingNodes(true);
    setError("");
    try { setNodes(await api.getNodes(session.token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoadingNodes(false); }
  }

  useEffect(() => { loadNodes(); }, []);

  async function chooseNode(nodeId) {
    setSelectedNodeId(nodeId);
    setSelectedSlotId("");
    setSlots([]);
    setError("");
    setLoadingSlots(true);
    try { setSlots(await api.getAvailableSlots(session.token, nodeId)); }
    catch (requestError) { setError(`${requestError.message} Available-slot data is provided by the booking-slot service.`); }
    finally { setLoadingSlots(false); }
  }

  async function createReservation() {
    if (!formValid) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await api.createReservation(session.token, {
        microgridNodeId: selectedNodeId,
        bookingSlotId: selectedSlotId,
        energyAmountKwh: energy
      });
      setSuccess(created);
      setReviewOpen(false);
    } catch (requestError) { setError(requestError.message); setReviewOpen(false); }
    finally { setSubmitting(false); }
  }

  function resetForm() {
    setSuccess(null);
    setSelectedNodeId("");
    setSelectedSlotId("");
    setSlots([]);
    setEnergyAmountKwh("20");
    setError("");
  }

  if (success) return <section className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-brand-600 to-cyan-600 px-6 py-12 text-center text-white sm:px-10">
      <div className="absolute -right-12 -top-12 size-48 rounded-full bg-white/10" /><div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-lime-300/10" />
      <div className="relative mx-auto grid size-20 place-items-center rounded-full bg-white text-brand-600 shadow-xl"><Check size={42} strokeWidth={3} /></div>
      <p className="relative mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Clean energy reserved</p>
      <h1 className="relative mt-2 text-3xl font-bold">Reservation Confirmed</h1>
      <p className="relative mt-2 text-emerald-50">Your reservation was created and is awaiting the normal processing flow.</p>
    </div>
    <div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <ReservationStepper current={3} />
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
        <SummaryItem icon={ShieldCheck} label="Reservation ID" value={success.id} />
        <SummaryItem icon={RadioTower} label="Station" value={selectedNode?.name ?? success.microgridNodeId} />
        <SummaryItem icon={CalendarDays} label="Scheduled time" value={formatUtcDateTime(success.scheduledStartUtc)} />
        <SummaryItem icon={BatteryCharging} label="Energy amount" value={`${success.energyAmountKwh} kWh`} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row"><Button asChild className="flex-1"><Link to={`/reservations/${success.id}`}>View details <ArrowRight size={17} /></Link></Button><Button variant="outline" className="flex-1" onClick={resetForm}>Create another reservation</Button></div>
    </div>
  </section>;

  return <section className="space-y-6">
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-emerald-950 to-brand-700 p-6 text-white shadow-lg sm:p-8">
      <div className="absolute right-6 top-4 opacity-15"><SunArtwork /></div>
      <div className="relative max-w-2xl"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-lime-300"><Sparkles size={15} /> Smart charging</p><h1 className="mt-2 text-3xl font-bold">Reserve Your Energy</h1><p className="mt-2 text-sm text-emerald-100">Choose a microgrid node, select an available time slot, and reserve the energy you need.</p></div>
    </div>

    <div className="mx-auto max-w-4xl"><ReservationStepper current={currentStep} /></div>
    {error && <FeedbackAlert>{error}</FeedbackAlert>}

    <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <Panel number="1" title="Select a microgrid station" icon={RadioTower}>
          {loadingNodes ? <LoadingText text="Loading active stations..." /> : nodes.length === 0 ? <EmptyText text="No active microgrid stations are available." /> : <div className="grid gap-3 sm:grid-cols-2">{nodes.map((node) => <button key={node.id} type="button" onClick={() => chooseNode(node.id)} className={cn("rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md", selectedNodeId === node.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-slate-200 bg-white")}>
            <span className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-lg bg-emerald-100 text-brand-700"><RadioTower size={20} /></span>{selectedNodeId === node.id && <span className="grid size-6 place-items-center rounded-full bg-brand-600 text-white"><Check size={14} /></span>}</span>
            <span className="mt-3 block font-semibold text-slate-900">{node.name}</span><span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} /> {Number(node.latitude).toFixed(3)}, {Number(node.longitude).toFixed(3)}</span><span className="mt-3 block text-xs font-medium text-brand-700">{node.capacityKw} kW capacity · {node.availableBatterySlots} battery slots</span>
          </button>)}</div>}
        </Panel>

        <Panel number="2" title="Select an available slot" icon={CalendarDays} muted={!selectedNode}>
          {!selectedNode ? <EmptyText text="Select a station to see its available slots." /> : loadingSlots ? <LoadingText text="Loading available slots..." /> : groupedSlots.size === 0 ? <EmptyText text="No available slots were returned for this station." /> : <div className="space-y-5">{Array.from(groupedSlots.entries()).map(([date, dateSlots]) => <div key={date}><p className="mb-2 text-sm font-semibold text-slate-700">{formatUtcDate(`${date}T00:00:00Z`)}</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{dateSlots.map((slot) => <button key={slotId(slot)} type="button" onClick={() => setSelectedSlotId(slotId(slot))} className={cn("flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition", selectedSlotId === slotId(slot) ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-300")}><span className={cn("grid size-6 shrink-0 place-items-center rounded-full border", selectedSlotId === slotId(slot) ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")} >{selectedSlotId === slotId(slot) && <Check size={13} />}</span><span><span className="block font-medium">{formatUtcTimeRange(slotStart(slot), slotEnd(slot))}</span></span></button>)}</div></div>)}</div>}
        </Panel>

        <Panel number="3" title="Energy amount" icon={BatteryCharging} muted={!selectedSlot}>
          <div className="max-w-sm"><Label htmlFor="energyAmount">Energy amount (kWh)</Label><div className="relative mt-2"><Input id="energyAmount" type="number" min="0.1" step="0.1" value={energyAmountKwh} onChange={(event) => setEnergyAmountKwh(event.target.value)} disabled={!selectedSlot} className="pr-14" /><span className="absolute right-3 top-2.5 text-sm text-slate-500">kWh</span></div><p className="mt-2 text-xs text-slate-500">Enter a positive energy amount. Final validation is performed by the reservation service.</p></div>
        </Panel>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-brand-100 bg-gradient-to-b from-white to-emerald-50 p-5 shadow-sm xl:sticky xl:top-24">
        <div className="flex items-center gap-2 text-brand-700"><Zap size={19} /><h2 className="font-bold">Reservation summary</h2></div>
        <SummaryRow label="Station" value={selectedNode?.name ?? "Not selected"} /><SummaryRow label="Time" value={selectedSlot ? formatUtcDateTime(slotStart(selectedSlot)) : "Not selected"} /><SummaryRow label="Energy" value={energy > 0 ? `${energy} kWh` : "Not entered"} />
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-800"><Clock3 size={15} className="mb-1" />Reservations can be created up to 7 days ahead. Changes and cancellations close 12 hours before the scheduled start.</div>
        <Button className="w-full" disabled={!formValid} onClick={() => setReviewOpen(true)}>Review reservation <ArrowRight size={16} /></Button>
      </aside>
    </div>

    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent><DialogHeader><DialogTitle>Confirm your reservation</DialogTitle><DialogDescription>Check these details before the reservation is created.</DialogDescription></DialogHeader><div className="space-y-3 rounded-xl bg-slate-50 p-4"><SummaryRow label="Station" value={selectedNode?.name} /><SummaryRow label="Time" value={formatUtcDateTime(slotStart(selectedSlot))} /><SummaryRow label="Energy" value={`${energy} kWh`} /><SummaryRow label="Initial status" value="Pending" /></div><DialogFooter><Button variant="outline" onClick={() => setReviewOpen(false)}>Go back</Button><Button onClick={createReservation} disabled={submitting}>{submitting ? "Creating..." : "Confirm reservation"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function Panel({ number, title, icon: Icon, muted = false, children }) { return <div className={cn("rounded-2xl border bg-white p-5 shadow-sm", muted ? "border-slate-100 opacity-70" : "border-slate-200")}><div className="mb-4 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{number}</span><Icon size={19} className="text-brand-600" /><h2 className="font-bold text-slate-900">{title}</h2></div>{children}</div>; }
function SummaryRow({ label, value }) { return <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 text-sm last:border-0 last:pb-0"><span className="text-slate-500">{label}</span><span className="max-w-[65%] break-words text-right font-medium text-slate-800">{value}</span></div>; }
function SummaryItem({ icon: Icon, label, value }) { return <div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700"><Icon size={18} /></span><div><p className="text-xs text-slate-500">{label}</p><p className="break-all text-sm font-semibold text-slate-800">{value}</p></div></div>; }
function LoadingText({ text }) { return <p className="animate-pulse text-sm text-slate-500">{text}</p>; }
function EmptyText({ text }) { return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{text}</p>; }
function SunArtwork() { return <div className="relative size-36"><div className="absolute left-11 top-3 size-14 rounded-full bg-amber-300 shadow-[0_0_40px_rgba(253,224,71,0.8)]" /><div className="absolute bottom-3 left-0 right-0 h-16 skew-y-[-8deg] rounded-lg border-4 border-cyan-200 bg-cyan-500/50" /></div>; }
