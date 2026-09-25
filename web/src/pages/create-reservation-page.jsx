import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ClipboardCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { ReservationRulesNotice } from "@/components/reservations/reservation-rules-notice";
import { ReservationSummary, formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function CreateReservationPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [prosumers, setProsumers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);

  const [prosumerNic, setProsumerNic] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [energyAmountKw, setEnergy] = useState("");

  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // load active prosumers and nodes for the dropdowns
  useEffect(() => {
    Promise.all([api.getProsumers(session.token, "Active"), api.getNodes(session.token)])
      .then(([prosumerData, nodeData]) => {
        setProsumers(prosumerData);
        setNodes(nodeData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session.token]);

  // when the node changes, load its slots again.
  // only available slots starting within the next 7 days are shown
  useEffect(() => {
    setSlotId("");
    setSlots([]);

    if (!nodeId) return;

    api
      .getBookingSlotsByNode(session.token, nodeId)
      .then((data) => {
        const now = Date.now();
        const maxDate = now + 7 * ONE_DAY_MS;

        const availableSlots = data.filter((slot) => {
          const start = new Date(slot.startTime).getTime();
          return slot.isActive && slot.status === "Available" && start > now && start <= maxDate;
        });

        setSlots(availableSlots);
      })
      .catch((err) => setError(err.message));
  }, [nodeId, session.token]);

  const prosumer = useMemo(() => prosumers.find((p) => p.id === prosumerNic), [prosumers, prosumerNic]);
  const node = useMemo(() => nodes.find((n) => n.id === nodeId), [nodes, nodeId]);
  const slot = useMemo(() => slots.find((s) => s.id === slotId), [slots, slotId]);

  const energy = Number(energyAmountKw);
  const isValid = prosumer && node && slot && energy > 0 && energy <= Number(slot.capacityKw);

  // any change after pressing review takes the user back to edit mode
  function handleProsumerChange(value) {
    setProsumerNic(value);
    setReviewing(false);
  }

  function handleNodeChange(value) {
    setNodeId(value);
    setReviewing(false);
  }

  function handleSlotChange(value) {
    setSlotId(value);
    setReviewing(false);
  }

  function handleEnergyChange(event) {
    setEnergy(event.target.value);
    setReviewing(false);
  }

  async function createReservation() {
    setSaving(true);
    setError("");

    try {
      const result = await api.createReservation(session.token, {
        prosumerNic,
        nodeId,
        slotId,
        energyAmountKw: Number(energyAmountKw)
      });

      navigate(`/reservations/${result.id}/summary`, { state: { operation: "created" } });
    } catch (err) {
      setError(err.message);
      setReviewing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (reviewing) {
      setReviewing(false);
    } else {
      navigate("/reservations");
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand-600">Reservations / Create</p>
        <h1 className="text-2xl font-bold text-slate-900">Create reservation</h1>
        <p className="text-sm text-slate-500">Create an energy booking for an existing active Prosumer.</p>
      </div>

      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{reviewing ? "Review reservation" : "Reservation information"}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {loading ? (
              <p>Loading active Prosumers and stations...</p>
            ) : (
              <>
                <Field label="Prosumer (NIC or name)">
                  <Select value={prosumerNic} onValueChange={handleProsumerChange} disabled={reviewing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an active Prosumer" />
                    </SelectTrigger>
                    <SelectContent>
                      {prosumers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fullName} — {p.id} ({p.accountStatus})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Microgrid node">
                  <Select value={nodeId} onValueChange={handleNodeChange} disabled={reviewing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name} — {n.capacityKw} kW
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Available booking slot">
                  <Select value={slotId} onValueChange={handleSlotChange} disabled={!nodeId || reviewing}>
                    <SelectTrigger>
                      <SelectValue placeholder={nodeId ? "Select an available slot" : "Select a station first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {formatUtc(s.startTime)} – {formatUtc(s.endTime)} ({s.capacityKw} kW)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {nodeId && slots.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">No available slots within the next seven days.</p>
                  )}
                </Field>

                <Field label="Energy amount (kWh)">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={slot?.capacityKw}
                    value={energyAmountKw}
                    onChange={handleEnergyChange}
                    disabled={reviewing}
                  />
                </Field>

                <ReservationRulesNotice />
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ReservationSummary prosumer={prosumer} node={node} slot={slot} energyAmount={energyAmountKw} />

          {reviewing && (
            <FeedbackAlert variant="success">
              Review the information, then create the reservation. Its initial status will be Pending.
            </FeedbackAlert>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft size={16} />
          {reviewing ? "Back to edit" : "Cancel"}
        </Button>

        {reviewing ? (
          <Button onClick={createReservation} disabled={saving}>
            <Check size={16} />
            {saving ? "Creating..." : "Create reservation"}
          </Button>
        ) : (
          <Button onClick={() => setReviewing(true)} disabled={!isValid}>
            <ClipboardCheck size={16} />
            Review reservation
          </Button>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}