import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { FeedbackAlert } from "@/components/feedback-alert";
import { ReservationRulesNotice } from "@/components/reservations/reservation-rules-notice";
import { formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function EditReservationPage() {
  const { reservationId } = useParams(); const { session } = useAuth(); const navigate = useNavigate();
  const [reservation, setReservation] = useState(null); const [slots, setSlots] = useState([]); const [slotId, setSlotId] = useState(""); const [energy, setEnergy] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { api.getReservationById(session.token, reservationId).then(async r => { setReservation(r); setSlotId(r.slotId); setEnergy(String(r.energyAmountKw)); const all = await api.getBookingSlotsByNode(session.token, r.nodeId); setSlots(all.filter(s => s.id === r.slotId || (s.isActive && s.status === "Available"))); }).catch(e => setError(e.message)); }, [reservationId, session.token]);
  const slot = useMemo(() => slots.find(s => s.id === slotId), [slots, slotId]);
  async function save() { setSaving(true); setError(""); try { await api.updateReservation(session.token, reservationId, { slotId, energyAmountKw: Number(energy) }); navigate(`/reservations/${reservationId}/summary`, { state: { operation: "updated" } }); } catch (e) { setError(e.message); } finally { setSaving(false); } }
  return <section className="space-y-5"><div><p className="text-sm font-semibold text-brand-600">Reservations / {reservationId} / Edit</p><h1 className="text-2xl font-bold">Edit reservation</h1><p className="text-sm text-slate-500">Update the booking slot or energy amount.</p></div>{error && <FeedbackAlert>{error}</FeedbackAlert>}{reservation && <><Card><CardHeader><CardTitle>Prosumer and reservation</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><ReadOnly label="Prosumer" value={`${reservation.prosumerName || "Prosumer"} (${reservation.prosumerNic})`} /><ReadOnly label="Reservation ID" value={reservation.id} /><ReadOnly label="Station" value={reservation.nodeName || reservation.nodeId} /><ReadOnly label="Current status" value={reservation.status} /></CardContent></Card><Card><CardHeader><CardTitle>Editable information</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Available booking slot</Label><Select value={slotId} onValueChange={setSlotId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{slots.map(s => <SelectItem key={s.id} value={s.id}>{formatUtc(s.startTime)} – {formatUtc(s.endTime)} {s.id === reservation.slotId ? "(current)" : ""}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Energy amount (kWh)</Label><Input type="number" min="0.01" step="0.01" max={slot?.capacityKw} value={energy} onChange={e => setEnergy(e.target.value)} /></div><ReservationRulesNotice edit /></CardContent></Card><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => navigate(`/reservations/${reservationId}`)}>Discard changes</Button><Button onClick={save} disabled={saving || !slotId || Number(energy) <= 0}><Save size={16} />{saving ? "Saving..." : "Save changes"}</Button></div></>}</section>;
}
function ReadOnly({ label, value }) { return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>; }
